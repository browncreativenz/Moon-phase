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
    maria: document.getElementById("maria")
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

/* The transitions on the disc and on .moon-pos exist to carry the moon through
 * the night. They are wrong on arrival: the browser's starting point is an
 * untilted, centred disc, so the first real angle is animated as a spin and the
 * first real altitude as a slide, neither of which is anything the sky did.
 * Snap instead, up to and including the first draw that knows where the moon
 * is; only after that is a change a real change worth animating.
 */
let painted = false;
let knownSeen = false;

function withoutTransition(fn){
  const els = [nodes.disc, nodes.pos, nodes.maria].filter(Boolean);
  els.forEach((e) => { e.style.transition = "none"; });
  fn();
  // Reading layout back flushes the change at the suppressed value, so putting
  // the transition back cannot pick it up and animate it after the fact.
  els.forEach((e) => { e.getBoundingClientRect(); e.style.transition = ""; });
}

/* `orient` carries either the real bright-limb angle, or -- with no location
 * to compute one from -- the hemisphere flip that stands in for it.
 */
export function drawMoon(phase, orient = {}, opts = {}){
  if (!nodes) initMoon();

  const known = Number.isFinite(orient.limbAngle);
  // Two arrivals to snap through, not one: the very first paint, and the
  // moment a location turns the placeholder orientation into a real one. A
  // later change -- the hemisphere button, or the sky itself moving on -- is a
  // real change, and still animates.
  const arriving = !painted || (known && !knownSeen);
  painted = true;
  if (known) knownSeen = true;

  if (arriving) withoutTransition(() => paint(phase, orient, opts, known));
  else paint(phase, orient, opts, known);
}

function paint({ lit, waxing, distance }, orient, opts, known){

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

  /* The surface is not the lit side. Turning the disc to face the sun carries
     the maria with it, but the moon's own north follows the parallactic angle
     alone, so they need the disc's rotation undone and q put back. Without a
     location there is nothing to compute and they simply ride along. */
  if (nodes.maria){
    const q = orient.parallacticAngle;
    nodes.maria.style.transform = (known && Number.isFinite(q))
      ? `rotate(${(-tilt - q).toFixed(2)}deg)`
      : "";
  }
  nodes.halo.setAttribute("opacity", (0.15 + 0.85 * lit).toFixed(3));

  // Earthshine is brightest when the crescent is thinnest -- "the old moon in
  // the new moon's arms". It shows only on the unlit face, because the lit
  // path is painted over the top of it. Kept faint on purpose: the phase has
  // to stay the thing you read first.
  nodes.earth.setAttribute("opacity", (0.085 * Math.pow(1 - lit, 1.8)).toFixed(3));



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
