---
name: component-umw-ao3401a-c347476
description: Audit the exact UMW AO3401A C347476 P-channel load-switch MOSFET placed at zudo-pd board-a Q1. Use for gate polarity, pinout, ratings, SOA, thermal behavior, the 20V-PD-contract Vgs exposure, bring-up, or substitution decisions.
---

# UMW AO3401A bundle (zudo-pd board-a Q1)

Run the central offline validator, then read all seven local JSON artifacts. This bundle
owns the single standalone record `rec-umw-ao3401a-c347476` for inventory line
`line-c347476` (board-a `Q1`). Cite source and fact IDs with their conditions and
locators. Reject AO3401A data from Alpha & Omega or any other same-name vendor; the
central inventory's manufacturer alias for this exact orderable is `UMW` (Youtai
Semiconductor).

Ported from the zudo-led-lamp bundle `.claude/skills/component-umw-ao3401a-c347476/` at
led-lamp commit `e4e2dfd39811ccfba2bb36fb78b0b74a80c6eb1e`. The UMW datasheet facts
(pinout, VDS/VGS/current absolute maximums, RDS(on), threshold, body diode, thermal, SOA)
are trusted and carried over unchanged. `interactions.json` and the board-facing facts are
re-derived for the zudo-pd board-a netlist: the led-lamp bundle's Board P generator source
and its Board-P-specific project-nets fact stayed behind, replaced here by
`src-ao3401a-board-a-baseline` (the committed `scripts/schgen/baselines/board-a.json`
net-connectivity snapshot) and `src-ao3401a-usb-pd-input-sch` (the committed
`usb-pd-input.kicad_sch`, which already carries R11=100k, R12=56k and the AO3401A_C347476
symbol on Q1). The `package` field is zudo-pd's own reviewed value
(`SOT-23_L2.9-W1.3-P1.90-LS2.4-BR`, matching the led-lamp value) and `manufacturer` is
corrected to the central inventory's short alias `UMW` (led-lamp used the longer
`UMW (Youtai Semiconductor)`); both are re-verified against
`.claude/skills/component-spec-audit/references/inventory.json` line `line-c347476`, and
LCSC C347476 also appears against Q1 (footprint `SOT-23_L2.9-W1.3-P1.90-LS2.4-BR`) in the
v0.4.0 JLCPCB order BOM (`jlcpcb-order-snapshots/v0_4_0/used-for-order/BOM-zudo-pd.csv`),
so no identity mismatch was found.

Pin 1 is gate, pin 2 source, and pin 3 drain for this exact UMW document (re-verified here
against the project's own `AO3401A_C347476` KiCad symbol and
`SOT-23_L2.9-W1.3-P1.90-LS2.4-BR` footprint pad numbering). Threshold voltage only
describes the low-current onset test; use the documented RDS(on) drive conditions for
conduction reasoning. Q1 source is at VBUS_IN and drain is at VBUS_OUT (the future board-a
J4 +15V pins); the gate node (Net-(Q1-G)) is driven through R12 (56 kOhm) from the
STUSB4500 VBEN (U1.16) and pulled to VBUS_IN through R11 (100 kOhm) for default-off, with
C35 providing RC soft-start (see `component-stusb4500qtr` for the U1-side drive detail).

**20V-PD-contract Vgs exposure (epic-investigation finding, recorded here only as
numbers):** a factory-default, unreprogrammed STUSB4500 advertises PDO3 = 20 V with
highest priority (`doc/src/content/docs/inbox/nvm-programming.md`). With VBEN asserted and
VBUS_IN at 20 V, the R11/R12 divider puts the Q1 gate at Vgs is approximately -12.82 V —
about 0.82 V past the AO3401A's +/-12 V gate absolute maximum
(`fact-umw-ao3401a-vgs-pdo3-margin`, verdict `BLOCKER - deterministic spec violation`).
This bundle does not decide the provision (NVM reprogram-before-first-attach gate, a
resistor-value change, an added clamp/limiter, or another mitigation) — that is a wave-6
decision-task output.

The 150 kOhm/56 kOhm/100 kOhm drive path, gate capacitance, continuous load, transient
inrush, body diode, SOA, and thermal rise still require staged bench checks; package
current headline values do not replace SOA/thermal analysis. A Board A generator spec
(`scripts/schgen/board_a_spec.py`) does not exist yet, so KiCad symbol/footprint parity
against a generated netlist is unchecked (staged mode) until that spec and the Board A
project exist.

## Human component reference

zudo-pd does not yet generate per-record component pages, so there is no
`/docs/components/records/` projection of this bundle. Where any future human-facing page
disagrees with this bundle's JSON files, the JSON bundle is correct. See also the
[Board A overview](/docs/overview/board-a-usb-pd-core) (net table this bundle's
interactions assert) and the [board-split decision](/docs/inbox/board-split-decision) for
the locked A-to-B interface contract.
