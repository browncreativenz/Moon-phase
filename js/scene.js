/* The world the moon hangs over: the wheeling star field, the skyline, and the
 * window lights that follow the hour. Everything here is decoration -- it
 * knows nothing about the moon beyond where on screen it sits.
 */

import { seeded, mk, SHAPES, LOWRISE, DOMESTIC, roofClutter, windowGrid, sparseLights, compose, maybeCrane } from "./city.js";

const rnd = (a, b) => a + Math.random() * (b - a);

/* A fresh city each time the app is opened. The seed is held for the life of
   the page rather than drawn per call, so resizing or turning the phone
   re-lays the same city instead of replacing it mid-glance. */
let citySeed = newSeed();

function newSeed(){
  return ((Date.now() ^ (Math.random() * 0x100000000)) >>> 0) || 1;
}

export function reseedCity(){
  citySeed = newSeed();
}

/* Tempo.
 *
 * This is something you glance at for a few seconds on the way to bed, not a
 * screensaver. Motion pitched to reward a long look never gets looked at long
 * enough to pay off, so the scene has to show it is alive inside that window.
 * Everything that governs that lives here.
 */
const TEMPO = {
  twinkleFast:  1.5,             // s, a full twinkle low over the town
  twinkleSlow:  3.0,             // s, overhead, where the air is thinner
  windowEvery:  [1500, 4000],    // ms between one window changing
  meteorFirst:  [3000, 9000],    // ms before the first meteor
  meteorEvery:  [15000, 45000]   // ms between meteors after that
};

const still = !!(window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches);

/* Resolve the palette once; SVG presentation attributes need literal colours. */
const CSS = getComputedStyle(document.documentElement);
const C = {
  far:   CSS.getPropertyValue("--town-far").trim()   || "#0d1526",
  back:  CSS.getPropertyValue("--town-back").trim()  || "#080b16",
  front: CSS.getPropertyValue("--town-front").trim() || "#020408",
  fore:  CSS.getPropertyValue("--town-fore").trim()  || "#010206",
  edge:  CSS.getPropertyValue("--town-edge").trim()  || "#2a3550",
  wire:  CSS.getPropertyValue("--wire").trim()       || "#161c2b",
  win:   CSS.getPropertyValue("--win").trim()        || "#e0a355",
  tv:    CSS.getPropertyValue("--win-tv").trim()     || "#7ea6d8"
};

/* ===================== stars ============================================ */

export function stars(){
  const sky = document.getElementById("sky");
  const vw = window.innerWidth, vh = window.innerHeight;

  // Layout offsets, not the client rect: on first paint the intro fade is
  // still translating the moon, and pivoting the sky about that transient
  // position leaves the wheel a few pixels off centre.
  const wrap = document.querySelector(".moon-wrap");
  const cx = wrap.offsetLeft + wrap.offsetWidth / 2;
  const cy = wrap.offsetTop + wrap.offsetHeight / 2;

  // The field wheels about the moon, so sizing it off the viewport left bare
  // corners swinging through view. Fit it to the farthest screen corner
  // instead: the inscribed circle then covers the screen at any rotation.
  let R = 0;
  for (const [x, y] of [[0, 0], [vw, 0], [0, vh], [vw, vh]]){
    R = Math.max(R, Math.hypot(x - cx, y - cy));
  }
  R = Math.ceil(R) + 2;
  const S = 2 * R;

  sky.style.left = `${cx - R}px`;
  sky.style.top = `${cy - R}px`;
  sky.style.width = sky.style.height = `${S}px`;
  sky.style.transformOrigin = "50% 50%";
  sky.textContent = "";

  const clear = (wrap.offsetWidth * 100 / 256) * 1.5;   // keep the disc's own sky empty
  const n = Math.round(Math.min(1200, Math.max(300, S * S / 2475)));
  const frag = document.createDocumentFragment();
  let guard = 0;

  for (let i = 0; i < n; i++){
    const x = Math.random() * S, y = Math.random() * S;
    if (Math.hypot(x - R, y - R) < clear && guard++ < n * 4){ i--; continue; }

    const big = Math.random();
    const size = big > 0.95 ? 2.6 : big > 0.74 ? 1.8 : 1.2;
    const s = document.createElement("span");
    s.className = big > 0.95 ? "star lg" : "star";
    s.style.left = `${x.toFixed(1)}px`;
    s.style.top = `${y.toFixed(1)}px`;
    s.style.width = s.style.height = `${size}px`;
    // Scintillation is atmospheric, so it is strongest for stars low over the
    // town, where you are looking through the most air. High ones sit steady.
    const screenY = (cy - R) + y;
    const low = Math.max(0, Math.min(1, screenY / Math.max(1, vh)));
    s.style.setProperty("--o", (0.34 + Math.random() * 0.62).toFixed(2));
    const dur = TEMPO.twinkleSlow - (TEMPO.twinkleSlow - TEMPO.twinkleFast) * low
              + Math.random() * 1.2;
    s.style.setProperty("--amp", (0.82 - 0.42 * low * low).toFixed(2));
    s.style.setProperty("--dur", `${dur.toFixed(1)}s`);
    s.style.setProperty("--delay", `${(-Math.random() * 10).toFixed(1)}s`);
    frag.appendChild(s);
  }
  sky.appendChild(frag);
}

