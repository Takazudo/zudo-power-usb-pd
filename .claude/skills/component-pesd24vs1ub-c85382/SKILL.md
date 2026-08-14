---
name: component-pesd24vs1ub-c85382
description: Resolve exact Nexperia PESD24VS1UB (LCSC C85382) ESD-diode limits and the board-a D6/D7 CC-line DNP provision state. Use whenever PESD24VS1UB, C85382, CC-line ESD protection, the SOD-523 provision footprint, or the D6/D7 layout-phase fitting decision is relevant.
---

# Exact component record

Run the central validator, read every local JSON record, and cite fact/source IDs with
conditions and locators. Preserve `SOURCE UNAVAILABLE` and `UNSOURCED`; never replace
exact-orderable evidence with memory or same-name vendor data. Keep this owner aligned
with its `manifest.json`, `sources.json`, `facts.json`, `coverage.json`,
`routing.json`, `interactions.json`, and `pin-map.json`; its inventory line,
direct-routing fixture, and any applicable cross-component forward test.

This record owns inventory line `line-c85382` (PESD24VS1UB, Nexperia, C85382,
SOD-523), placed at board-a refdes D6 and D7 on the CC1/CC2 lines — **both placements
are DNP layout-phase provisions** (`fact-pesd24vs1ub-dnp-provision`; open domain
`cc-line-fitting-decision`). `line_id` is set and `candidate_id` is null. The LCSC
orderable model is PESD24VS1UB,115 (tape/reel packing suffix on the datasheet part).

Key primary-confirmed ratings from the 2026-08-06 Nexperia data sheet: VRWM 24 V,
VBR 26.5-27.5 V at 5 mA, VCL 36 V at 1 A / 70 V at 3 A (8/20 us), PPPM 160 W,
23 kV IEC 61000-4-2 contact, Cd 50 pF max. Pin 1 = K cathode (marking bar),
pin 2 = A anode.

## Human component reference

Human projection of this bundle: [rec-pesd24vs1ub-c85382](/docs/components/records/pesd24vs1ub-c85382/).
See also the [component catalog](/docs/components/catalog/) and [cross-component
rules](/docs/components/integration/).
These pages are generated from this bundle's JSON files and add nothing to them.
