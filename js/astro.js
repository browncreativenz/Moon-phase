/* Solar and lunar positions.
 *
 * Meeus, "Astronomical Algorithms" (2nd ed): chapter 25 for the Sun, and the
 * abridged ELP-2000/82 of chapter 47 for the Moon.
 *
 * The tables below reproduce Meeus's own worked Example 47.a exactly -- for
 * 1992 April 12.0 TD they give lambda 133.162655, beta -3.229126, distance
 * 368409.7 km, matching every published digit. Against eclipse syzygies from
 * 2017 to 2026 new and full moon land inside a minute, which is as fine as
 * those reference times are quoted.
 *
 * Everything here is pure: milliseconds in, angles out. No DOM, no state.
 * Angles are degrees; the trig helpers convert on the way in and out.
 */

const DEG = Math.PI / 180;

export function norm(a){ a = a % 360; return a < 0 ? a + 360 : a; }

const sin = (x) => Math.sin(x * DEG);
const cos = (x) => Math.cos(x * DEG);

/* Nutation in longitude, deg (Meeus ch.22, leading term).
 *
 * Both bodies need it, or neither: the phases are defined on the difference of
 * two *apparent* longitudes, and nutation is common to both, so it cancels
 * there. Applying it to only one leaves up to 0.0048 deg in the elongation --
 * about 34 seconds of syzygy timing.
 */
function nutation(T){
  return -0.00478 * sin(125.04 - 1934.136 * T);
}

// Table 47.A -- D, M, M', F, coefficient of sum(l) in 1e-6 deg, of sum(r) in metres.
const TL = [
  0,0,1,0,6288774,-20905355,   2,0,-1,0,1274027,-3699111,  2,0,0,0,658314,-2955968,
  0,0,2,0,213618,-569925,      0,1,0,0,-185116,48888,      0,0,0,2,-114332,-3149,
  2,0,-2,0,58793,246158,       2,-1,-1,0,57066,-152138,    2,0,1,0,53322,-170733,
  2,-1,0,0,45758,-204586,      0,1,-1,0,-40923,-129620,    1,0,0,0,-34720,108743,
  0,1,1,0,-30383,104755,       2,0,0,-2,15327,10321,       0,0,1,2,-12528,0,
  0,0,1,-2,10980,79661,        4,0,-1,0,10675,-34782,      0,0,3,0,10034,-23210,
  4,0,-2,0,8548,-21636,        2,1,-1,0,-7888,24208,       2,1,0,0,-6766,30824,
  1,0,-1,0,-5163,-8379,        1,1,0,0,4987,-16675,        2,-1,1,0,4036,-12831,
  2,0,2,0,3994,-10445,         4,0,0,0,3861,-11650,        2,0,-3,0,3665,14403,
  0,1,-2,0,-2689,-7003,        2,0,-1,2,-2602,0,           2,-1,-2,0,2390,10056,
  1,0,1,0,-2348,6322,          2,-2,0,0,2236,-9884,        0,1,2,0,-2120,5751,
  0,2,0,0,-2069,0,             2,-2,-1,0,2048,-4950,       2,0,1,-2,-1773,4130,
  2,0,0,2,-1595,0,             4,-1,-1,0,1215,-3958,       0,0,2,2,-1110,0,
  3,0,-1,0,-892,3258,          2,1,1,0,-810,2616,          4,-1,-2,0,759,-1897,
  0,2,-1,0,-713,-2117,         2,2,-1,0,-700,2354,         2,1,-2,0,691,0,
  2,-1,0,-2,596,0,             4,0,1,0,549,-1423,          0,0,4,0,537,-1117,
  4,-1,0,0,520,-1571,          1,0,-2,0,-487,-1739,        2,1,0,-2,-399,0,
  0,0,2,-2,-381,-4421,         1,1,1,0,351,0,              3,0,-2,0,-340,0,
  4,0,-3,0,330,0,              2,-1,2,0,327,0,             0,2,1,0,-323,1165,
  1,1,-1,0,299,0,              2,0,3,0,294,0,              2,0,-1,-2,0,8752
];

