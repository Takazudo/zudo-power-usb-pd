---
name: component-l7812cd2t-c13456
description: Resolve exact L7812CD2T (LCSC C13456) +12 V linear regulator limits and application constraints. Use whenever L7812CD2T, C13456, board-b U6, its dropout/headroom bench gate, pins, package, thermal data, substitution, bring-up, or bench behavior is relevant.
---

# Exact component record

Run the central validator, read every local JSON record, and cite fact/source IDs with
conditions and locators. Preserve `SOURCE UNAVAILABLE` and `UNSOURCED`; never replace
exact-orderable evidence with memory or same-name vendor data. Keep this owner aligned
with its `manifest.json`, `sources.json`, `facts.json`, `coverage.json`,
`routing.json`, `interactions.json`, and `pin-map.json`; its inventory line or
candidate entry, direct-routing fixture, real-pin lock, and any applicable
cross-component forward test.

This record owns inventory line `line-c13456` (board-b U6, fitted). It is the
C-series 12 V type: do not borrow facts from the L7812AB/L7812AC precision series or
from other-vendor 7812 parts - they have different guarantee bands and temperature
ranges. The `dropout-operating-point` domain is OPEN on purpose: the project's
bench-gated Board-B blocker (13.5 V rail -> 12 V @ 1.2 A vs 2 V typ dropout at 1 A)
must be closed on the bench, not from this bundle.

## Human component reference

Human projection of this bundle:
[rec-l7812cd2t-c13456](/docs/components/records/l7812cd2t-c13456/).
See also the [component catalog](/docs/components/catalog/) and
[cross-component rules](/docs/components/integration/).
These pages are generated from this bundle's JSON files and add nothing to them.
