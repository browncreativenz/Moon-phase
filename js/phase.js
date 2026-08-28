/* Phase semantics on top of the raw ephemeris: what the phase is called, how
 * old the moon is, and when the next new or full moon falls.
 */

import { elongation, moonState } from "./astro.js";

const SYNODIC = 29.530588853;

export function phaseName(psi){
  const W = 6;                            // each named phase spans ~12 hours
  if (psi < W || psi > 360 - W)   return "New moon";
  if (Math.abs(psi - 90)  < W)    return "First quarter";
  if (Math.abs(psi - 180) < W)    return "Full moon";
  if (Math.abs(psi - 270) < W)    return "Last quarter";
  if (psi < 90)   return "Waxing crescent";
  if (psi < 180)  return "Waxing gibbous";
  if (psi < 270)  return "Waning gibbous";
  return "Waning crescent";
}

/* Walk hour by hour until the wrapped elongation crosses the target, then
 * bisect. Stepping backwards (dir -1) finds the most recent crossing, which is
 * how the moon's real age is measured. The 180 deg branch cut only ever jumps
 * the wrong way, so it is never mistaken for a crossing.
 */
export function crossing(fromMs, target, dir = 1){
  const f = (t) => {
    let x = elongation(t) - target;
    while (x < -180) x += 360;
    while (x >  180) x -= 360;
    return x;
  };

  const step = dir * 3600000;
  let t0 = fromMs, prev = f(t0);

  for (let i = 1; i <= 24 * 32; i++){
    const t1 = fromMs + i * step;
    const cur = f(t1);
    const found = dir > 0 ? (prev < 0 && cur >= 0) : (prev >= 0 && cur < 0);
    if (found){
      let lo = Math.min(t0, t1), hi = Math.max(t0, t1);
      for (let j = 0; j < 42; j++){
        const mid = (lo + hi) / 2;
        if (f(mid) < 0) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }
    t0 = t1; prev = cur;
  }
  return null;
}

/* Root finding costs a few hundred series evaluations, so hold the answers
 * until the event they describe has actually gone past.
 */
let cached = null;

function events(now, psi){
  if (cached && cached.last !== null && cached.next !== null &&
      now >= cached.last && now < cached.next) return cached;

  const target = psi < 180 ? 180 : 0;
  cached = {
    last: crossing(now, 0, -1),           // previous new moon
    next: crossing(now, target, 1),
    nextIsFull: target === 180
  };
  return cached;
}

/* Round to a whole percent, but never let rounding claim a full or new moon
 * that has not happened -- a 99.6% gibbous is not "100% lit".
 */
export function percentLit(k){
  const v = k * 100;
  if (v >= 99.95) return 100;
  if (v <= 0.05)  return 0;
  return Math.max(1, Math.min(99, Math.round(v)));
}

/* One instant, fully described. This is the only thing the UI needs. */
export function describe(ms){
  const s = moonState(ms);
  const ev = events(ms, s.psi);

  return {
    psi:        s.psi,
    lit:        s.lit,
    percent:    percentLit(s.lit),
    waxing:     s.waxing,
    distance:   s.dist,
    name:       phaseName(s.psi),
    // Measured from the real previous new moon. Dividing the phase angle by
    // the synodic month assumes the moon moves uniformly; it does not, and
    // that shortcut ran up to 0.94 days out.
    age:        ev.last !== null ? (ms - ev.last) / 86400000 : s.psi / 360 * SYNODIC,
    next:       ev.next,
    nextIsFull: ev.nextIsFull
  };
}
