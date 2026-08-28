# Moon

The phase of the moon tonight, over a small city. An installable PWA meant for
a phone.

![the moon over a small city](icons/icon-512.png)

## Running it

The app uses ES modules and a service worker, so it **must be served over HTTP**
— opening `index.html` from the filesystem will not work (browsers block module
loading over `file://`).

```sh
python3 -m http.server 8000    # then open http://localhost:8000
```

To deploy, push to GitHub Pages, or copy the directory to any static host. All
paths are relative, so it works from a subdirectory as happily as from a root.

Installing: on iOS, Share → Add to Home Screen. On Android, Chrome offers
"Install app" once the service worker is active.

## Layout

```
index.html          markup only
manifest.json       PWA metadata
sw.js               precaches everything; the app works offline
css/moon.css        palette and layout
js/
  astro.js          Sun and Moon positions. Pure: milliseconds in, angles out
  phase.js          phase naming, age, next new/full moon
  moon-svg.js       the lit-limb path and the disc's SVG nodes
  scene.js          star field, skyline, window lights
  app.js            wiring: clock, render loop, hemisphere, offline
icons/
```

`astro.js` and `phase.js` have no DOM dependencies, so they can be imported and
tested on their own.

## About the numbers

Positions follow Meeus, *Astronomical Algorithms* (2nd ed): chapter 25 for the
Sun and the abridged ELP-2000/82 of chapter 47 for the Moon, with Espenak &
Meeus ΔT so the series are indexed by terrestrial time rather than the browser's
UTC clock.

The implementation reproduces Meeus's worked Example 47.a exactly: for 1992
April 12.0 TD it gives λ 133.162655°, β −3.229126°, Δ 368409.7 km, matching
every published digit. Against eclipse syzygies — an eclipse is an exact new or
full moon — from 2017 to 2026, new and full moon land inside a minute, which is
as fine as those reference times are quoted. Lunation lengths over 25 years span
29.277 to 29.824 days, matching the real extremes.

Nutation is applied to the Sun and the Moon alike. It is common to both, so it
cancels in the elongation the phases are defined on; applying it to only one
leaves up to 0.0048° there, worth about 34 seconds of syzygy timing.

Two deliberate approximations:

- **Age** is measured from the previous new moon, found by root-finding
  backwards, rather than by dividing the phase angle by the synodic month.
- **Hemisphere** flips the disc 180°. The true bright-limb angle depends on the
  moon's altitude and azimuth; the flip is the usual stand-in. Geolocation is
  only ever used for the sign of your latitude, and the button overrides it.

## Changing the scene

Building shapes live in the `SPEC` table in `js/scene.js`; heights and widths
are in hundredths of the skyline band, so they hold their proportions at any
screen size. `CURVE` in the same file sets how many windows are lit at each
hour of the day.

Bump `VERSION` in `sw.js` whenever you change an asset, or returning visitors
will keep the cached copy.
