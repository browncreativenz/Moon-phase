/* Wiring: read the clock, describe the moon, put it on screen, and keep the
 * whole thing current.
 */

import { describe } from "./phase.js";
import { drawMoon, initMoon } from "./moon-svg.js";
import { layout, seedLights, startLights } from "./scene.js";

const el = (id) => document.getElementById(id);

/* ===================== hemisphere ======================================= */

/* Only the orientation of the disc depends on where you are -- the phase
 * itself is the same everywhere. So all we want from a location is the sign
 * of its latitude, and the button lets you override it.
 */
const STORE = "moon.south";

function loadSouth(){
  try { return localStorage.getItem(STORE); } catch { return null; }
}

function saveSouth(v){
  try { localStorage.setItem(STORE, v ? "1" : "0"); } catch { /* private mode */ }
}

const stored = loadSouth();
let south = stored !== null ? stored === "1" : false;

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

function render(){
  const now = new Date();
  const ms = now.getTime();
  const m = describe(ms);

  drawMoon(m, south);

  el("date").textContent = fmtDate(now);
  el("name").textContent = m.name;
  el("stats").textContent = `${m.percent}% lit · ${m.age.toFixed(1)} days old`;
  el("next").textContent = m.next !== null
    ? `${m.nextIsFull ? "Full moon" : "New moon"} ${inDays(m.next, ms)}`
    : "";
  el("hemi").textContent = `${south ? "Southern" : "Northern"} hemisphere view`;
}

/* ===================== start ============================================ */

initMoon();
render();
layout();
startLights();

el("hemi").addEventListener("click", () => {
  south = !south;
  saveSouth(south);
  render();
});

// Only ask for a location if the reader has never chosen a hemisphere.
if (stored === null && navigator.geolocation){
  navigator.geolocation.getCurrentPosition(
    (pos) => { south = pos.coords.latitude < 0; saveSouth(south); render(); },
    () => {},
    { timeout: 8000, maximumAge: 86400000 }
  );
}

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(layout, 250);
});

setInterval(render, 60000);
setInterval(seedLights, 30 * 60000);        // re-seat the lit ratio each half hour

document.addEventListener("visibilitychange", () => {
  if (!document.hidden){ render(); seedLights(); }
});

/* Offline support. Resolved against this module's own URL so it works from
 * any base path -- a project page on GitHub Pages, or the site root.
 */
if ("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(() => {});
  });
}
