---
name: component-smaj15a-c571368
description: Resolve exact High Diode SMAJ15A (LCSC C571368) TVS limits and the +/-12V output-rail standoff-margin math. Use whenever SMAJ15A, C571368, board-b TVS1/TVS3, the +/-12V output overvoltage clamps, their pins, package, substitution, or bring-up behavior is relevant.
---

# Exact component record

Run the central validator, read every local JSON record, and cite fact/source IDs with
conditions and locators. Preserve `SOURCE UNAVAILABLE` and `UNSOURCED`; never replace
exact-orderable evidence with memory or same-name vendor data (SMAJ15A is not SMAJ20A,
and High Diode is not any other SMAJ vendor). Keep this owner aligned with its
`manifest.json`, `sources.json`, `facts.json`, `coverage.json`, `routing.json`,
`interactions.json`, and `pin-map.json`; its inventory line, direct-routing fixture,
and any applicable cross-component forward test.

This record owns inventory line `line-c571368` (SMAJ15A, High Diode, C571368,
D-FLAT_L4.3-W2.6-LS5.3-RD), placed at board-b refdes TVS1 (+12 V output rail) and TVS3
(-12 V output rail). `line_id` is set and `candidate_id` is null.

The standoff-margin math against the nominal 12 V rail magnitude is recorded as
calculated facts (`fact-smaj15a-margin-plus12`: 3 V; `fact-smaj15a-margin-percent`:
25%). The retained primary datasheet gives VWM 15 V for SMAJ15A, so the margin at
nominal is 25%, not the 0% the planning sub-issue text assumed; acceptability under
rail tolerance and ripple is judged by the review and decision waves, not here.
TVS3's unidirectional orientation on the -12 V rail remains an open domain until the
board-b generator spec exists.

## Human component reference

Human projection of this bundle: [rec-smaj15a-c571368](/docs/components/records/smaj15a-c571368/).
See also the [component catalog](/docs/components/catalog/) and [cross-component
rules](/docs/components/integration/).
These pages are generated from this bundle's JSON files and add nothing to them.
