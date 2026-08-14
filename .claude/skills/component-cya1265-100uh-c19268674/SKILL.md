---
name: component-cya1265-100uh-c19268674
description: Resolve exact CYA1265-100UH (LCSC C19268674) power inductor limits and application constraints. Use whenever CYA1265-100UH, C19268674, SHOU HAN, or the board-b L1/L2/L3 DC-DC converter inductor function is relevant, including computed ripple current vs Isat/Idc margin for the three LM2596S-ADJ rails.
---

# Exact component record

Run the central validator, read every local JSON record, and cite fact/source IDs with
conditions and locators. Preserve `SOURCE UNAVAILABLE` and `UNSOURCED`; never replace
exact-orderable evidence with memory or same-name vendor data. Keep this owner aligned
with its `manifest.json`, `sources.json`, `facts.json`, `coverage.json`,
`routing.json`, `interactions.json`, and `pin-map.json`; its inventory line, direct-routing
fixture, real-pin lock, and any applicable cross-component forward test.

This record owns inventory line `line-c19268674` (CYA1265-100UH, SHOU HAN, C19268674,
IND-SMD_L13.8-W12.8), placed at board-b refdes L1, L2, and L3 — the energy-storage
inductors for the three LM2596S-ADJ DC-DC converters (+13.5V, +7.5V, -13.5V rails).
`line_id` is set and `candidate_id` is null.

The manufacturer datasheet rates this part by "Idc" (heat rating current, causes
~40C rise) and "Isat" (saturation current, causes ~30% inductance drop) — it does not
separately label an "Irms" rating; its own notes state the rated current is whichever
of those two is lower. `fact-cya1265-ripple-*` compute the peak-to-peak inductor ripple
current for each of the three rails (VIN=15V, VOUT=13.5V/7.5V/-13.5V, f=150kHz) and
compare it against Isat/Idc.

## Human component reference

Human projection of this bundle: [rec-cya1265-100uh-c19268674](/docs/components/records/cya1265-100uh-c19268674/).
See also the [component catalog](/docs/components/catalog/) and [cross-component
rules](/docs/components/integration/).
These pages are generated from this bundle's JSON files and add nothing to them.