/* ===================== town ============================================= */

let wins = [];

/* Draw one depth layer. Nearer layers get windows and roof clutter; the far
   layer is a bare ridge, which is what distance actually looks like. */
/* Scale a hex colour's channels. Used to vary the foreground building by
   building: several overlapping shapes in one flat tone read as a single blob,
   and a few percent of lightness between them is enough to pull them apart. */
function shade(hex, k){
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return "#" + (((ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)) >>> 0)
    .toString(16).padStart(6, "0");
}

/* Draw one depth layer.
 *
 * Every building is drawn twice: once shifted up a little in the edge colour,
 * then again in its own fill on top, so only a thin line survives along each
 * roofline. Two fills this dark differ by almost nothing, but an edge against
 * them differs by roughly ten times as much, and a boundary is what the eye
 * actually uses to separate one shape from another.
 *
 * Interleaved rather than cloned as a whole group, so a building overlapping
 * its neighbour gets an edge over it too, not just over the layer behind.
 */
function layer(g, rng, width, base, u, cfg, fill, detail){
  const placements = compose(rng, width, u, cfg);
  if (detail === "far") maybeCrane(rng, width, u, placements);

  const edge = cfg.edge;

  for (const b of placements){
    const shape = SHAPES[b.type];
    if (!shape) continue;

    // One sub-seed drawn per building and spent twice, so the edge copy gets
    // the identical chimney, bay count and lean as the fill it sits behind.
    const sub = (rng() * 4294967296) >>> 0;

    if (edge){
      const eg = mk("g", { transform: `translate(0,${(-edge.lift * u).toFixed(2)})`,
                           opacity: edge.opacity });
      eg.setAttribute("class", "edge");
      eg.dataset.base = edge.opacity;
      eg.dataset.boost = edge.boost || 0;
      shape(eg, b.x, b.w, b.h, base, u, C.edge, seeded(sub));
      g.appendChild(eg);
    }

    const top = shape(g, b.x, b.w, b.h, base, u, fill, seeded(sub));
    if (top === null || top === undefined) continue;      // trees and masts have no facade

    if ((detail === "mid" || detail === "near") && b.type === "flat"){
      roofClutter(g, b.x, b.w, top, u, fill, rng);
    }
    // The foreground stays mostly dark; a couple of houses get one lit window
    // each, capped for the whole layer so it never becomes a pattern.
    if (detail === "silhouette"){
      if (cfg.lightsLeft > 0 && DOMESTIC.includes(b.type) && rng() < 0.75){
        for (const win of sparseLights(b.w, top, base, u, rng)){
          if (cfg.lightsLeft-- <= 0) break;
          const el = mk("rect", {
            x: (b.x + win.x).toFixed(1), y: win.y.toFixed(1),
            width: win.w.toFixed(1), height: win.h.toFixed(1),
            rx: (u * 0.3).toFixed(1), fill: C.win, opacity: 0
          });
          el.setAttribute("class", "win");
          el.dataset.lit = Math.min(0.5, rnd(0.26, 0.44) * win.warm).toFixed(2);
          el.dataset.on = "0";
          el.dataset.eager = "1";   // see seedLights: too few of these to leave to the hourly odds
          g.appendChild(el);
          wins.push(el);
        }
      }
      continue;
    }

    if (detail !== "near") continue;

    for (const win of windowGrid(b.w, top, base, u, rng)){
      const el = mk("rect", {
        x: (b.x + win.x).toFixed(1), y: win.y.toFixed(1),
        width: win.w.toFixed(1), height: win.h.toFixed(1),
        fill: C.win, opacity: 0
      });
      el.setAttribute("class", "win");
      el.dataset.lit = Math.min(0.95, rnd(0.45, 0.9) * win.warm).toFixed(2);
      el.dataset.on = "0";
      g.appendChild(el);
      wins.push(el);
    }
  }
}

