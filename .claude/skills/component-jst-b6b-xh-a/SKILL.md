---
name: component-jst-b6b-xh-a
description: Audit the exact JST B6B-XH-A(LF)(SN) C144397 six-circuit XH board header, placed at zudo-pd board-a J4 and board-b J5 as the locked A-to-B interface connector. Use for pin order, orientation, footprint, ratings, current-derating math, housing, contacts, wire, harness, bring-up, or substitution.
---

# JST B6B-XH-A(LF)(SN) bundle (zudo-pd board-a J4 / board-b J5)

Run the central offline validator, then read all seven local JSON artifacts. This bundle
owns the single standalone record `rec-jst-b6b-xh-a` for inventory line `line-c144397`
(board-a `J4` and board-b `J5`, the two placements of the locked #90 A-to-B interface
connector). Keep the board header distinct from the mating housing, crimp contact, wire,
and completed cable assembly. No complete harness has been selected; do not invent one
from the XH family catalog.

Ported from the zudo-led-lamp bundle `.claude/skills/component-jst-b6b-xh-a/` at led-lamp
commit `e4e2dfd39811ccfba2bb36fb78b0b74a80c6eb1e`. The JST XH catalog facts (manufacturer,
identity, pitch, current, voltage, temperature, dimensions, harness-unselected) are
trusted and carried over unchanged. `interactions.json` and `pin-map.json` are re-derived
for the zudo-pd interface contract: `doc/src/content/docs/inbox/board-split-decision.md`
(Decision set (b), **LOCKED**) fixes ONE pinout table that applies identically at both J4
(board-a) and J5 (board-b) -- pins 1-2 +15V, 3 ATT, 4 PDOK, 5-6 GND -- unlike the led-lamp
port's Board P `JOUT1` / Board L `J2` split, which used different VBUS net names at each
end. This bundle therefore carries a single `pin-map.json` entry (not the led-lamp port's
two board-specific maps), plus a new `fact-jst-b6b-xh-a-locked-contract` fact and a new
`fact-jst-b6b-xh-a-current-derating-math` fact (the latter reusing the unchanged 3 A/contact
`fact-jst-b6b-xh-a-current` figure carried over from led-lamp, per the board-split-decision
math: 2-contact +15V/GND at 80% continuous derating gives 4.8 A derated capacity against
the 3.0 A PD-contract worst case, a 1.6x derated / 2.0x nameplate margin). The `package`
field is zudo-pd's own reviewed value (`CONN-TH_B6B-XH-A-6P`) rather than led-lamp's
`CONN-TH_6P-P2.50_B6B-XH-A-LF-SN` naming; `manufacturer`/`mpn`/`lcsc` are unchanged and
re-verified against `.claude/skills/component-spec-audit/references/inventory.json` line
`line-c144397` -- no identity mismatch was found. J4/J5 are new placements (post
board-split fix), so this connector does not yet appear in any historical JLCPCB order
BOM, and no KiCad symbol or `CONN-TH_B6B-XH-A-6P` footprint has been acquired yet (this
bundle's `pin-map.json` explains that gap explicitly).

Use the official JST XH catalog for the 2.50 mm six-circuit top-entry header identity,
dimensions, and series-level ratings. Use `pin-map.json` only for the current board-a
J4/board-b J5 signal assignment. Before interconnecting boards, verify header pin 1 on
both PCBs, cable end-to-end mapping, duplicate power/ground conductors, contact retention,
wire gauge/current suitability, and absence of swaps or shorts. The XH shrouded housing is
mechanically polarized (reversed insertion blocked) and the 6-pin XH is the only
6-position XH on either board (board-b's Eurorack outputs are 2x8 shrouded IDC; Faston
tabs are physically incompatible), so the cable cannot mate to a wrong header -- but that
guarantee does not extend to a miswired cable's internal conductor mapping.

## Human component reference

zudo-pd does not yet generate per-record component pages, so there is no
`/docs/components/records/` projection of this bundle. Where any future human-facing page
disagrees with this bundle's JSON files, the JSON bundle is correct. See also the
[Board A overview](/docs/overview/board-a-usb-pd-core) and the
[board-split decision](/docs/inbox/board-split-decision) (Decision set (b), the locked
connector/pinout/current-rating/keying contract this bundle asserts).
