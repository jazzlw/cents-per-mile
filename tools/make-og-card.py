#!/usr/bin/env python3
"""Regenerate og-card.png, the 1200x630 social preview card.

macOS only, no dependencies: writes an SVG, renders it with QuickLook, then
crops with sips.

    ./tools/make-og-card.py

Two quirks worth knowing before you edit this:

* QuickLook scales an SVG to *cover* a square thumbnail, so the source canvas
  is authored square (1200x1200) with the card centred in it. That renders 1:1
  and crops cleanly. A 1200x630 canvas renders at 1.9x and crops wrong.
* QuickLook can only use fonts installed on the machine, so the card uses
  macOS system faces rather than the site's webfonts. Avenir Next Condensed
  stands in for Saira Condensed, Avenir Next for Public Sans, Menlo for IBM
  Plex Mono.

The four vehicles are hardcoded at the app's default prices ($3.20/gal,
$0.17/kWh). Update them if those defaults change.
"""

import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "og-card.png"

ROWS = [
    ("Tesla Model 3 RWD",   "4.1 mi/kWh",  4.13, "ev"),
    ("Toyota Prius",        "57 MPG",      5.61, "gas"),
    ("Honda Civic 2.0L",    "36 MPG",      8.89, "gas"),
    ("Ford F-150 EcoBoost", "19 MPG",     16.84, "gas"),
]

EV, GAS = "#0aa08c", "#c98429"
INK, MUTED, DIM, GROUND, SUB = "#e6ecf1", "#8b98a6", "#36424d", "#0d1216", "#c2ccd6"
BAR_X, BAR_MAX, BAR_H = 460, 500, 24


def build_svg():
    worst = max(r[2] for r in ROWS)
    parts = []
    for i, (name, eff, cents, fuel) in enumerate(ROWS):
        cy = 348 + i * 62
        w = cents / worst * BAR_MAX
        color = EV if fuel == "ev" else GAS
        parts.append(f'''
    <rect x="{BAR_X}" y="{cy - BAR_H / 2:.0f}" width="{w:.0f}" height="{BAR_H}" fill="{color}" rx="2"/>
    <text x="80" y="{cy - 4:.0f}" font-family="Avenir Next" font-size="26" font-weight="500" fill="{INK}">{name}</text>
    <text x="80" y="{cy + 22:.0f}" font-family="Menlo, monospace" font-size="17" fill="{MUTED}">{eff}</text>
    <text x="{BAR_X + w + 18:.0f}" y="{cy + 9:.0f}" font-family="Avenir Next Condensed" font-size="34" font-weight="700" fill="{color}">{cents:.1f}¢</text>''')

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="{GROUND}"/>
  <g transform="translate(0,285)">
    <rect x="0" y="0" width="1200" height="630" fill="{GROUND}"/>
    <rect x="0" y="0" width="600" height="5" fill="{EV}"/>
    <rect x="600" y="0" width="600" height="5" fill="{GAS}"/>
    <text x="80" y="98" font-family="Menlo, monospace" font-size="19" letter-spacing="3.4" fill="{MUTED}">FUEL COST CALCULATOR · EPA DATA</text>
    <text x="80" y="196" font-family="Avenir Next Condensed" font-size="104" font-weight="700" fill="{INK}">Cents <tspan fill="{DIM}">/</tspan> Mile</text>
    <text x="80" y="248" font-family="Avenir Next" font-size="27" fill="{SUB}">What a mile actually costs — EVs vs gas, at the prices you pay.</text>
{"".join(parts)}
    <text x="80" y="600" font-family="Menlo, monospace" font-size="18" fill="{MUTED}">jazzlw.github.io/cents-per-mile</text>
  </g>
</svg>
'''


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        svg = tmp / "og.svg"
        svg.write_text(build_svg())

        subprocess.run(["qlmanage", "-t", "-s", "1200", "-o", str(tmp), str(svg)],
                       capture_output=True, check=False)
        rendered = tmp / "og.svg.png"
        if not rendered.exists():
            print("qlmanage produced no thumbnail", file=sys.stderr)
            return 1

        subprocess.run(["sips", "-c", "630", "1200", str(rendered), "--out", str(OUT)],
                       capture_output=True, check=True)

    print(f"wrote {OUT.relative_to(ROOT)} (1200x630)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
