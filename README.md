# Cents Per Mile

A single-page calculator for the question "what does a mile actually cost in
this car?" — EVs priced from miles per kWh, gas cars from MPG, with both fuel
prices under your control.

No build step, no dependencies, no framework — open the HTML and it runs.
25 vehicles ship with it, sourced from the EPA, and the list is a plain
JavaScript array you can edit by hand.

## Run it locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` directly from the
filesystem also works — the scripts are plain `<script>` tags, not modules, so
there is nothing for `file://` to trip over.

## What it does

- **Set both fuel prices.** Type a number, drag a slider, or pick a preset.
  The electricity presets matter most: home off-peak versus DC fast charging is
  a wider spread than any two cars in the list.
- **Rank every vehicle** by cents per mile, colored by fuel type.
- **Translate between fuels.** Each EV shows the MPG a gas car would need to
  match it; each gas car shows the mi/kWh an EV would need. Both re-derive as
  soon as a price changes.
- **Pick a baseline.** Click any row and the rest show ±$/year against it.
- **Add your own car** by MPG or mi/kWh. Your cars and prices persist in
  `localStorage`, per browser.

It follows the reader's light/dark preference, and respects
`prefers-reduced-motion`.

## The math

That's the whole model:

```
gas   $/mile = price per gallon ÷ MPG
electric $/mile = price per kWh ÷ miles per kWh
```

Fuel only. No insurance, tires, maintenance, registration, or depreciation —
those swing the real answer a lot, and none of them are in here.

## Where the data comes from

Every rating in `src/data.js` is the EPA combined figure from the official
[fueleconomy.gov web service](https://www.fueleconomy.gov/feg/ws/). Each entry
carries its EPA vehicle ID, so any number can be re-checked at the source:

```sh
curl -s -H 'Accept: application/json' \
  https://www.fueleconomy.gov/ws/rest/vehicle/49301
```

`tools/fetch-epa.py` wraps that lookup:

```sh
./tools/fetch-epa.py 2026 Toyota Prius     # every Prius trim with its rating
./tools/fetch-epa.py 2026 Tesla "Model Y"
./tools/fetch-epa.py --models 2026 Hyundai # what model names exist
```

### Adding a vehicle

Look up the rating, then add a line to `FLEET` in `src/data.js`:

```js
// gas: store EPA combined MPG
{n:"Toyota Prius",       f:"gas", year:2026, mpg:57,        epa:49301, c:"Hybrid"},

// electric: store EPA combined kWh per 100 miles
{n:"Hyundai Ioniq 5 RWD", f:"ev", year:2026, kwh100:30.0,   epa:49960, c:"SUV"},
```

`n` is the display name, `f` the fuel type, `c` a free-text class shown
nowhere yet but useful for grouping later, and `epa` the vehicle ID that makes
the number checkable. Nothing else needs touching — the chart, the summary
tiles and the sort all read from this array.

Two conventions worth keeping when you edit the list:

- **EVs store `kwh100`,** the EPA combined kWh per 100 miles, not mi/kWh.
  That is the number on the window sticker and it is measured at the wall, so
  the ~10–15% lost to charging is already included. `mi/kWh` is derived as
  `100 / kwh100` so there is one source of truth.
- **Gas vehicles are all rated on regular unleaded.** One gas price is
  therefore valid for the whole list. Adding a midgrade or premium vehicle
  (the 5.7L Ram, most performance trims) would understate its cost unless you
  also add a per-grade price.

Model years span 2017–2027. Most entries are the current rating; older years
appear where a vehicle is no longer sold (the Prius v ended in 2017, the Bolt
EUV in 2023) and 2027 where one is only just rated (the Rivian R2, so far
published only in Performance AWD trim).

## Layout

```
index.html      markup
styles.css      all styling; light and dark palettes as CSS custom properties
src/data.js     vehicle table + fuel-price presets — the file to edit
src/app.js      state, math, rendering, persistence
tools/fetch-epa.py   EPA lookup helper for refreshing the data
```

## Deploying to GitHub Pages

The site is already static and rooted at `index.html`, so no workflow is
needed. Push the repo, then in **Settings → Pages** set the source to *Deploy
from a branch*, branch `main`, folder `/ (root)`. It publishes at
`https://<user>.github.io/cents-per-mile/`.

All asset paths are relative, so serving from a subpath works without changes.

## License

[MIT](LICENSE) — do what you like with it, keep the copyright notice.

The vehicle ratings are from the EPA's fueleconomy.gov, a work of the US
federal government and therefore in the public domain. The MIT license covers
this code, not those underlying facts.
