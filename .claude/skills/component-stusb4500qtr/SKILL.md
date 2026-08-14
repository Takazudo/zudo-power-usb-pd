---
name: component-stusb4500qtr
description: Audit the exact STUSB4500QTR USB-PD sink controller placed at zudo-pd board-a U1. Use for USB-PD negotiation, USB-C, CC termination, NVM, pin, reset, protection, DNP, bring-up, or substitution work on Board A.
---

# STUSB4500QTR bundle (zudo-pd board-a)

Run the central offline validator, then read all seven local JSON artifacts. This bundle
owns the single standalone record `rec-stusb4500qtr` for inventory line `line-c2678061`
(board-a `U1`). Cite source and fact IDs with their conditions and locators.

Ported from the zudo-led-lamp bundle
`.claude/skills/component-stusb4500qtr/` at led-lamp commit
`e4e2dfd39811ccfba2bb36fb78b0b74a80c6eb1e`. The led-lamp facts, sources, and pin map are
trusted and carried over; `interactions.json` and the board-facing facts are re-derived
for the zudo-pd board-a netlist. The led-lamp bundle's PESD24VS1UB and external-Rd
subordinate records stayed behind: in zudo-pd those orderables belong to the
`component-pesd24vs1ub-c85382` and `component-project-passives` owners.

Exact DS12499 Rev 8 and UM2650 Rev 3 bytes are reproducibly retained as
`MANUFACTURER_MIRROR`. Their dependent controller claims remain `UNSOURCED` under the
primary-only trust policy; programmed and as-built state remain open. Direct
manufacturer-primary retrieval attempts from st.com were made on 2026-08-02 (led-lamp
lane: every st.com path timed out and a community.st.com mirror redirected to its forum
homepage) and again on 2026-08-14 for this bundle (direct curl: HTTP/2 to the canonical
DS12499 path failed with a stream error, and HTTP/1.1 retries of the DS12499 PDF, UM2650
PDF, and product page all timed out with 0 bytes while control fetches to other domains
returned HTTP 200). Both sources stay `MANUFACTURER_MIRROR`/`SOURCE UNAVAILABLE` at
primary and every dependent verdict stays `UNSOURCED`. Do not re-attempt from memory or
treat these dated failures as permanent; a future session may retry the same URLs.

Pin 23 (VREG_2V7) is documented decoupling-only, but board-a loads it with R15/R16 4.7k
I2C pull-ups and exposes it on debug pogo pad J3.3 (net `U1.23 C30.2 R15.2 R16.2 J3.3`,
fact `fact-stusb-vreg2v7-load`). This is an explicit open coverage item
(`cov-stusb-vreg2v7-load`) requiring a manufacturer-primary locator authorizing external
DC loading of this pin, or a re-route decision, plus confirmation that the
NVM-programming jig's logic levels match 2.7 V; it must close before any Board A
NVM-programming bench work begins.

For controller work, separate unpowered/dead-battery, reset, configuration-load, normal
attached, explicit-contract, fault/recovery, and disconnect states. Treat open-drain `0`
as asserted and Hi-Z as deasserted. Do not infer the programmed NVM image: require a
normalized 40-byte artifact, byte-for-byte readback, reset reload, full power-cycle
reload, and negotiated-output bench evidence. Record the as-received factory image before
any write. Check the current ST endurance limit before authorizing repeated writes; the
retained record deliberately leaves endurance open.

Provision only with a current-limited source that satisfies the documented VDD operating
range (board-a grounds VSYS, so supply is VDD-only) and with a common-ground I2C
programmer using the J2 pogo interface. Keep the J4 load disconnected for first power and
verify VBUS, gate polarity, discharge timing, CC state, and fault registers in stages.
Volatile register edits are not persistent NVM proof.

Apply the netlist assertions in `interactions.json` exactly — they assert the zudo-pd
board-a fixed circuit (pin-18 `VBUS_IN -> R14 470R -> U1.18`, CCDB-to-CC 0R links via
R19/R20, R17/R18 external Rd DNP, the Q1 gate network, and the J4 ATT/PDOK open-drain
contract), not the led-lamp board-p netlist. A deterministic wrong pin, missing series
discharge resistor, wrong PMOS polarity, or unsafe voltage is a blocker; state-dependent
negotiation, timing, thermal behavior, ESD performance, and as-built NVM contents require
bench evidence.

## Human component reference

The hand-authored `components/stusb4500.md` page was deleted in the
components-docs-restructure purge (#136); its content moved into the
[Board A overview](/docs/overview/board-a-usb-pd-core) (net table this bundle's
interactions assert). Other human-facing references are the
[STUSB4500 pinout guide](/docs/inbox/stusb4500-pinout) and the
[NVM programming setup](/docs/inbox/nvm-programming). Where any of those disagree with
this bundle's JSON files, the JSON bundle is correct.
