/* The moon disc itself: the lit-limb path, and the handful of SVG nodes that
 * show it. Geometry is in viewBox units, where the disc has radius 100.
 */

const R = 100;

/* The terminator is a half-ellipse whose semi-minor axis is R|2k-1|; it
 * collapses to a straight line at the quarters, where k = 0.5.
 *
 * Sweep flags decide which side is lit. In SVG's y-down space sweep 1 runs
 * clockwise on screen, so from the top of the disc it reaches the right limb.
 */
export function litPath(k, waxing, r = R){
  if (k >= 0.999) return `M0,-${r} A${r},${r} 0 1 1 0,${r} A${r},${r} 0 1 1 0,-${r} Z`;
  if (k <= 0.001) return "";

  const rx = r * Math.abs(1 - 2 * k);
  const limbSweep = waxing ? 1 : 0;
  const termSweep = (k < 0.5) ? (waxing ? 0 : 1) : (waxing ? 1 : 0);

  return `M0,-${r} A${r},${r} 0 0 ${limbSweep} 0,${r}` +
         ` A${rx.toFixed(3)},${r} 0 0 ${termSweep} 0,-${r} Z`;
}

let nodes = null;

export function initMoon(){
  nodes = {
    pos:   document.querySelector(".moon-pos"),
    lit:   document.getElementById("lit"),
    clip:  document.getElementById("clipPath"),
    disc:  document.getElementById("disc"),
    halo:  document.getElementById("halo"),
    earth: document.getElementById("earthshine"),
    blur:  document.querySelector("#soften feGaussianBlur")
  };
}

/* Mean Earth-Moon distance. Perigee to apogee is a 14% swing in apparent
   diameter, so a supermoon really is visibly bigger than a micromoon. */
const MEAN_DIST = 385000.56;

/* `south` flips the whole disc, maria included, for a southern view. The real
 * bright-limb angle also depends on where the moon sits in the sky; a 180 deg
 * turn is the usual stand-in for that.
 */
export function drawMoon({ lit, waxing, distance }, south, opts = {}){
  if (!nodes) initMoon();

  const d = litPath(lit, waxing);
  nodes.lit.setAttribute("d", d);
  nodes.clip.setAttribute("d", d);                 // maria only show where lit
  nodes.disc.style.transform = south ? "rotate(180deg)" : "rotate(0deg)";
  nodes.halo.setAttribute("opacity", (0.15 + 0.85 * lit).toFixed(3));

  // Earthshine is brightest when the crescent is thinnest -- "the old moon in
  // the new moon's arms". It shows only on the unlit face, because the lit
  // path is painted over the top of it. Kept faint on purpose: the phase has
  // to stay the thing you read first.
  nodes.earth.setAttribute("opacity", (0.085 * Math.pow(1 - lit, 1.8)).toFixed(3));

  // Soften the terminator, but back off as it approaches the limb: near full
  // and new the two coincide, and blurring there rounds off an edge that
  // should stay crisp. Widest at the quarters, where the terminator runs
  // straight down the middle of the disc.
  if (nodes.blur){
    const nearLimb = Math.abs(2 * lit - 1);
    nodes.blur.setAttribute("stdDeviation", (0.35 + 1.45 * (1 - nearLimb)).toFixed(2));
  }

  if (nodes.pos && distance){
    const scale = MEAN_DIST / distance;
    nodes.pos.style.setProperty("--moon-scale", scale.toFixed(4));
  }
  if (nodes.pos && opts.moonY !== undefined){
    nodes.pos.style.setProperty("--moon-y", `${opts.moonY.toFixed(1)}px`);
  }
  if (nodes.pos && opts.dim !== undefined){
    nodes.pos.style.opacity = opts.dim.toFixed(2);
  }
}