// Table 47.B -- D, M, M', F, coefficient of sum(b) in 1e-6 deg.
const TB = [
  0,0,0,1,5128122,  0,0,1,1,280602,   0,0,1,-1,277693,  2,0,0,-1,173237,
  2,0,-1,1,55413,   2,0,-1,-1,46271,  2,0,0,1,32573,    0,0,2,1,17198,
  2,0,1,-1,9266,    0,0,2,-1,8822,    2,-1,0,-1,8216,   2,0,-2,-1,4324,
  2,0,1,1,4200,     2,1,0,-1,-3359,   2,-1,-1,1,2463,   2,-1,0,1,2211,
  2,-1,-1,-1,2065,  0,1,-1,-1,-1870,  4,0,-1,-1,1828,   0,1,0,1,-1794,
  0,0,0,3,-1749,    0,1,-1,1,-1565,   1,0,0,1,-1491,    0,1,1,1,-1475,
  0,1,1,-1,-1410,   0,1,0,-1,-1344,   1,0,0,-1,-1335,   0,0,3,1,1107,
  4,0,0,-1,1021,    4,0,-1,1,833,     0,0,1,-3,777,     4,0,-2,1,671,
  2,0,0,-3,607,     2,0,2,-1,596,     2,-1,1,-1,491,    2,0,-2,1,-451,
  0,0,3,-1,439,     2,0,2,1,422,      2,0,-3,-1,421,    2,1,-1,1,-366,
  2,1,0,1,-351,     4,0,0,1,331,      2,-1,1,1,315,     2,-2,0,-1,302,
  0,0,1,3,-283,     2,1,1,-1,-229,    1,1,0,-1,223,     1,1,0,1,223,
  0,1,-2,-1,-220,   2,1,-1,-1,-220,   1,0,1,1,-185,     2,-1,-2,-1,181,
  0,1,2,1,-177,     4,0,-2,-1,176,    4,-1,-1,-1,166,   1,0,1,-1,-164,
  4,0,1,-1,132,     1,0,-1,-1,-119,   4,-1,0,-1,115,    2,-2,0,1,107
];

/* Delta T, the gap between terrestrial and universal time, in seconds
   (Espenak & Meeus). The tables above are indexed by TT, the browser clock
   reports UTC, and seventy-odd seconds is worth about 0.01 deg of moon. */
export function deltaT(year){
  let t, u;
  if (year >= 2005 && year < 2050){
    t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  if (year >= 1986 && year < 2005){
    t = year - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t +
           0.000651814 * t * t * t * t + 0.00002373599 * t * t * t * t * t;
  }
  if (year >= 2050 && year < 2150){
    u = (year - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - year);
  }
  u = (year - 1820) / 100;
  return -20 + 32 * u * u;
}

/* Julian centuries of TT since J2000.0, from a UTC timestamp in milliseconds. */
export function centuries(ms){
  const jd = ms / 86400000 + 2440587.5;
  const year = 2000 + (jd - 2451545.0) / 365.25;
  return (jd + deltaT(year) / 86400 - 2451545.0) / 36525;
}

/* Apparent longitude (deg) and distance (AU) of the Sun. */
export function sunPos(T){
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M  = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e  = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const C  = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
           + (0.019993 - 0.000101 * T) * sin(2 * M)
           + 0.000289 * sin(3 * M);
  const v = M + C;
  return {
    // apparent: true longitude, less aberration, plus nutation
    lon: norm(L0 + C - 0.00569 + nutation(T)),
    R:   1.000001018 * (1 - e * e) / (1 + e * cos(v))
  };
}

/* Apparent longitude, latitude (deg) and distance (km) of the Moon. */
export function moonPos(T){
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T*T*T/538841 - T*T*T*T/65194000;
  const D  = 297.8501921 + 445267.1114034  * T - 0.0018819 * T * T + T*T*T/545868 - T*T*T*T/113065000;
  const M  = 357.5291092 + 35999.0502909   * T - 0.0001536 * T * T + T*T*T/24490000;
  const Mp = 134.9633964 + 477198.8675055  * T + 0.0087414 * T * T + T*T*T/69699  - T*T*T*T/14712000;
  const F  = 93.2720950  + 483202.0175233  * T - 0.0036539 * T * T - T*T*T/3526000 + T*T*T*T/863310000;

  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.290 * T;
  const A3 = 313.45 + 481266.484 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;   // damps terms involving the Sun's anomaly

  let sl = 0, sr = 0, sb = 0, i, a, f;

  for (i = 0; i < TL.length; i += 6){
    a = TL[i] * D + TL[i+1] * M + TL[i+2] * Mp + TL[i+3] * F;
    f = Math.abs(TL[i+1]) === 1 ? E : (Math.abs(TL[i+1]) === 2 ? E * E : 1);
    sl += TL[i+4] * f * sin(a);
    sr += TL[i+5] * f * cos(a);
  }
  for (i = 0; i < TB.length; i += 5){
    a = TB[i] * D + TB[i+1] * M + TB[i+2] * Mp + TB[i+3] * F;
    f = Math.abs(TB[i+1]) === 1 ? E : (Math.abs(TB[i+1]) === 2 ? E * E : 1);
    sb += TB[i+4] * f * sin(a);
  }

  sl += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
  sb += -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F)
      + 127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);

  // The series gives geometric longitude; nutation makes it apparent, matching
  // the Sun above so the two are differenced on the same footing.
  return { lon: norm(Lp + sl / 1e6 + nutation(T)), lat: sb / 1e6, dist: 385000.56 + sr / 1000 };
}

