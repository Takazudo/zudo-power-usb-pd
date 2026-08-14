---
title: BSMD1206-150-16V - -12V Rail PTC Resettable Fuse
sidebar_position: 14
---

Auto-reset overcurrent protection for the -12V power rail with 1.5A hold current and
16V voltage rating.

- 🔗 [View on JLCPCB: C883133](https://jlcpcb.com/partdetail/C883133)
- 📄 Datasheet: BHFUSE BSMD1206 series (primary-sourced; see `component-ptc-bsmd1206-150-16v-c883133` skill bundle)

## Overview

The BSMD1206-150-16V is a Positive Temperature Coefficient (PTC) resettable fuse that
provides automatic overcurrent protection for the -12V power rail. Placed at board-b
refdes **PTC3**, downstream of U8 (CJ7912 -12V LDO), it is the part actually fitted in
`scripts/schgen/board_b_spec.py` — this page previously described a different part
(JK-nSMD100/16V, C2830246) that was never the fitted component; see
[issue #131](https://github.com/Takazudo/zudo-pd/issues/131).

<Note>

PTCs are non-polarized: they respond to current magnitude, not direction, so the same
part and behavior apply equally on a negative rail.

</Note>

## Part Information

| Parameter                    | Value                                              |
| ----------------------------- | -------------------------------------------------- |
| **JLCPCB Part Number**       | [C883133](https://jlcpcb.com/partdetail/C883133) |
| **Manufacturer Part Number** | BSMD1206-150-16V                                   |
| **Manufacturer**             | BHFUSE                                             |
| **Package**                  | 1206 (F1206 footprint)                             |
| **Type**                     | Resettable Polymeric PTC                           |

## Electrical Specifications

Primary-sourced from the BHFUSE BSMD1206 series datasheet, Electrical Characteristics
(25°C) table, row `BSMD1206-150-16V`.

### Current and Voltage Ratings

| Parameter             | Symbol  | Value | Unit | Conditions                              |
| ---------------------- | ------- | ----- | ---- | ----------------------------------------- |
| **Hold Current**      | I_hold  | 1.5   | A    | Maximum current that will not trip, 25°C still air |
| **Trip Current**      | I_trip  | 3.0   | A    | Minimum current that will trip, 25°C still air |
| **Maximum Voltage**   | V_max   | 16    | V    | Absolute maximum |
| **Maximum Current**   | I_max   | 40    | A    | Maximum fault current withstood at V_max |
| **Power Dissipation** | P_D typ | 1.0   | W    | Tripped-state, 25°C still air (NEEDS BENCH — typical curve, not guaranteed) |

### Resistance Characteristics

| State                              | Resistance | Notes                                    |
| ------------------------------------ | ---------- | ------------------------------------------ |
| **Initial (cold), minimum**        | 0.025 Ω    | Prior to tripping, 25°C, unsoldered      |
| **Post-trip, maximum (R1max)**     | 0.13 Ω     | Measured 1 hour after trip, or after a 260°C/20s reflow |

### Dynamic and Thermal Characteristics

| Parameter                          | Value       | Unit | Conditions                            |
| ------------------------------------ | ----------- | ---- | ---------------------------------------- |
| **Time to trip**                   | 0.3 (max)   | s    | At 8.00A applied fault current, 25°C |
| **Operating ambient temperature**  | -40 to +85  | °C   | Recommended operating range |
| **Max tripped-state surface temp** | 125         | °C   | Absolute maximum |
| **Hold current at 85°C**           | 0.77        | A    | Thermal derating — see margin note below |

<Warning title="85°C hold current sits below the 0.8A rail budget">

At the datasheet's 85°C ambient derating point, `I_hold` falls to **0.77A** — 0.03A
below the -12V rail's 0.8A current budget. At 25°C the part comfortably holds 1.5A
(0.7A / 87% margin over 0.8A). This is a genuine thermal-derating concern flagged by the
wave-5 evidence review (finding BB-8, `fact-ptc3-hold-85c`) and left as a **NEEDS
BENCH** item for the Board B bench plan — enclosure-ambient temperature at the PTC3
location has not been measured. It is not a part-selection blocker on its own (no
higher-hold 16V/1210-or-smaller alternative was identified), just a margin to verify
once Board B has a real enclosure.

</Warning>

## Circuit Integration

### Protection Architecture

```
Layer 1: USB-PD Adapter → Overcurrent protection (input side)
Layer 2: U4 LM2596S-ADJ inverting buck-boost (+15V → -13.5V) → Current limiting
Layer 3: U8 CJ7912 Linear Regulator → Current limiting, thermal shutdown
Layer 4: PTC3 (1.5A hold / 3.0A trip) → Auto-reset overcurrent protection
    ↓
-12V Output to Modules
```

### Circuit Placement

```
U8 (CJ7912) Output ──┬─── PTC3 (1.5A) ───┬─── TVS3 ─── -12V OUT
                     │  BSMD1206-150-16V │   SMAJ15A
                     │                   │   (anode on -12V,
                     │                   │    cathode on GND —
                     │                   │    the locked orientation)
                     │                   └─────GND
                     │
              GND ─── LED4 ─── R9 (1kΩ) ─┘
                   Red status indicator
```

**Connection (per `scripts/schgen/board_b_spec.py`):**

- `Net-(U8-OUT)`: `U8.3` (OUT), `C19.1`, `C25.2`, `R9.1`, `PTC3.1`
- `-12V rail`: `PTC3.2`, `TVS3.2`, `J6.1`, `J6.2`, `J10.15`, `J10.16`, `J11.15`, `J11.16`

## Voltage Margin on the -12V Rail

```
V_max (this part):  16 V
Rail nominal:        12 V  (magnitude)
Margin:              4 V   (33% headroom)
```

This is the tightest voltage margin of board-b's three PTCs (PTC1 and PTC2 both carry
larger headroom against their respective rails), though it does not by itself account
for switching-rail ripple or clamp-event transients on the -13.5V intermediate rail
upstream of U8.

## Comparison to the Other Rail PTCs

| Feature       | -12V PTC (PTC3, this part) | +12V PTC (PTC1)          | +5V PTC (PTC2)     |
| -------------- | --------------------------- | -------------------------- | --------------------- |
| Part           | BSMD1206-150-16V (C883133) | SMD1210P150TF/16 (C7529589) | mSMD110-33V (C70119) |
| Hold current   | 1.5 A                        | 1.5 A                       | 1.1 A                 |
| Voltage rating | 16 V                         | 16 V                        | 33 V                  |
| Package        | 1206                         | 1210                        | 1812                  |
| Regulator max  | 1 A (CJ7912)                 | 1.5 A (L7812CD2T)           | 1.5 A (L7805ABD2T)    |

## Bill of Materials

| Designator | Part               | Package | JLCPCB Part # | Qty |
| ----------- | ------------------- | ------- | -------------- | --- |
| PTC3        | BSMD1206-150-16V   | 1206    | C883133        | 1   |

## Related Components

- **Protected circuit**: CJ7912 (U8) — -12V Linear Regulator
- **Upstream**: LM2596S-ADJ (U4) — -13.5V DC-DC Converter (inverting buck-boost)
- **Overvoltage protection**: SMAJ15A (TVS3), locked orientation anode on -12V / cathode on GND
- **Parallel rails**: PTC +12V ([SMD1210P150TF/16](./ptc-12v.md), C7529589), PTC +5V ([mSMD110-33V](./ptc-5v.md), C70119)

## References

- [Board B — Synth Power Conversion](../overview/board-b-synth-power.md) — Protection
  Stage table and net connectivity
- `scripts/schgen/board_b_spec.py` — the spec module that places and nets PTC3
- `.claude/skills/component-ptc-bsmd1206-150-16v-c883133` — full primary-sourced
  evidence bundle for this part
- **JLCPCB Part Page**: https://jlcpcb.com/partdetail/C883133
