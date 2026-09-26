/* Wiring: read the clock, describe the moon, put it on screen, and keep the
 * whole thing current.
 */

import { describe } from "./phase.js";
import { drawMoon, initMoon } from "./moon-svg.js";
import { layout, seedLights, startLights, setMoonlight, startMeteors, reseedCity } from "./scene.js";
import { skyPosition } from "./astro.js";
import { initInstall } from "./install.js";

const el = (id) => document.getElementById(id);

/* ===================== hemisphere ======================================= */

/* The phase is the same everywhere; only the disc's orientation depends on
 * where you stand -- and on where the moon is in the sky at that moment, which
 * a hemisphere cannot express. Given a real location we compute the bright
 * limb angle instead. The sign of the latitude is the fallback for when there
 * is no location to compute from, and the button still overrides that.
 */
const STORE = "moon.south";
const STORE_POS = "moon.pos";
const STORE_GEO = "moon.geo";   // "off" once asking has failed once

function readStore(k){
  try { return localStorage.getItem(k); } catch { return null; }
}
function writeStore(k, v){
  try { localStorage.setItem(k, v); } catch { /* private mode */ }
}

const stored = readStore(STORE);
let south = stored !== null ? stored === "1" : false;

/* Where the moon actually is in the sky needs a full position, not just the
 * sign of a latitude. Without one the scene simply stays centred. */
let place = null;
try {
  const raw = readStore(STORE_POS);
  if (raw){
    const [lat, lon] = JSON.parse(raw);
    if (Number.isFinite(lat) && Number.isFinite(lon)) place = { lat, lon };
  }
} catch { /* ignore a malformed entry */ }

/* ===================== formatting ======================================= */

