---
name: component-lm2596s-adj-c347423
description: Resolve exact UMW LM2596S-ADJ (LCSC C347423) limits, feedback setpoints, ON/OFF behavior, thermal data, and the U4 inverting buck-boost stress chain. Use whenever LM2596S-ADJ, C347423, the board-b U2/U3/U4 DC-DC converters, their pins, package, substitution, bring-up, or bench behavior is relevant.
---

# Exact component record

Run the central validator, read every local JSON record, and cite fact/source IDs with
conditions and locators. Preserve `SOURCE UNAVAILABLE` and `UNSOURCED`; never replace
exact-orderable evidence with memory or same-name vendor data (TI's LM2596 datasheet is
NOT a source for this UMW orderable). Keep this owner aligned with its `manifest.json`,
`sources.json`, `facts.json`, `coverage.json`, `routing.json`, `interactions.json`, and
`pin-map.json`; its inventory line, direct-routing fixture, real-pin lock, and any
applicable cross-component forward test.

This bundle owns inventory line `line-c347423` (board-b U2/U3/U4). U4 runs the
manufacturer-documented inverting buck-boost configuration: the device GND pin, ON/OFF
pin, and package tab ride at the -13.5V output rail, so the effective device input is
VIN + |VOUT| (`fact-lm2596-u4-effective-input`, 28.5 V) against the 45 V absolute
maximum and 40 V operating maximum (`fact-lm2596-u4-absmax-margin`,
`fact-lm2596-u4-operating-margin`).

## Human component reference

Human projection of this bundle:
[rec-lm2596s-adj-c347423](/docs/components/records/lm2596s-adj-c347423/). See also the
[component catalog](/docs/components/catalog/) and [cross-component
rules](/docs/components/integration/). These pages are generated from this bundle's
JSON files and add nothing to them.
