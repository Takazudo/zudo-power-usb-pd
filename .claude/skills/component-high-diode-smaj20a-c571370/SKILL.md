---
name: component-high-diode-smaj20a-c571370
description: Audit the exact High Diode SMAJ20A C571370 TVS placed at zudo-pd board-a D5 (VBUS_IN surge/overvoltage clamp). Use for surge protection, polarity, standoff, breakdown, clamp waveform, leakage, package, thermal, bring-up, or substitution.
---

# High Diode SMAJ20A bundle (zudo-pd board-a D5)

Run the central offline validator, then read all seven local JSON artifacts. This bundle
owns the single standalone record `rec-high-diode-smaj20a-c571370` for inventory line
`line-c571370` (board-a `D5`). Reject SMAJ20A tables from Littelfuse, Diodes
Incorporated, Taiwan Semiconductor, or any other vendor. The official High Diode table
confirms 20 V standoff, 22.2-24.5 V breakdown, the conditioned 32.4 V clamp row, leakage,
400 W pulse rating, temperature range, package and cathode band; the stable distributor
mirror binds C571370. Keep each waveform condition attached and do not mix superseded or
other-vendor tables.

Ported from the zudo-led-lamp bundle
`.claude/skills/component-high-diode-smaj20a-c571370/` at led-lamp commit
`e4e2dfd39811ccfba2bb36fb78b0b74a80c6eb1e`. The High Diode datasheet and distributor
identity facts (manufacturer, identity, polarity, standoff, breakdown, clamp, leakage,
thermal, temperature) are trusted and carried over unchanged. `interactions.json` and the
board-facing net fact (`fact-smaj20a-d5-nets`) are re-derived for the zudo-pd board-a
netlist via `src-smaj20a-board-a-baseline` (the same committed
`scripts/schgen/baselines/board-a.json` snapshot cited by `component-stusb4500qtr` and
`component-umw-ao3401a-c347476`): D5.1 (cathode) lands on VBUS_IN and D5.2 (anode) on GND,
the post-#93-fix topology that replaced the removed D4 (USBLC6-2SC6). The `package` field
is zudo-pd's own reviewed value (`D-FLAT_L4.3-W2.6-LS5.3-RD`, the project's SMA-flat TVS
footprint family already used by the sibling SMAJ15A/TVS1/TVS3 parts and cloned for D5
per `board-split-decision.md` #93 item 5) rather than led-lamp's
`SMA_L4.2-W2.6-LS5.3-RD` naming; `manufacturer`/`mpn`/`lcsc` are unchanged and re-verified
against `.claude/skills/component-spec-audit/references/inventory.json` line
`line-c571370` — no identity mismatch was found. D5 is a new placement (post board-split
fix), so it does not yet appear in any historical JLCPCB order BOM.

The current project maps pad 1 as cathode on VBUS_IN and pad 2 as anode on GND (re-verified
here against the project's own `SMAJ20A_C571370` KiCad symbol and
`D-FLAT_L4.3-W2.6-LS5.3-RD` footprint pad numbering, matching the same K/A-to-1/2 pattern
already reviewed for the sibling `component-ss34-c8678` and `SMAJ15A_C571368` parts).
Treat that as a reviewed project assertion, not as-built proof: confirm the D5 incoming
marking, numeric pad mapping, orientation and continuity, and simulate the VBUS_IN
transient with actual source impedance/parasitics before production.

Note for context only (not a validator-tracked fact): the SMAJ20A's 20 V continuous
standoff (VRWM) coincides with the factory-default STUSB4500 PDO3 voltage of 20 V that
`component-umw-ao3401a-c347476`'s `fact-umw-ao3401a-vgs-pdo3-margin` also flags against
Q1's gate — D5 would be operating at its rated standoff ceiling with zero continuous
margin in that same scenario, though its breakdown (22.2-24.5 V) and clamp (32.4 V) stay
above 20 V. This is a companion observation to the epic-investigation finding, not a
separate BLOCKER fact in this bundle.

## Human component reference

zudo-pd does not yet generate per-record component pages, so there is no
`/docs/components/records/` projection of this bundle. Where any future human-facing page
disagrees with this bundle's JSON files, the JSON bundle is correct. See also the
[Board A overview](/docs/overview/board-a-usb-pd-core) and the
[board-split decision](/docs/inbox/board-split-decision) (#93 item 5, the D5 addition).
