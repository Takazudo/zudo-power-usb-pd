---
name: component-cj7912-c94173
description: Resolve exact CJ7912 (LCSC C94173) -12V negative linear regulator limits and application constraints. Use whenever CJ7912, C94173, JSCJ, board-b U8, the -13.5V rail headroom, dropout, output-capacitor stability, pins, TO-252 package, thermal data, substitution, bring-up, or bench behavior is relevant.
---

# Exact component record

Run the central validator, read every local JSON record, and cite fact/source IDs with
conditions and locators. Preserve `SOURCE UNAVAILABLE` and `UNSOURCED`; never replace
exact-orderable evidence with memory or same-name vendor data. Keep this owner aligned
with its `manifest.json`, `sources.json`, `facts.json`, `coverage.json`,
`routing.json`, `interactions.json`, and `pin-map.json`; its inventory line or
candidate entry, direct-routing fixture, real-pin lock, and any applicable
cross-component forward test.

This record owns inventory line `line-c94173` (board-b U8, fitted). The electrical
authority is the JSCJ (Jiangsu Changjing Electronics Technology) CJ7912 TO-252-2L
Rev 2.0 datasheet retrieved from the manufacturer's own site - do NOT borrow
LM7912/MC7912/L7912 or any other vendor's 7912-family numbers; guarantee bands,
dropout, and thermal figures differ. Three domains are OPEN on purpose:

- `dropout-operating-point`: the -13.5V project rail is 1.0V outside the guaranteed
  `-14.5V <= Vi <= -27V` band and dropout is a 1.1V typical at 1A with no maximum -
  bench gate.
- `output-capacitor-esr-stability`: CJ specifies only Ci=2.2uF / Co=1uF with no ESR
  window; the project 470nF/470uF input and 100nF/470uF output networks are bench-gated.
- `thermal-to252`: only free-air RthJA 100 degC/W is published; 1.2W at the rated
  0.8A computes to a 120 degC rise - Board B copper must lower effective theta-JA,
  verified thermally on the real board.

## Human component reference

Human projection of this bundle:
[rec-cj7912-c94173](/docs/components/records/cj7912-c94173/).
See also the [component catalog](/docs/components/catalog/) and
[cross-component rules](/docs/components/integration/).
These pages are generated from this bundle's JSON files and add nothing to them.
