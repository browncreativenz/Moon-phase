/* The skyline.
 *
 * Buildings are composed from a seeded sequence rather than a fixed cycle, so
 * the profile never visibly repeats across a wide screen. The seed is fixed:
 * it is the same city every night, which matters more here than variety.
 *
 * All sizes are in units of 1/100 of the band height, so proportions hold at
 * every screen size and only the gaps stretch.
 */

const SVGNS = "http://www.w3.org/2000/svg";

/* mulberry32 -- small, fast, and stable across engines. */
export function seeded(seed){
  let a = seed >>> 0;
  return function(){
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mk(tag, attrs){
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

const f1 = (v) => (+v).toFixed(1);

/* ===================== silhouettes ====================================== */

/* Each shape returns the y of its body top, so windows and roof clutter know
   where the facade starts. Trees and masts return null: no facade. */

function flatRoof(g, x, w, h, base, u, fill, rng){
  const top = base - h;
  g.appendChild(mk("rect", { x: f1(x), y: f1(top), width: f1(w), height: f1(base - top), fill }));
  // a parapet lip reads as a real roof edge rather than a cut line
  if (rng() < 0.55){
    const lip = Math.max(1, u * 0.9);
    g.appendChild(mk("rect", { x: f1(x - u * 0.5), y: f1(top - lip),
                               width: f1(w + u), height: f1(lip), fill }));
  }
  return top;
}

function pitchRoof(g, x, w, h, base, u, fill){
  const roof = h * 0.26, top = base - h + roof;
  g.appendChild(mk("path", { d: `M${f1(x - u * 1.2)},${f1(top)} L${f1(x + w / 2)},${f1(base - h)}` +
    ` L${f1(x + w + u * 1.2)},${f1(top)} Z`, fill }));
  g.appendChild(mk("rect", { x: f1(x), y: f1(top), width: f1(w), height: f1(base - top), fill }));
  return top;
}

function mansardRoof(g, x, w, h, base, u, fill){
  const roof = h * 0.3, top = base - h + roof, flat = w * 0.42;
  g.appendChild(mk("path", { d:
    `M${f1(x - u * 0.8)},${f1(top)} L${f1(x + (w - flat) / 2)},${f1(base - h)}` +
    ` L${f1(x + (w + flat) / 2)},${f1(base - h)} L${f1(x + w + u * 0.8)},${f1(top)} Z`, fill }));
  g.appendChild(mk("rect", { x: f1(x), y: f1(top), width: f1(w), height: f1(base - top), fill }));
  return top;
}

function spireRoof(g, x, w, h, base, u, fill){
  const sp = h * 0.42, top = base - h + sp, apex = base - h + u * 3;
  g.appendChild(mk("path", { d: `M${f1(x - u * 0.8)},${f1(top)} L${f1(x + w / 2)},${f1(apex)}` +
    ` L${f1(x + w + u * 0.8)},${f1(top)} Z`, fill }));
  // finial: must run down past the apex or it floats free
  g.appendChild(mk("rect", { x: f1(x + w / 2 - Math.max(0.6, u * 0.22)), y: f1(base - h - u * 3.5),
                             width: f1(Math.max(1.1, u * 0.44)), height: f1(u * 8), fill }));
  g.appendChild(mk("rect", { x: f1(x), y: f1(top), width: f1(w), height: f1(base - top), fill }));
  return top;
}

/* Art-deco setback: three stepped masses. The strongest profile in the set,
   so the composer saves it for the hero. */
function decoRoof(g, x, w, h, base, u, fill){
  const top = base - h;
  // three masses, narrowest at the top; each is drawn all the way down so the
  // union is a clean ziggurat rather than three floating slabs
  const steps = [[0.34, 0.20], [0.17, 0.22], [0.00, 0.58]];
  let y = top;
  for (const [inset, share] of steps){
    g.appendChild(mk("rect", { x: f1(x + w * inset), y: f1(y),
                               width: f1(w * (1 - inset * 2)), height: f1(base - y), fill }));
    y += h * share;
  }
  g.appendChild(mk("rect", { x: f1(x + w / 2 - Math.max(0.6, u * 0.2)), y: f1(top - u * 7),
                             width: f1(Math.max(1.1, u * 0.4)), height: f1(u * 7), fill }));
  return top + h * 0.42;                                  // facade starts below the setbacks
}

function domeRoof(g, x, w, h, base, u, fill){
  const r = w * 0.42, cy = base - h + r, top = cy;
  g.appendChild(mk("path", { d: `M${f1(x + w / 2 - r)},${f1(cy)} A${f1(r)},${f1(r)} 0 0 1 ${f1(x + w / 2 + r)},${f1(cy)} Z`, fill }));
  g.appendChild(mk("rect", { x: f1(x + w / 2 - Math.max(0.6, u * 0.2)), y: f1(cy - r - u * 3),
                             width: f1(Math.max(1.1, u * 0.4)), height: f1(u * 3.2), fill }));
  g.appendChild(mk("rect", { x: f1(x), y: f1(top), width: f1(w), height: f1(base - top), fill }));
  return top;
}

/* Industrial chimney: tall, thin, slightly tapered, with a collar. */
function stack(g, x, w, h, base, u, fill){
  const top = base - h, tw = w * 0.34, bw = w * 0.54;
  g.appendChild(mk("path", { d:
    `M${f1(x + (w - tw) / 2)},${f1(top)} L${f1(x + (w + tw) / 2)},${f1(top)}` +
    ` L${f1(x + (w + bw) / 2)},${f1(base)} L${f1(x + (w - bw) / 2)},${f1(base)} Z`, fill }));
  g.appendChild(mk("rect", { x: f1(x + (w - tw) / 2 - u * 0.7), y: f1(top + u * 1.5),
                             width: f1(tw + u * 1.4), height: f1(Math.max(1, u * 1.2)), fill }));
  return null;
}

/* Rooftop billboard: a panel on legs, sitting on a low block. */
function billboard(g, x, w, h, base, u, fill){
  const blockH = h * 0.52, top = base - blockH;
  const panelH = h * 0.3, panelY = base - h;
  const legY = panelY + panelH;
  g.appendChild(mk("rect", { x: f1(x + w * 0.06), y: f1(panelY),
                             width: f1(w * 0.88), height: f1(panelH), fill }));
  for (const lx of [0.22, 0.5, 0.78]){
    g.appendChild(mk("rect", { x: f1(x + w * lx - Math.max(0.5, u * 0.18)), y: f1(legY),
                               width: f1(Math.max(1, u * 0.36)), height: f1(top - legY), fill }));
  }
  g.appendChild(mk("rect", { x: f1(x), y: f1(top), width: f1(w), height: f1(base - top), fill }));
  return top;
}

/* Construction crane: mast with lattice ties, a long jib and a short
   counter-jib with its counterweight, tied back to an A-frame apex. */
function crane(g, x, w, h, base, u, fill){
  const mx = x + w * 0.30, top = base - h;
  const mw = Math.max(1.4, u * 0.7);
  const jibY = top + h * 0.12;
  const jibT = Math.max(1.2, u * 0.55);
  const tie = { stroke: fill, "stroke-width": Math.max(0.6, u * 0.22) };

  g.appendChild(mk("rect", { x: f1(mx - mw / 2), y: f1(jibY), width: f1(mw), height: f1(base - jibY), fill }));
  for (let i = 1; i < 5; i++){
    const y = jibY + (base - jibY) * (i / 5);
    g.appendChild(mk("rect", { x: f1(mx - mw * 1.5), y: f1(y),
                               width: f1(mw * 3), height: f1(Math.max(0.6, u * 0.22)), fill }));
  }

  const tipR = mx + w * 1.25, tipL = mx - w * 0.42;
  g.appendChild(mk("rect", { x: f1(tipL), y: f1(jibY), width: f1(tipR - tipL), height: f1(jibT), fill }));
  g.appendChild(mk("rect", { x: f1(tipL), y: f1(jibY - u * 1.6), width: f1(w * 0.15), height: f1(u * 3.2), fill }));

  g.appendChild(mk("path", { d: `M${f1(mx)},${f1(top)} L${f1(mx - u * 2.2)},${f1(jibY)}` +
    ` L${f1(mx + u * 2.2)},${f1(jibY)} Z`, fill }));
  g.appendChild(mk("line", { x1: f1(mx), y1: f1(top), x2: f1(tipR), y2: f1(jibY), ...tie }));
  g.appendChild(mk("line", { x1: f1(mx), y1: f1(top), x2: f1(tipL), y2: f1(jibY), ...tie }));

  const hx = mx + w * 0.82, hookY = jibY + jibT + h * 0.24;
  g.appendChild(mk("rect", { x: f1(hx), y: f1(jibY + jibT), width: f1(Math.max(0.7, u * 0.25)), height: f1(h * 0.24), fill }));
  g.appendChild(mk("rect", { x: f1(hx - u * 0.9), y: f1(hookY), width: f1(u * 2), height: f1(u * 1.1), fill }));
  return null;
}

/* Conifer: overlapping drooping tiers, narrowing to a point, with a trunk.
   The tiers overlap rather than notching in, which is what the old version got
   wrong -- it insetted between tiers and produced a stack of diamonds. */
function conifer(g, x, w, h, base, u, fill, rng){
  const cx = x + w / 2;
  const tiers = 6;
  const lean = (rng() - 0.5) * w * 0.12;
  const top = base - h;
  const trunkH = h * 0.14;
  let d = "";

  for (let i = 0; i < tiers; i++){
    const t0 = i / tiers, t1 = (i + 1.35) / tiers;      // >1 step so tiers overlap
    const yTop = top + (h - trunkH) * t0;
    const yBot = top + (h - trunkH) * Math.min(1, t1);
    const halfTop = (w / 2) * Math.pow(t0, 0.95) * 0.55;
    const halfBot = (w / 2) * Math.pow(Math.min(1, t1), 0.95);
    const lx = lean * (1 - t0);
    // one drooping skirt per tier, drawn as a closed blade either side
    d += `M${f1(cx + lx)},${f1(yTop)}` +
         ` Q${f1(cx + lx + halfBot * 0.8)},${f1(yBot - (yBot - yTop) * 0.25)} ${f1(cx + lx + halfBot)},${f1(yBot)}` +
         ` Q${f1(cx + lx + halfTop)},${f1(yBot - (yBot - yTop) * 0.30)} ${f1(cx + lx)},${f1(yBot - (yBot - yTop) * 0.10)}` +
         ` Q${f1(cx + lx - halfTop)},${f1(yBot - (yBot - yTop) * 0.30)} ${f1(cx + lx - halfBot)},${f1(yBot)}` +
         ` Q${f1(cx + lx - halfBot * 0.8)},${f1(yBot - (yBot - yTop) * 0.25)} ${f1(cx + lx)},${f1(yTop)} Z`;
  }
  g.appendChild(mk("path", { d, fill }));
  g.appendChild(mk("rect", { x: f1(cx - Math.max(0.7, u * 0.28)), y: f1(base - trunkH * 1.6),
                             width: f1(Math.max(1.4, u * 0.56)), height: f1(trunkH * 1.6), fill }));
  return null;
}

/* Broadleaf: a clustered crown on a trunk that runs up into it. The crown is
   sized off the tree's height, not just its width, or a tall one ends up as a
   small head on a long pole. Crown takes the top two thirds. */
function broadleaf(g, x, w, h, base, u, fill, rng){
  const cx = x + w / 2;
  const rx = w * 0.5, ry = h * 0.34;
  const cy = base - h + ry;
  const tw = Math.max(1.6, Math.min(w * 0.16, u * 1.1));

  g.appendChild(mk("rect", { x: f1(cx - tw / 2), y: f1(cy), width: f1(tw), height: f1(base - cy), fill }));

  const lobes = 5;
  for (let i = 0; i < lobes; i++){
    const a = (i / lobes) * Math.PI * 2 + rng() * 0.6;
    const k = 0.58 + rng() * 0.26;
    g.appendChild(mk("ellipse", {
      cx: f1(cx + Math.cos(a) * rx * 0.42),
      cy: f1(cy - ry * 0.28 + Math.sin(a) * ry * 0.34),
      rx: f1(rx * k), ry: f1(ry * k * 1.02), fill }));
  }
  return null;
}

/* Water tower: the most characterful thing in the original set, kept as it was. */
function waterTower(g, x, w, h, base, u, fill){
  const legW = Math.max(1, u * 1.1), tankH = h * 0.34, tankY = base - h;
  g.appendChild(mk("path", { d: `M${f1(x + w * 0.18)},${f1(base)} L${f1(x + w * 0.38)},${f1(tankY + tankH)}` +
    ` L${f1(x + w * 0.44)},${f1(tankY + tankH)} L${f1(x + w * 0.26)},${f1(base)} Z`, fill }));
  g.appendChild(mk("path", { d: `M${f1(x + w * 0.82)},${f1(base)} L${f1(x + w * 0.62)},${f1(tankY + tankH)}` +
    ` L${f1(x + w * 0.56)},${f1(tankY + tankH)} L${f1(x + w * 0.74)},${f1(base)} Z`, fill }));
  g.appendChild(mk("rect", { x: f1(x + w * 0.3), y: f1(tankY + tankH * 0.55),
                             width: f1(w * 0.4), height: f1(h * 0.5), fill }));
  g.appendChild(mk("rect", { x: f1(x + w * 0.08), y: f1(tankY + tankH * 0.28),
                             width: f1(w * 0.84), height: f1(tankH * 0.8), rx: f1(legW), fill }));
  g.appendChild(mk("path", { d: `M${f1(x + w * 0.06)},${f1(tankY + tankH * 0.3)} L${f1(x + w / 2)},${f1(tankY)}` +
    ` L${f1(x + w * 0.94)},${f1(tankY + tankH * 0.3)} Z`, fill }));
  return null;
}

export const SHAPES = {
  flat: flatRoof, pitch: pitchRoof, mansard: mansardRoof, spire: spireRoof,
  deco: decoRoof, dome: domeRoof, stack, billboard, crane,
  conifer, broadleaf, tower: waterTower
};

/* ===================== roof clutter ===================================== */

/* Silhouette art lives on its top edge. These are the small things that stop a
   flat roof reading as a ruled line. Drawn in the building's own fill. */
export function roofClutter(g, x, w, top, u, fill, rng){
  const items = [];
  const n = rng() < 0.30 ? 2 : rng() < 0.75 ? 1 : 0;

  for (let i = 0; i < n; i++){
    const pick = rng();
    const px = x + w * (0.12 + rng() * 0.72);

    if (pick < 0.30){                                    // stairwell / plant box
      const bw = w * (0.16 + rng() * 0.16), bh = u * (2 + rng() * 2.4);
      items.push(mk("rect", { x: f1(px - bw / 2), y: f1(top - bh), width: f1(bw), height: f1(bh), fill }));
    } else if (pick < 0.52){                             // chimney
      const bw = Math.max(1.4, u * (0.8 + rng() * 0.7)), bh = u * (2.4 + rng() * 3);
      items.push(mk("rect", { x: f1(px - bw / 2), y: f1(top - bh), width: f1(bw), height: f1(bh), fill }));
      items.push(mk("rect", { x: f1(px - bw), y: f1(top - bh - u * 0.5),
                              width: f1(bw * 2), height: f1(Math.max(0.8, u * 0.5)), fill }));
    } else if (pick < 0.72){                             // aerial
      const bh = u * (3.5 + rng() * 3);
      const sw = Math.max(0.6, u * 0.22);
      items.push(mk("rect", { x: f1(px), y: f1(top - bh), width: f1(sw), height: f1(bh), fill }));
      for (let k = 1; k <= 3; k++){
        const aw = u * (1.6 - k * 0.3);
        items.push(mk("rect", { x: f1(px - aw), y: f1(top - bh + k * u * 0.9),
                                width: f1(aw * 2 + sw), height: f1(Math.max(0.5, u * 0.2)), fill }));
      }
    } else if (pick < 0.88){                             // roof tank on legs
      const bw = w * 0.20, bh = u * 2.2, legs = u * 1.4;
      items.push(mk("rect", { x: f1(px - bw / 2), y: f1(top - bh - legs),
                              width: f1(bw), height: f1(bh), rx: f1(u * 0.4), fill }));
      for (const lx of [-0.36, 0.36]){
        items.push(mk("rect", { x: f1(px + bw * lx), y: f1(top - legs),
                                width: f1(Math.max(0.7, u * 0.25)), height: f1(legs), fill }));
      }
    } else {                                             // satellite dish
      const r = u * 1.5;
      items.push(mk("path", { d: `M${f1(px - r)},${f1(top - u * 0.6)} A${f1(r)},${f1(r)} 0 0 1 ${f1(px + r)},${f1(top - u * 1.4)} Z`, fill }));
      items.push(mk("rect", { x: f1(px - u * 0.2), y: f1(top - u * 1.2),
                              width: f1(Math.max(0.6, u * 0.4)), height: f1(u * 1.2), fill }));
    }
  }
  for (const it of items) g.appendChild(it);
}

/* ===================== windows ========================================== */

/* A rigid n x m lattice is the clearest "generated" tell there is. This keeps
   the grid underneath but knocks holes in it: dark service columns, dark
   floors, a narrow stairwell, and wide shopfronts at street level. */
export function windowGrid(w, top, base, u, rng){
  const ww = u * (1.7 + rng() * 0.9);
  const wh = u * (2.2 + rng() * 1.1);
  const availH = base - top;

  const cols = Math.max(1, Math.round((w - u * 2) / (ww * 2.05)));
  const rows = Math.max(1, Math.floor((availH - u * 2) / (wh * 1.9)));
  const padX = (w - cols * ww) / (cols + 1);
  const padY = wh * 0.9;
  if (padX < u * 0.5 || rows < 1) return [];

  const darkCol = rng() < 0.35 ? Math.floor(rng() * cols) : -1;   // service core
  const stairCol = rng() < 0.25 ? (rng() < 0.5 ? 0 : cols - 1) : -1;
  const out = [];

  for (let r = 0; r < rows; r++){
    const y = top + padY + r * (wh + padY * 0.55);
    if (y + wh > base - u) break;
    if (rng() < 0.16) continue;                                   // whole floor dark

    for (let c = 0; c < cols; c++){
      if (c === darkCol) continue;
      const isStair = c === stairCol;
      const cw = isStair ? ww * 0.55 : ww;
      const ch = isStair ? wh * 0.6 : wh;
      out.push({
        x: padX + c * (ww + padX) + (isStair ? (ww - cw) / 2 : 0),
        y: y + (isStair ? (wh - ch) / 2 : 0),
        w: cw, h: ch,
        // a little warmth spread stops every window being the same bulb
        warm: 0.72 + rng() * 0.56,
        tv: false
      });
    }
  }

  // street level: a couple of wide shopfronts, brighter and squatter
  if (rng() < 0.45 && cols >= 2){
    const shopH = wh * 0.72, y = base - shopH - u * 0.8;
    const n = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++){
      const sw = ww * (1.8 + rng() * 1.2);
      const sx = padX + rng() * Math.max(0, w - sw - padX * 2);
      out.push({ x: sx, y, w: sw, h: shopH, warm: 1.05 + rng() * 0.25, tv: false });
    }
  }
  return out;
}

/* ===================== composition ====================================== */

/* Mostly flat blocks: they are what a city is made of, and they leave the
   pointed roofs and accents room to punctuate instead of competing. */
const FILLERS = ["flat", "flat", "flat", "flat", "pitch", "mansard"];
const ACCENTS = ["spire", "dome", "tower", "stack", "billboard"];
const TREES   = ["conifer", "broadleaf"];

/* Heights follow a hump toward one hero placed off centre, so the profile has
   a shape instead of being uniformly noisy. */
function envelope(t, heroAt){
  const d = t - heroAt;
  return 0.52 + 0.48 * Math.exp(-(d * d) / (2 * 0.24 * 0.24));
}

export function compose(rng, width, u, cfg){
  const { gapBase, scale, heroAt, allowHero, minH, maxH, trees = [] } = cfg;
  const out = [];
  let x = -u * 10;
  let sinceAccent = 2, sinceTree = 2, heroDone = !allowHero;
  let guard = 0;

  while (x < width + u * 12 && guard++ < 260){
    const t = Math.max(0, Math.min(1, x / width));
    const env = envelope(t, heroAt);

    let type, w, h;
    const heroHere = !heroDone && t >= heroAt && allowHero;

    if (heroHere){
      type = rng() < 0.6 ? "deco" : "spire";
      w = (type === "deco" ? 30 : 18) + rng() * 8;
      h = maxH * (0.94 + rng() * 0.06);
      heroDone = true;
    } else if (trees.length && sinceTree >= 3 && rng() < 0.10){
      type = trees[(rng() * trees.length) | 0];
      w = type === "conifer" ? 11 + rng() * 6 : 14 + rng() * 8;
      // conifers stand clear of the roofline so they read against sky; the
      // rounded ones stay low, as a treeline rather than floating balloons
      h = type === "conifer"
        ? (minH + (maxH - minH) * 0.62) * env * (0.85 + rng() * 0.35)
        : (minH + (maxH - minH) * 0.16) * env * (0.8 + rng() * 0.4);
      sinceTree = -1;
    } else if (sinceAccent >= 2 && rng() < 0.22){
      type = ACCENTS[(rng() * ACCENTS.length) | 0];
      w = 15 + rng() * 12;
      h = (minH + (maxH - minH) * (type === "stack" ? 0.85 : 0.6)) * env * (0.85 + rng() * 0.3);
      sinceAccent = -1;
    } else {
      type = FILLERS[(rng() * FILLERS.length) | 0];
      w = 18 + rng() * 22;
      h = (minH + (maxH - minH) * rng() * 0.72) * env;
    }
    sinceAccent++; sinceTree++;

    h = Math.max(minH * 0.5, Math.min(maxH, h)) * scale;
    out.push({ type, x, w: w * u, h: h * u });

    // mostly a gap, occasionally a genuine overlap so the row reads as a city
    // with depth in it rather than a fence of separate objects
    const spread = 1 + 1.1 * t;
    const isTree = type === "conifer" || type === "broadleaf";
    const gap = (!isTree && rng() < 0.22)
      ? -w * u * (0.06 + rng() * 0.16)
      : u * gapBase * spread * (0.5 + rng()) + (isTree ? u * 4 : 0);
    x += w * u + gap;
  }
  return out;
}

/* A crane is a set piece: at most one, only on wide screens, never in front. */
export function maybeCrane(rng, width, u, placements){
  if (width < u * 240 || rng() < 0.45) return;
  const at = 0.55 + rng() * 0.35;
  placements.push({ type: "crane", x: width * at, w: 26 * u, h: (78 + rng() * 14) * u });
}
