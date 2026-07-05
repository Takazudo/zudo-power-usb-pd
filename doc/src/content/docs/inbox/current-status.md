---
title: Project Status and Plan
sidebar_position: 3
---

Current progress and plan for the USB-PD powered modular synthesizer power supply — now in
the **2-board split era** following the v4 diagnosis (epic
[#86](https://github.com/Takazudo/zudo-pd/issues/86)).

## 🎯 Project Goal

**Low-noise power module supplying ±12V/+5V for modular synths from USB-C PD 15V input**

- Protection circuit safe for modular synth beginners
- All parts available from JLCPCB (stable supply, low cost)
- Low-noise design with &lt;1mVp-p ripple
- Easy to use with USB-C PD

## 🔄 Current Phase: 2-Board Split (Diagnosis + Design Docs)

The single-board zudo-pd design (v1 → v4) never reached a working USB-PD negotiation,
across four separate JLCPCB orders. Rather than order a v5 single-board respin, the
project is splitting into two boards:

- **Board A** — a reusable USB-PD sink core (STUSB4500 + USB-C receptacle + load switch +
  NVM programming pads). Cheap to re-order in isolation while the front end is under
  debug, and reusable in other projects.
- **Board B** — the synth power conversion stage (DC-DC converters + linear regulators +
  protection + output connectors). Carries the expensive/bulky parts, only re-ordered
  once the front end is proven stable.

See [Two-Board Plan](../overview/two-board-plan.md) for the full why-split rationale,
[Board A: USB-PD Core](../overview/board-a-usb-pd-core.md) and
[Board B: Synth Power](../overview/board-b-synth-power.md) for the per-board design docs,
and [Board Split Decision](./board-split-decision.md) for the locked front-end fix list
and the Board A ↔ Board B interface contract.

<Note title="What's actually done vs. not started">

Diagnosis and design docs are complete. Confirmed schematic fixes are being applied to
the **existing** KiCad project (the source both new boards derive from) — no new KiCad
projects, PCB layouts, or JLCPCB order files (gerbers/BOM/CPL) exist yet for Board A or
Board B. That is the next plan, gated on the user bench-confirming the root cause on the
dead v4 boards.

</Note>

## Failure History (v1 → v4)

| Rev | Version | Result |
| --- | --- | --- |
| v1 | 0.1.0 | PD failed — pin 18 (VBUS_VS_DISCH) left NC, pin 22 (VSYS) shorted to VREG_2V7 |
| v2 | 0.2.0 | CC1DB believed chip-internal short → external-Rd redesign |
| v3 | 0.3.0 | CC attach worked (5V, I2C alive), pin 18 tied to GND → PD failed |
| v4 | 0.4.0 | Pin 18 fixed, NVM programmed for 15V — **still failed** (see [v4 USB-PD Failure Diagnosis](./v4-pd-failure-diagnosis.md) for the ranked root-cause candidates) |

The v4 order artifacts (schematic + JLCPCB-ready manufacturing files) were confirmed to
have actually reached a real order package — see
[v4 As-Built Order Verification &amp; Footprint Geometry Audit](./v4-asbuilt-audit.md).

## ✅ What's Done

- **Wave 1 (diagnosis):** [v4 USB-PD Failure Diagnosis](./v4-pd-failure-diagnosis.md)
  (#87), [v4 As-Built Audit](./v4-asbuilt-audit.md) (#88),
  [Board B Architecture Review](./board-b-architecture-review.md) (#89)
- **Wave 2 (decision):** [Board Split Decision](./board-split-decision.md) (#90) — locks
  the front-end fix list and the Board A ↔ Board B interface contract
- **Wave 3 (implement, in progress):** Board A design doc, Board B design doc, confirmed
  schematic fixes applied to the KiCad project, and this doc-base housekeeping pass

## 📋 What's Next

- **Wave 4:** confirm pass across the wave-3 outputs, plus a follow-up issue carrying the
  pre-order checklist for Board A / Board B (gerbers, BOM, CPL — explicitly **not**
  started; that is a separate future plan, outside epic #86)
- **User action:** bench-confirm the v4 root cause on the dead v4 boards using the
  [bench discrimination procedure](./v4-pd-failure-diagnosis.md#bench-discrimination-procedure-dead-v4-boards-cheapest-first) —
  this gates several of the locked fixes before the first Board A order

## Versioning

See [Versioning Scheme](./versioning.md) for the full X.Y.Z scheme, including how a
2-board JLCPCB order (Board A + Board B ordered together) is versioned going forward.

## Hardware on Hand

- **NUCLEO-F072RB** (STM32 Nucleo board, USB-to-I2C bridge for STUSB4500 NVM programming)
- **4P 2.54 mm pogo pin clip** (mates with the J2 pogo pads) — see
  [NVM Programming Setup](./nvm-programming.md)
- **PCBA v1–v4 physical boards** — retained for bodge reference and bench diagnosis (the
  [v4 USB-PD Failure Diagnosis](./v4-pd-failure-diagnosis.md) bench procedure runs on the
  dead v4 boards)
