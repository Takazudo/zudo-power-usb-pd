---
name: component-ss34-c8678
description: Resolve exact SS34 (LCSC C8678) Schottky diode limits and application constraints. Use whenever SS34, C8678, MDD/Microdiode Semiconductor, or the board-b D1/D2/D3 catch/freewheeling diode function is relevant, including the -13.5V inverting-rail reverse-voltage margin.
---

# Exact component record

Run the central validator, read every local JSON record, and cite fact/source IDs with
conditions and locators. Preserve `SOURCE UNAVAILABLE` and `UNSOURCED`; never replace
exact-orderable evidence with memory or same-name vendor data. Keep this owner aligned
with its `manifest.json`, `sources.json`, `facts.json`, `coverage.json`,
`routing.json`, `interactions.json`, and `pin-map.json`; its inventory line, direct-routing
fixture, real-pin lock, and any applicable cross-component forward test.

This record owns inventory line `line-c8678` (SS34, MDD (Microdiode Semiconductor),
C8678, SMA_L4.3-W2.6-LS5.2-RD), placed at board-b refdes D1, D2, and D3. `line_id` is
set and `candidate_id` is null.

D1 and D2 are catch/freewheeling diodes on the non-inverting +13.5V and +7.5V
LM2596S-ADJ buck rails; D3 is the catch diode on the -13.5V LM2596S-ADJ inverting
buck-boost rail. Because the inverting topology reverses the diode's blocking-voltage
reference, D3's reverse stress during switch-off is `Vin + |Vout|` rather than `Vin`
alone — see `fact-ss34-d3-reverse-margin` for the calculated margin against the SS34
VRRM rating.

## Human component reference

Human projection of this bundle: [rec-ss34-c8678](/docs/components/records/ss34-c8678/).
See also the [component catalog](/docs/components/catalog/) and [cross-component
rules](/docs/components/integration/).
These pages are generated from this bundle's JSON files and add nothing to them.
