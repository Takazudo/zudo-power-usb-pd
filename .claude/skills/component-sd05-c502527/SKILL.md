---
name: component-sd05-c502527
description: Resolve exact MDD SD05 (LCSC C502527) TVS limits, the +5V-rail 0% standoff-margin BLOCKER, and the TVS2 replacement-candidate evidence. Use whenever SD05, C502527, board-b TVS2, the +5V output overvoltage clamp, or the SMF6.0A/SMAJ6.5A/SMAJ6.0A replacement candidates are relevant.
---

# Exact component record

Run the central validator, read every local JSON record, and cite fact/source IDs with
conditions and locators. Preserve `SOURCE UNAVAILABLE` and `UNSOURCED`; never replace
exact-orderable evidence with memory or same-name vendor data (the MDD SD05 is not the
Semtech SD05, and each replacement candidate is its own exact orderable). Keep this
owner aligned with its `manifest.json`, `sources.json`, `facts.json`, `coverage.json`,
`routing.json`, `interactions.json`, and `pin-map.json`; its inventory line,
direct-routing fixture, and any applicable cross-component forward test.

This record owns inventory line `line-c502527` (SD05, MDD (Microdiode Semiconductor),
C502527, SOD-323_L1.8-W1.3-LS2.5-FD), placed at board-b refdes TVS2 on the +5 V output
rail. `line_id` is set and `candidate_id` is null on that record.

**BLOCKER:** the SD05 VRWM is 5.0 V, exactly the nominal +5 V rail — a deterministic
0 V / 0% standoff margin (`fact-sd05-plus5-margin`,
`fact-sd05-plus5-margin-percent`, `int-sd05-plus5-rail-blocker`). This bundle
therefore also owns three researched TVS2 replacement candidates as candidate records
(`line_id` null, `candidate_id` set), registered in
`component-spec-audit/references/candidates.json`:

- `cand-smf6-0a-c123790` — MDD SMF6.0A, SOD-123FL, VRWM 6 V, VC 10.3 V at 19.4 A
- `cand-smaj6-5a-c87267` — Brightking SMAJ6.5A (orderable SMAJ6.5A/TR13), SMA, VRWM 6.5 V, VC 11.2 V at 35.7 A
- `cand-smaj6-0a-c5353156` — FOSAN SMAJ6.0A, SMA, VRWM 6.0 V, VC 10.3 V at 38.8 A

Deterministic shortlist criteria: VRWM >= 6.0 V, low clamp at rated IPP,
hand-reworkable/JLCPCB-assemblable two-pad package, LCSC in stock at the dated
research retrieval. Selection between them happens in the wave-6 decision task, not
in this bundle.

## Human component reference

Human projection of this bundle: [rec-sd05-c502527](/docs/components/records/sd05-c502527/).
See also the [component catalog](/docs/components/catalog/) and [cross-component
rules](/docs/components/integration/).
These pages are generated from this bundle's JSON files and add nothing to them.