/* Two wires with a real catenary sag. */
function powerLine(g, width, base, u){
  const poleH = u * 46, poleW = Math.max(1.2, u * 0.9);
  const xs = [-width * 0.05, width * 0.27, width * 0.79, width * 1.05];
  const top = base - poleH;
  const sw = Math.max(1, u * 0.42);

  const span = (y, sag) => {
    let d = `M${xs[0].toFixed(1)},${y.toFixed(1)}`;
    for (let i = 1; i < xs.length; i++){
      const mid = (xs[i - 1] + xs[i]) / 2;
      d += ` Q${mid.toFixed(1)},${(y + (xs[i] - xs[i - 1]) * sag).toFixed(1)} ${xs[i].toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  };

  g.appendChild(mk("path", { d: span(top, 0.16), fill: "none", stroke: C.wire, "stroke-width": sw }));
  g.appendChild(mk("path", { d: span(top + u * 3.2, 0.19), fill: "none", stroke: C.wire,
                             "stroke-width": sw * 0.8, opacity: 0.7 }));

  for (let j = 1; j < xs.length - 1; j++){
    g.appendChild(mk("rect", { x: (xs[j] - poleW / 2).toFixed(1), y: top.toFixed(1),
                               width: poleW.toFixed(1), height: poleH.toFixed(1), fill: C.front }));
    g.appendChild(mk("rect", { x: (xs[j] - u * 3).toFixed(1), y: (top + u * 2.5).toFixed(1),
                               width: (u * 6).toFixed(1), height: Math.max(1, u * 0.7).toFixed(1),
                               fill: C.front }));
  }
}

export function town(){
  const host = document.getElementById("town");
  const width = host.clientWidth, H = host.clientHeight;
  if (!width || !H) return;

  const u = H / 100, base = H;
  wins = [];
  const rng = seeded(citySeed);

  const svg = mk("svg", { viewBox: `0 0 ${width} ${H}`, width: "100%", height: "100%" });

  // Three layers, each lighter and bluer than the one in front of it. Distance
  // washes contrast out; it does not just make things smaller.
  const far = mk("g", { opacity: 0.85 });
  svg.appendChild(far);
  layer(far, rng, width, base, u, { gapBase: 11, scale: 0.42, heroAt: 0.72,
    allowHero: false, minH: 30, maxH: 62, trees: ["broadleaf"],
    edge: { colour: C.edge, opacity: 0.10, boost: 0.05, lift: 0.22 } }, C.far, "far");

  const back = mk("g", {});
  svg.appendChild(back);
  layer(back, rng, width, base, u, { gapBase: 8, scale: 0.66, heroAt: 0.66,
    allowHero: false, minH: 38, maxH: 78, trees: ["broadleaf", "conifer"],
    edge: { colour: C.edge, opacity: 0.20, boost: 0.14, lift: 0.28 } }, C.back, "mid");

  // A low haze band, behind the near layer so it pushes the distance back
  // without washing the foreground out.
  const defs = mk("defs", {});
  const grad = mk("linearGradient", { id: "hazeGrad", x1: "0", y1: "0", x2: "0", y2: "1" });
  grad.appendChild(mk("stop", { offset: "0%",   "stop-color": C.far, "stop-opacity": "0" }));
  grad.appendChild(mk("stop", { offset: "100%", "stop-color": C.far, "stop-opacity": "0.42" }));
  defs.appendChild(grad);
  svg.appendChild(defs);
  svg.appendChild(mk("rect", { x: 0, y: (H * 0.45).toFixed(1), width,
                               height: (H * 0.55).toFixed(1), fill: "url(#hazeGrad)" }));

  const front = mk("g", {});
  svg.appendChild(front);
  layer(front, rng, width, base, u, { gapBase: 5, scale: 1, heroAt: 0.34,
    allowHero: true, minH: 48, maxH: 92, trees: ["conifer"],
    edge: { colour: C.edge, opacity: 0.30, boost: 0.30, lift: 0.34 } }, C.front, "near");

  // One window has a television in it. Picked from the seeded stream, so it is
  // the same window every night.
  if (wins.length){
    const tv = wins[(rng() * wins.length) | 0];
    tv.setAttribute("fill", C.tv);
    tv.dataset.tv = "1";
    tv.dataset.lit = "0.55";
  }

  powerLine(svg, width, base, u);

  // Low-rise, closest of all: a bigger unit so it reads as near, kept short so
  // only roofs and upper storeys show, and overlapping heavily -- both each
  // other and the bases of the towers behind, which is what sells the depth.
  const fore = mk("g", {});
  svg.appendChild(fore);
  layer(fore, rng, width, base, u * 1.5, { gapBase: 2, scale: 1, heroAt: 0.5,
    allowHero: false, minH: 9, maxH: 21, fillers: LOWRISE, accents: [],
    overlap: 0.42, wMin: 14, wSpread: 15, lightsLeft: 4,
    edge: { colour: C.edge, opacity: 0.52, boost: 0.38, lift: 0.30 } }, C.fore, "silhouette");

  host.textContent = "";
  host.appendChild(svg);
  seedLights();
}

/* ===================== window lights ==================================== */

/* How many windows are lit tracks the actual hour. */
const CURVE = [.30, .20, .13, .09, .07, .10, .20, .30, .28, .18, .12, .10,
               .10, .10, .10, .12, .18, .35, .60, .75, .80, .78, .65, .45];

function litRatio(){
  const n = new Date(), h = n.getHours() + n.getMinutes() / 60;
  const a = CURVE[Math.floor(h) % 24], b = CURVE[(Math.floor(h) + 1) % 24];
  return a + (b - a) * (h % 1);
}

function setWin(w, on){
  w.dataset.on = on ? "1" : "0";
  w.style.opacity = on ? w.dataset.lit : 0;
}

export function seedLights(){
  const want = litRatio();
  wins.forEach((w) => setWin(w, Math.random() < lightOdds(w, want)));
}

/* The foreground has only a handful of windows against two hundred behind it,
   so at the hourly rate they are usually all dark and the nearest houses read
   as derelict. These are the closest homes; light them more readily. */
function lightOdds(w, want){
  return w.dataset.eager ? Math.min(0.9, 0.35 + want * 1.6) : want;
}

function flicker(){
  if (!wins.length) return;

  let lit = 0;
  wins.forEach((w) => { if (w.dataset.on === "1") lit++; });
  const want = litRatio() * wins.length;

  // drift toward the target, but never in a way that reads as a sweep
  const off = lit > want ? Math.random() < 0.85 : Math.random() < 0.15;
  const pool = wins.filter((w) => (w.dataset.on === "1") === off);
  for (let i = 0; i < 2 && pool.length; i++){
    setWin(pool.splice(Math.floor(Math.random() * pool.length), 1)[0], !off);
  }

  setTimeout(flicker, rnd(TEMPO.windowEvery[0], TEMPO.windowEvery[1]));
}

/* Give the skyline whatever vertical room the text column does not need.
 *
 * The column's height is not knowable in advance: it moves with the reader's
 * font size, their browser's fallback face, and how the detail line wraps. A
 * fixed reserve works on the screen it was measured on and overlaps the
 * rooftops on everyone else's, so measure the real thing instead.
 */
/* Below this the city is a glitchy sliver rather than a skyline, so it gives up
   its space entirely: on a small screen at large text the readings matter and
   the scenery does not. town() already no-ops at zero height. The ceiling is
   high because tall phones genuinely have the room -- the old 340 was leaving
   up to 90px of it unused. */
const BAND_MIN = 96, BAND_MAX = 430, BREATHING = 14;

export function fitBand(){
  const flow = [...document.body.children].filter((n) => {
    if (getComputedStyle(n).position === "fixed") return false;
    return n.getBoundingClientRect().height > 0;
  });
  if (!flow.length) return;

  let top = Infinity, bottom = -Infinity;
  for (const n of flow){
    const r = n.getBoundingClientRect();
    top = Math.min(top, r.top);
    bottom = Math.max(bottom, r.bottom);
  }

  const padTop = parseFloat(getComputedStyle(document.body).paddingTop) || 0;
  const avail = window.innerHeight - padTop - (bottom - top) - BREATHING;
  const h = avail < BAND_MIN ? 0 : Math.min(BAND_MAX, avail);
  document.documentElement.style.setProperty("--town-h", `${Math.round(h)}px`);
}

/* Lay out everything that depends on viewport size. */
export function layout(){
  fitBand();
  stars();
  town();
}

export function startLights(){
  if (!still) setTimeout(flicker, rnd(3000, 7000));
}

/* Moonlight on the rooftops, 0..1. It rides the same roof edges the layers are
   separated by -- one mechanism, brighter when the moon is high and full --
   rather than a second copy of the skyline stacked on top of them. */
export function setMoonlight(v){
  const k = Math.max(0, Math.min(1, v));
  document.querySelectorAll("#town .edge").forEach((e) => {
    const base = parseFloat(e.dataset.base) || 0;
    const boost = parseFloat(e.dataset.boost) || 0;
    e.setAttribute("opacity", Math.min(0.9, base + boost * k).toFixed(3));
  });
}

/* ===================== meteors ========================================== */

/* Rare on purpose: often enough to be a reward for looking up, never often
   enough to become a feature of the page. */
export function startMeteors(){
  if (still) return;

  const fly = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const len = 90 + Math.random() * 150;
    const deg = 14 + Math.random() * 34;                     // shallow, downward
    const dir = Math.random() < 0.5 ? 1 : -1;
    const m = document.createElement("div");
    m.className = "meteor";
    m.style.left = `${((0.12 + Math.random() * 0.7) * vw).toFixed(0)}px`;
    m.style.top = `${((0.05 + Math.random() * 0.42) * vh).toFixed(0)}px`;
    m.style.width = `${len.toFixed(0)}px`;
    m.style.setProperty("--rot", `${(dir * deg).toFixed(1)}deg`);
    m.style.setProperty("--travel", `${(len * 2.2).toFixed(0)}px`);
    m.style.setProperty("--dur", `${(0.5 + Math.random() * 0.5).toFixed(2)}s`);
    document.body.appendChild(m);
    m.addEventListener("animationend", () => m.remove());
    setTimeout(fly, rnd(TEMPO.meteorEvery[0], TEMPO.meteorEvery[1]));
  };

  setTimeout(fly, rnd(TEMPO.meteorFirst[0], TEMPO.meteorFirst[1]));
}
