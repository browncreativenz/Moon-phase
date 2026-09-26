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

const norm360 = (a) => { a = a % 360; return a < 0 ? a + 360 : a; };

/* At zero rotation litPath puts the bright limb at 3 o'clock. Position angles
 * run anticlockwise from the zenith as you look up at the sky, while SVG turns
 * clockwise, so the screen angle is 360 - limbAngle and the turn we need is
 * that less the 90 deg the path already carries.
 */
const tiltFor = (limbAngle) => norm360(270 - limbAngle);

/* Rotation is continuous, not modular: 359 deg and -1 deg draw the same disc
 * but animate very differently. Track it unwrapped so the transition always
 * takes the short way round.
 */
let lastTilt = null;
function unwrap(target){
  if (lastTilt === null) return (lastTilt = target);
  let t = target;
  while (t - lastTilt >  180) t -= 360;
  while (t - lastTilt < -180) t += 360;
  return (lastTilt = t);
}

/* `orient` carries either the real bright-limb angle, or -- with no location
 * to compute one from -- the hemisphere flip that stands in for it.
 */
export function drawMoon({ lit, waxing, distance }, orient = {}, opts = {}){
  if (!nodes) initMoon();

  const known = Number.isFinite(orient.limbAngle);

  // With a real angle the disc is simply turned to face the sun, so it is
  // always drawn in its waxing form and the rotation carries the lit side to
  // whichever edge it belongs on. That is a rigid turn of the whole moon,
  // maria included, which is what you actually see: the moon does not mirror
  // between hemispheres, it rotates.
  const d = litPath(lit, known ? true : waxing);
  nodes.lit.setAttribute("d", d);
  nodes.clip.setAttribute("d", d);                 // maria only show where lit

  const tilt = unwrap(known ? tiltFor(orient.limbAngle) : (orient.south ? 180 : 0));
  nodes.disc.style.transform = `rotate(${tilt.toFixed(2)}deg)`;
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
