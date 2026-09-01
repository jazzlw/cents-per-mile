#!/usr/bin/env python3
"""Look up EPA combined fuel-economy ratings from fueleconomy.gov.

Used to source and re-check every number in src/data.js. No dependencies
beyond curl and the standard library.

    ./tools/fetch-epa.py 2026 Toyota Prius
    ./tools/fetch-epa.py 2026 Tesla "Model Y"
    ./tools/fetch-epa.py --models 2026 Hyundai

The model argument is a case-insensitive substring, so a partial name lists
every matching trim. Electric vehicles print kWh/100mi (the value data.js
stores) alongside the derived mi/kWh; gas vehicles print combined MPG and the
required fuel grade.
"""

import json
import subprocess
import sys
import urllib.parse

BASE = "https://www.fueleconomy.gov/ws/rest/vehicle"


def get(url):
    out = subprocess.run(
        ["curl", "-s", "--max-time", "30", "-H", "Accept: application/json", url],
        capture_output=True, text=True,
    ).stdout
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return None


def items(payload):
    """The service returns a bare object for one result and a list for many."""
    if not payload:
        return []
    item = payload.get("menuItem")
    if item is None:
        return []
    return [item] if isinstance(item, dict) else item


def models(year, make):
    q = urllib.parse.urlencode({"year": year, "make": make})
    return [x["text"] for x in items(get(f"{BASE}/menu/model?{q}"))]


def options(year, make, model):
    q = urllib.parse.urlencode({"year": year, "make": make, "model": model})
    return [(x["text"], x["value"]) for x in items(get(f"{BASE}/menu/options?{q}"))]


def describe(year, make, needle):
    matches = [m for m in models(year, make) if needle.lower() in m.lower()]
    if not matches:
        print(f"no model matching '{needle}' for {year} {make}", file=sys.stderr)
        return 1
    for model in matches:
        for trim, vid in options(year, make, model):
            rec = get(f"{BASE}/{vid}")
            if not rec:
                continue
            comb, comb_e = rec.get("comb08"), rec.get("combE")
            head = f"{year} {make} {model}  [{trim}]  id={vid}"
            if comb_e and float(comb_e) > 0:
                print(f"{head}\n    {float(comb_e):.4f} kWh/100mi "
                      f"= {100 / float(comb_e):.2f} mi/kWh   (MPGe {comb})")
            else:
                print(f"{head}\n    {comb} MPG combined   (fuel: {rec.get('fuelType')})")
    return 0


def main(argv):
    if len(argv) >= 2 and argv[0] == "--models":
        year, make = argv[1], argv[2]
        print("\n".join(models(year, make)))
        return 0
    if len(argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2
    return describe(argv[0], argv[1], " ".join(argv[2:]))


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
