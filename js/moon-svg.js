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
    lit:  document.getElementById("lit"),
    clip: document.getElementById("clipPath"),
    disc: document.getElementById("disc"),
    halo: document.getElementById("halo")
  };
}

/* `south` flips the whole disc, maria included, for a southern view. The real
 * bright-limb angle also depends on where the moon sits in the sky; a 180 deg
 * turn is the usual stand-in for that.
 */
export function drawMoon({ lit, waxing }, south){
  if (!nodes) initMoon();

  const d = litPath(lit, waxing);
  nodes.lit.setAttribute("d", d);
  nodes.clip.setAttribute("d", d);                 // maria only show where lit
  nodes.disc.setAttribute("transform", south ? "rotate(180)" : "");
  nodes.halo.setAttribute("opacity", (0.15 + 0.85 * lit).toFixed(3));
}
