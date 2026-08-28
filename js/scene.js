/* The world the moon hangs over: the wheeling star field, the skyline, and the
 * window lights that follow the hour. Everything here is decoration -- it
 * knows nothing about the moon beyond where on screen it sits.
 */

const SVGNS = "http://www.w3.org/2000/svg";

const rnd = (a, b) => a + Math.random() * (b - a);

const still = !!(window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches);

/* Resolve the palette once; SVG presentation attributes need literal colours. */
const CSS = getComputedStyle(document.documentElement);
const C = {
  back:  CSS.getPropertyValue("--town-back").trim()  || "#0a0e1a",
  front: CSS.getPropertyValue("--town-front").trim() || "#04060d",
  wire:  CSS.getPropertyValue("--wire").trim()       || "#161c2b",
  win:   CSS.getPropertyValue("--win").trim()        || "#e0a355"
};

function mk(tag, attrs){
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

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
    s.style.setProperty("--o", (0.34 + Math.random() * 0.62).toFixed(2));
    s.style.setProperty("--dur", `${(3.5 + Math.random() * 7).toFixed(1)}s`);
    s.style.setProperty("--delay", `${(-Math.random() * 10).toFixed(1)}s`);
    frag.appendChild(s);
  }
  sky.appendChild(frag);
}

/* ===================== town ============================================= */

/* Heights and widths are in units of 1/100 of the band height, so buildings
   keep their proportions at every screen size. Only the gaps between them
   stretch, and the gaps widen toward the right so the mass sits left of centre. */
const SPEC = [
  { w: 26, h: 34, t: "flat",  c: 3, r: 2 },
  { w: 18, h: 47, t: "pitch", c: 2, r: 3 },
  { w: 34, h: 27, t: "flat",  c: 4, r: 2 },
  { w: 11, h: 74, t: "pine" },
  { w: 22, h: 41, t: "pitch", c: 3, r: 2 },
  { w: 16, h: 86, t: "spire", c: 1, r: 4 },
  { w: 14, h: 30, t: "flat",  c: 2, r: 2 },
  { w: 30, h: 53, t: "flat",  c: 4, r: 3 },
  { w: 20, h: 36, t: "pitch", c: 2, r: 2 },
  { w: 19, h: 60, t: "tower" },
  { w: 28, h: 31, t: "flat",  c: 3, r: 2 },
  { w: 9,  h: 66, t: "pine" },
  { w: 24, h: 44, t: "pitch", c: 3, r: 3 },
  { w: 36, h: 25, t: "flat",  c: 5, r: 1 }
];

let wins = [];