function fmtDate(d){
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/* Within a day, give the actual clock time -- a rounded countdown hides
 * precision the calculation already has. Beyond that, days are enough.
 */
function inDays(ms, now){
  const d = (ms - now) / 86400000;
  if (d < 1){
    const t = new Date(ms);
    const when = t.toDateString() === new Date(now).toDateString() ? "today" : "tomorrow";
    return `${when} at ${t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  const n = Math.round(d);
  return `in ${n} ${n === 1 ? "day" : "days"}`;
}

/* ===================== render =========================================== */

/* Blend the sky from night toward twilight by the sun's real altitude. Nothing
 * happens below -18 deg, where astronomical twilight ends and it is simply
 * night; the blend runs up from there to the horizon.
 */
const daylight = (sunAlt) => Math.max(0, Math.min(1, (sunAlt + 18) / 18));

function twilight(sunAlt){
  const t = daylight(sunAlt);
  const mix = (a, b) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const hi = mix([15, 19, 32],  [26, 40, 72]);
  const lo = mix([20, 26, 43],  [54, 68, 106]);
  const css = document.documentElement.style;
  css.setProperty("--sky-hi", `rgb(${hi.join(",")})`);
  css.setProperty("--sky-lo", `rgb(${lo.join(",")})`);
}

/* Altitude drives a bounded offset rather than a free position: the layout
 * below the moon still has to hold together. High moon rides near the top of
 * its travel, a setting one sinks toward the roofline.
 */
function altitudeOffset(alt){
  // Kept small deliberately: .moon-wrap reserves matching room below itself,
  // and any more travel than that puts the disc through the heading.
  const span = Math.min(40, window.innerHeight * 0.055);
  const a = Math.max(-7, Math.min(90, alt));
  return span * (1 - a / 90);
}

const fmtKm = (km) => Math.round(km).toLocaleString();

/* Where the disc sits, which way it faces and how brightly it reads, all from
 * one place: the reveal draws the same disc as the minute tick, and the two
 * disagreeing is what makes an arrival lurch.
 */
function discInputs(ms){
  const sky = place ? skyPosition(ms, place.lat, place.lon) : null;
  const up = sky ? sky.moon.alt > 0 : true;
  return {
    sky, up,
    orient: sky
      ? { limbAngle: sky.limbAngle, parallacticAngle: sky.parallacticAngle }
      : { south },
    /* A moon that has set is dimmed rather than hidden -- it is still the
       thing you came to look at. How far it can be dimmed depends on what it
       is sitting on: 0.42 reads as faint against the night sky, but the same
       value against the pale sky of a daylit hour lands almost exactly on the
       background and the moon looks switched off. Give the dim back in
       proportion to how light the sky is. */
    opts: {
      moonY: sky ? altitudeOffset(sky.moon.alt) : 0,
      dim: up ? 1 : 0.42 + 0.25 * (sky ? daylight(sky.sun.alt) : 0)
    }
  };
}

function render(){
  const now = new Date();
  const ms = now.getTime();
  const m = describe(ms);

  const { sky, up, orient, opts } = discInputs(ms);
  drawMoon(m, orient, opts);

  if (sky){
    twilight(sky.sun.alt);
    // moonlight needs the moon both bright and reasonably high to reach anything
    setMoonlight(up ? m.lit * Math.min(1, sky.moon.alt / 42) * 0.7 : 0);
  } else {
    setMoonlight(m.lit * 0.35);
  }

  el("date").textContent = fmtDate(now);
  el("name").textContent = m.name;
  el("stats").textContent = `${m.percent}% lit · ${m.age.toFixed(1)} days old`;

  const detail = [`${fmtKm(m.distance)} km`];
  if (sky){
    detail.push(up ? `${Math.round(sky.moon.alt)}° above horizon` : "below the horizon");
  }
  el("detail").textContent = detail.join(" · ");

  el("next").textContent = m.next !== null
    ? `${m.nextIsFull ? "Full moon" : "New moon"} ${inDays(m.next, ms)}`
    : "";
  // With a real angle there is nothing to toggle and nothing worth saying, so
  // the control goes rather than sitting there inert. Hidden, not disabled:
  // a disabled button still announces itself to a screen reader.
  const foot = document.querySelector(".foot");
  foot.hidden = !!sky;
  el("hemi").textContent = `${south ? "Southern" : "Northern"} hemisphere view`;
}

/* ===================== start ============================================ */

/* On first load only, run the moon up from new to its real phase. The phase
 * moves about 12 deg a day, so there is nothing to see on the minute tick --
 * animating that would be invisible and would cost battery for it. This is
 * one pass, on arrival, to hand you the current state.
 */
function reveal(){
  const target = describe(Date.now());
  const t0 = performance.now();
  const DUR = 800;

  /* The inputs are read every frame rather than captured once: a location can
     land while this is still running, and a reveal drawing a stale orientation
     over the top of a fresh one is how the disc ends up turning twice. */
  const step = (now) => {
    const k = Math.min(1, (now - t0) / DUR);
    const eased = 1 - Math.pow(1 - k, 3);
    const { orient, opts } = discInputs(Date.now());
    drawMoon({ ...target, lit: target.lit * eased }, orient, opts);
    if (k < 1) requestAnimationFrame(step);
    else render();
  };
  requestAnimationFrame(step);
}

// Render first so the text column is filled and can be measured; layout()
// sizes the band from it and builds the skyline; then render again, because
// the moonlight rides the roof edges layout() draws.
initMoon();
render();
layout();
render();
startLights();
startMeteors();
initInstall();

if (!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
  reveal();
}

el("hemi").addEventListener("click", () => {
  if (place) return;                    // orientation is computed, not chosen
  south = !south;
  writeStore(STORE, south ? "1" : "0");
  render();
});

/* Ask whenever there is no stored position: a location now sets the disc's
 * orientation as well as where the moon sits, so it earns the prompt. But
 * remember a refusal. A browser persists an outright denial, yet a prompt the
 * reader simply swipes away is not remembered, and without this flag they
 * would be asked again every single time they opened the app.
 */
if (!place && readStore(STORE_GEO) !== "off" && navigator.geolocation){
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      place = { lat: latitude, lon: longitude };
      writeStore(STORE_POS, JSON.stringify([latitude, longitude]));
      south = latitude < 0;
      writeStore(STORE, south ? "1" : "0");
      render();
    },
    () => { writeStore(STORE_GEO, "off"); },
    { timeout: 8000, maximumAge: 86400000 }
  );
}

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { layout(); render(); }, 250);
});

setInterval(render, 60000);
setInterval(seedLights, 30 * 60000);        // re-seat the lit ratio each half hour

/* A phone keeps this page alive for days, so coming back to it is what
 * "opening the app" actually means. Coming back the next evening gets a new
 * city; glancing away for a moment does not, because having it change under
 * you mid-look would just read as a glitch.
 */
const RESEED_AFTER = 30 * 60000;
let hiddenAt = 0;

document.addEventListener("visibilitychange", () => {
  if (document.hidden){ hiddenAt = Date.now(); return; }

  if (hiddenAt && Date.now() - hiddenAt > RESEED_AFTER){
    reseedCity();
    layout();
  }
  render();
  seedLights();
});

/* Offline support. Resolved against this module's own URL so it works from
 * any base path -- a project page on GitHub Pages, or the site root.
 */
if ("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(() => {});
  });
}