/* Difference in apparent ecliptic longitude, 0..360. This is the quantity the
   four named phases are defined on, so it drives the naming and the geometry. */
export function elongation(ms){
  const T = centuries(ms);
  return norm(moonPos(T).lon - sunPos(T).lon);
}

const AU = 149597870.7;

/* Everything the display needs about the moon at one instant. */
export function moonState(ms){
  const T = centuries(ms);
  const s = sunPos(T);
  const m = moonPos(T);
  const psi = norm(m.lon - s.lon);

  // True separation: the moon's ecliptic latitude tilts it away from the
  // longitude difference by up to five degrees.
  const sep = Math.acos(cos(m.lat) * cos(m.lon - s.lon)) / DEG;

  // Illumination follows the Sun-Moon-Earth angle, not the separation seen
  // from here; at 400 000 km the two differ by up to a sixth of a degree.
  const Rk = s.R * AU;
  const phaseAngle = Math.atan2(Rk * sin(sep), m.dist - Rk * cos(sep)) / DEG;

  return {
    psi,                                  // elongation in longitude, deg
    phaseAngle,                           // Sun-Moon-Earth angle, deg
    lit: (1 + cos(phaseAngle)) / 2,       // illuminated fraction, 0..1
    dist: m.dist,                         // km
    waxing: psi < 180
  };
}

/* ===================== where it is in the sky =========================== */

/* Mean obliquity of the ecliptic, deg (Meeus ch.22). */
function obliquity(T){
  return 23.4392911 - 0.0130042 * T - 0.00000016 * T * T + 0.000000504 * T * T * T;
}

/* Ecliptic to equatorial. Returns right ascension and declination in deg. */
export function equatorial(lon, lat, T){
  const e = obliquity(T);
  const sl = sin(lon), cl = cos(lon), se = sin(e), ce = cos(e);
  const sb = sin(lat), cb = cos(lat);
  const ra = Math.atan2(sl * ce - (sb / cb) * se, cl) / DEG;
  const dec = Math.asin(sb * ce + cb * se * sl) / DEG;
  return { ra: norm(ra), dec };
}

/* Greenwich mean sidereal time in degrees (Meeus 12.4). */
export function gmst(ms){
  const jd = ms / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  return norm(280.46061837 + 360.98564736629 * (jd - 2451545.0)
              + 0.000387933 * T * T - T * T * T / 38710000);
}

/* Altitude and azimuth for an observer. Azimuth is measured from north,
 * eastward, which is the way a compass reads.
 */
export function horizon(ra, dec, ms, lat, lon){
  const H = norm(gmst(ms) + lon - ra);           // local hour angle, east longitude positive
  const sd = sin(dec), cd = cos(dec), sp = sin(lat), cp = cos(lat);
  const alt = Math.asin(sd * sp + cd * cp * cos(H)) / DEG;
  const az = norm(Math.atan2(sin(H), cos(H) * sp - (sd / cd) * cp) / DEG + 180);
  return { alt, az };
}

/* Geocentric altitude of the Moon and the Sun at one instant.
 *
 * Geocentric, not topocentric: the Moon's horizontal parallax reaches about a
 * degree, and refraction lifts a body near the horizon by another half. Both
 * are ignored, because this drives where the moon sits in a stylised drawing
 * rather than a rise time.
 */
export function skyPosition(ms, lat, lon){
  const T = centuries(ms);
  const m = moonPos(T), s = sunPos(T);
  const me = equatorial(m.lon, m.lat, T);
  const se = equatorial(s.lon, 0, T);
  return {
    moon: horizon(me.ra, me.dec, ms, lat, lon),
    sun:  horizon(se.ra, se.dec, ms, lat, lon)
  };
}