function pinePath(cx, base, w, h){
  const tiers = 7, pts = [];
  for (let i = 0; i <= tiers; i++){
    const t = i / tiers;
    const y = base - h + h * 0.92 * t;
    const hw = (w / 2) * Math.pow(t, 0.82);
    pts.push([cx + hw, y]);
    if (i < tiers) pts.push([cx + hw * 0.52, y + (h * 0.92 / tiers) * 0.45]);
  }
  const right = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`);
  const left = pts.slice().reverse().map((p) => `${(2 * cx - p[0]).toFixed(1)},${p[1].toFixed(1)}`);
  return `M${cx.toFixed(1)},${(base - h).toFixed(1)} L${right.join(" L")}` +
         ` L${(cx + w * 0.06).toFixed(1)},${base}` +
         ` L${(cx - w * 0.06).toFixed(1)},${base}` +
         ` L${left.join(" L")} Z`;
}

function building(g, spec, x, base, u, fill, withWindows){
  const w = spec.w * u, h = spec.h * u;

  if (spec.t === "pine"){
    g.appendChild(mk("path", { d: pinePath(x + w / 2, base, w, h), fill }));
    return w;
  }

  if (spec.t === "tower"){
    const legW = Math.max(1, u * 1.1), tankH = h * 0.34, tankY = base - h;
    g.appendChild(mk("path", { d: `M${x + w * 0.18},${base} L${x + w * 0.38},${tankY + tankH}` +
      ` L${x + w * 0.44},${tankY + tankH} L${x + w * 0.26},${base} Z`, fill }));
    g.appendChild(mk("path", { d: `M${x + w * 0.82},${base} L${x + w * 0.62},${tankY + tankH}` +
      ` L${x + w * 0.56},${tankY + tankH} L${x + w * 0.74},${base} Z`, fill }));
    g.appendChild(mk("rect", { x: x + w * 0.3, y: tankY + tankH * 0.55, width: w * 0.4, height: h * 0.5, fill }));
    g.appendChild(mk("rect", { x: x + w * 0.08, y: tankY + tankH * 0.28, width: w * 0.84,
                               height: tankH * 0.8, rx: legW, fill }));
    g.appendChild(mk("path", { d: `M${x + w * 0.06},${tankY + tankH * 0.3} L${x + w / 2},${tankY}` +
      ` L${x + w * 0.94},${tankY + tankH * 0.3} Z`, fill }));
    return w;
  }

  let bodyTop = base - h;

  if (spec.t === "pitch"){
    const roof = h * 0.26;
    bodyTop = base - h + roof;
    g.appendChild(mk("path", { d: `M${x - u * 1.2},${bodyTop} L${x + w / 2},${base - h}` +
      ` L${x + w + u * 1.2},${bodyTop} Z`, fill }));
  }

  if (spec.t === "spire"){
    const sp = h * 0.42;
    bodyTop = base - h + sp;
    g.appendChild(mk("path", { d: `M${x - u * 0.8},${bodyTop} L${x + w / 2},${base - h + u * 3}` +
      ` L${x + w + u * 0.8},${bodyTop} Z`, fill }));
    // finial: must run down past the apex (base-h+u*3) or it floats free
    g.appendChild(mk("rect", { x: x + w / 2 - Math.max(0.6, u * 0.22), y: base - h - u * 3.5,
                               width: Math.max(1.1, u * 0.44), height: u * 8, fill }));
  }

  g.appendChild(mk("rect", { x, y: bodyTop, width: w, height: base - bodyTop, fill }));

  if (withWindows && spec.c){
    const cols = spec.c, rows = spec.r;
    const ww = Math.max(2, u * 2.1), wh = Math.max(2.5, u * 2.8);
    const availH = base - bodyTop;
    const padX = (w - cols * ww) / (cols + 1);
    const padY = (availH - rows * wh) / (rows + 1);

    if (padX > 0.5 && padY > 0.5){
      for (let r = 0; r < rows; r++){
        for (let c = 0; c < cols; c++){
          const win = mk("rect", {
            x: (x + padX + c * (ww + padX)).toFixed(1),
            y: (bodyTop + padY + r * (wh + padY)).toFixed(1),
            width: ww.toFixed(1), height: wh.toFixed(1),
            fill: C.win, opacity: 0
          });
          win.setAttribute("class", "win");
          win.dataset.lit = rnd(0.5, 0.95).toFixed(2);
          win.dataset.on = "0";
          g.appendChild(win);
          wins.push(win);
        }
      }
    }
  }
  return w;
}

function row(g, width, base, u, startIdx, gapBase, fill, scale, withWindows){
  let x = -u * 8, i = startIdx, guard = 0;
  while (x < width + u * 10 && guard++ < 200){
    const spec = SPEC[i % SPEC.length];
    const scaled = { w: spec.w, h: spec.h * scale, t: spec.t, c: spec.c, r: spec.r };
    const adv = building(g, scaled, x, base, u, fill, withWindows);
    const spread = 1 + 1.7 * Math.max(0, Math.min(1, x / width));   // thins out to the right
    x += adv + u * gapBase * spread;
    i++;
  }
}

function powerLine(g, width, base, u){
  const poleH = u * 46, poleW = Math.max(1.2, u * 0.9);
  const xs = [-width * 0.05, width * 0.27, width * 0.79, width * 1.05];
  const top = base - poleH;

  let d = `M${xs[0]},${top}`;
  for (let i = 1; i < xs.length; i++){
    const mid = (xs[i - 1] + xs[i]) / 2;
    d += ` Q${mid},${top + (xs[i] - xs[i - 1]) * 0.10} ${xs[i]},${top}`;
  }
  g.appendChild(mk("path", { d, fill: "none", stroke: C.wire, "stroke-width": Math.max(1, u * 0.42) }));

  for (let j = 1; j < xs.length - 1; j++){
    g.appendChild(mk("rect", { x: xs[j] - poleW / 2, y: top, width: poleW, height: poleH, fill: C.front }));
    g.appendChild(mk("rect", { x: xs[j] - u * 3, y: top + u * 2.5, width: u * 6,
                               height: Math.max(1, u * 0.7), fill: C.front }));
  }
}

export function town(){
  const host = document.getElementById("town");
  const width = host.clientWidth, H = host.clientHeight;
  if (!width || !H) return;

  const u = H / 100, base = H;
  wins = [];

  const svg = mk("svg", { viewBox: `0 0 ${width} ${H}`, width: "100%", height: "100%" });

  const back = mk("g", {});
  svg.appendChild(back);
  row(back, width, base, u, 7, 9, C.back, 0.62, false);

  const front = mk("g", {});
  svg.appendChild(front);
  row(front, width, base, u, 0, 5, C.front, 1, true);

  powerLine(svg, width, base, u);

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
  wins.forEach((w) => setWin(w, Math.random() < want));
}

function flicker(){
  if (!wins.length) return;

  let lit = 0;
  wins.forEach((w) => { if (w.dataset.on === "1") lit++; });
  const want = litRatio() * wins.length;

  // drift toward the target, but never in a way that reads as a sweep
  const off = lit > want ? Math.random() < 0.85 : Math.random() < 0.15;
  const pool = wins.filter((w) => (w.dataset.on === "1") === off);
  if (pool.length) setWin(pool[Math.floor(Math.random() * pool.length)], !off);

  setTimeout(flicker, rnd(5000, 12000));
}

/* Lay out everything that depends on viewport size. */
export function layout(){
  stars();
  town();
}

export function startLights(){
  if (!still) setTimeout(flicker, rnd(3000, 7000));
}
