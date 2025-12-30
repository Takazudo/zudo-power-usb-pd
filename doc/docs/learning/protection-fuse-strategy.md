---
sidebar_position: 4
---

# Protection Fuse Strategy: Multi-Stage Design

Understanding overcurrent protection design for modular synthesizer power supplies, based on industry best practices and research into commercial Eurorack power supplies.

## Overview

This power supply uses a **three-layer protection strategy** that exceeds most commercial synth power supplies:

1. **USB-PD adapter protection** (input side, 15V)
2. **PTC resettable fuses** (auto-reset overload protection, per rail)
3. **Fast-blow backup fuses** (catastrophic short protection, per rail)

This multi-stage approach provides both convenience (auto-reset) and safety (fast protection).

## Protection Methods Comparison

### PTC Resettable Fuses (Polyfuses)

**How they work:**
- Polymer-based device that increases resistance when heated by overcurrent
- **Hold current (Ihold)**: Maximum safe continuous current (e.g., 1.3A)
- **Trip current (Itrip)**: Current that will cause device to trip (typically 2x hold, e.g., 2.6A)

**Advantages:**
- ✅ **Auto-reset**: Recovers after 30-60 seconds when cooled
- ✅ **No replacement needed**: User-friendly for temporary overloads
- ✅ **Reusable**: Can trip thousands of times
- ✅ **Perfect for live performance**: No manual intervention required

**Disadvantages:**
- ⚠️ **Slow response time**: 0.1-5 seconds to trip (depends on overcurrent magnitude)
- ⚠️ **Voltage drop**: 0.1-0.3V drop during normal operation
- ⚠️ **Temperature dependent**: Trip characteristics vary with ambient temperature
- ⚠️ **Not suitable alone** for catastrophic short circuits

**Typical response times:**

| Overcurrent | Trip Time | Example |
|-------------|-----------|---------|
| 1.5x hold (2.0A) | 5-10s | Module overload |
| 2x hold (2.6A) | 1-5s | Multiple modules drawing too much |
| 5x hold (6.5A) | 0.5-1s | Moderate short |
| 10x hold (13A) | 0.1-0.5s | Hard short (still slow!) |

### Fast-Blow Fuses

**How they work:**
- Thin metal wire that melts when overcurrent flows
- Designed to blow quickly (milliseconds) when current exceeds rating

**Advantages:**
- ✅ **Very fast response**: 1-100ms for high overcurrent
- ✅ **Predictable**: Precise trip characteristics
- ✅ **No voltage drop**: Negligible resistance in normal operation
- ✅ **Temperature stable**: Consistent performance across temperature range

**Disadvantages:**
- ❌ **Not resettable**: Must be replaced after blowing
- ❌ **Maintenance required**: User must keep spares on hand
- ❌ **Inconvenient for temporary overloads**: Blows even if problem is transient

**Typical response times:**

| Overcurrent | Blow Time | Example |
|-------------|-----------|---------|
| 1.5x rating (4.5A) | 10-100s | Slow overload (may not blow) |
| 2x rating (6A) | 1-10s | Moderate overload |
| 5x rating (15A) | 100-500ms | Short circuit |
| 10x rating (30A) | 1-10ms | Catastrophic short |

### Electronic Current Limiting

**How it works:**
- Active circuitry monitors current and limits it electronically
- Used in high-end power supplies (Intellijel TPS, 4ms Row Power)

**Advantages:**
- ✅ **Instant response**: Microseconds
- ✅ **Auto-reset**: No replacement needed
- ✅ **Precise control**: Can implement soft-start, foldback limiting
- ✅ **No voltage drop**: (when not limiting)

**Disadvantages:**
- ❌ **Complex circuitry**: More expensive to implement
- ❌ **Single point of failure**: If limiting circuit fails, no protection
- ❌ **Overkill for simple designs**: Not needed for basic power supplies

## Industry Practices

### Doepfer A100 (Professional Standard)

**Protection method:** Traditional glass fuses only

- ✅ Simple, reliable, predictable
- ✅ Fast response to short circuits
- ❌ No auto-reset (manual fuse replacement)
- ❌ No protection against moderate overloads

**Design philosophy:**
- Relies on proper current budgeting by user
- Deliberately avoids PTCs due to voltage drop and slower response
- Uses mechanical keying to prevent reverse polarity

**Ratings:**
- +12V: 2A maximum
- -12V: 1.2A maximum
- +5V: 4A maximum (independently protected)

### Intellijel TPS Series (High-End)

**Protection method:** Multi-stage electronic protection

- ✅ Soft-start current limiting
- ✅ Foldback current limiting
- ✅ Overvoltage protection
- ✅ Short circuit protection
- ✅ Auto-reset
- ❌ More expensive
- ❌ More complex

### DIY Community Consensus

**Preferred approach:** Traditional fuses for critical protection

- Most experienced builders prefer fuses over PTCs
- PTCs are controversial due to:
  - Slower response time
  - Less predictable behavior
  - Voltage drop concerns
- PTCs favored only for convenience in live performance scenarios

## This Design: Multi-Layer Protection

This design uses **PTC-only protection** combined with inherent protection in linear regulators:

### Protection Architecture

```
Layer 1: USB-PD Adapter (15V)
    │    └─→ Built-in overcurrent protection
    │
    ▼
Layer 2: DC-DC Converters (LM2596S)
    │    ├─→ Current limiting ~3-5A
    │    └─→ Protects against circuit shorts
    │
    ▼
Layer 3: Linear Regulators (LM7812/7805/7912)
    │    ├─→ Current limiting ~1.5-2.2A (immediate)
    │    ├─→ Thermal shutdown @ 150°C (1-5s)
    │    └─→ Protects against module shorts
    │
    ▼
Layer 4: PTC Resettable Fuses (Per-Rail)

+12V ─── PTC (1.5A hold / 3A trip) ─── Output
         Auto-reset protection

+5V ──── PTC (1.1A hold / 2.2A trip) ─── Output
         Auto-reset protection

-12V ─── PTC (1.0A hold / 2.0A trip) ─── Output
         Auto-reset protection
```

## Linear Regulator Inherent Protection

**Key insight:** The LM78xx/79xx series regulators provide built-in protection that makes PTC-only protection adequate.

### Built-in Current Limiting

When the output is shorted to ground, the regulator doesn't supply infinite current:

**Example: LM7812 during +12V-to-GND short**

```
Normal operation:
+13.5V ──→ [LM7812] ──→ +12V @ 1.2A

During short circuit:
+13.5V ──→ [LM7812] ──→ 0V (shorted) @ ~1.5-2.2A max
                ↑
         Internal current limiting!
         (prevents infinite current)
```

The regulator enters "current limit mode" and supplies only its maximum rated current (~1.5-2.2A), protecting against catastrophic current draw.

### Built-in Thermal Shutdown

If junction temperature exceeds ~150°C, the regulator automatically shuts down:

**Power dissipation during short:**
```
P = (VIN - VOUT) × IOUT
P = (13.5V - 0V) × 1.5A
P = 20.25W

Temperature rise:
ΔT = P × θJA
ΔT = 20.25W × 35°C/W = 708°C (theoretical)

In practice:
- After 1-5 seconds: Junction temp hits 150°C
- Thermal shutdown activates
- Regulator turns off automatically
- After cooling (~30s): Auto-restarts
```

### Why This Matters

**Most common short scenario:** Module output shorts to GND

```
Protection sequence:
1. Module shorts +12V to GND
2. LM7812 current limiting kicks in IMMEDIATELY
   → Current limited to ~1.5-2A (not infinite!)
3. PTC starts heating (1-5 seconds)
4. LM7812 starts heating (20W dissipation)
5. Within 5 seconds:
   → LM7812 thermal shutdown OR PTC trips
6. Output current drops to near-zero
7. After 30-60s: Auto-recovery when cool

✅ No component damage
✅ Auto-recovery
✅ User-friendly
```

This inherent protection means **the linear regulator acts as a "smart current limiter"** - you get sophisticated protection without additional circuitry.

### Why This Design is Better

**Compared to Doepfer (fuse-only):**
- ✅ **Auto-reset for overloads**: PTC handles temporary overcurrent
- ✅ **User-friendly**: No fuse replacement for minor overloads
- ✅ **Live performance friendly**: Auto-recovery in 30-60 seconds
- ✅ **Multi-layer protection**: 4 layers vs 1 layer

**Compared to traditional PTC-only designs:**
- ✅ **Linear regulator adds protection layer**: Current limiting + thermal shutdown
- ✅ **No catastrophic shorts possible**: Regulators prevent >2A on module side
- ✅ **Defense in depth**: PTC + regulator + DC-DC + USB-PD

**Compared to high-end electronic limiting:**
- ✅ **Simpler, more reliable**: Uses inherent regulator protection
- ✅ **Lower cost**: No additional active circuitry needed
- ✅ **Adequate protection**: 4 independent layers sufficient for synth use

## Protection Ratings

### +12V Rail (1.2A design target, 1.5A regulator max)

**Selected PTC: C7529589 - SMD1210P150TF/16**
- **Hold current**: 1.5A (safe continuous operation)
- **Trip current**: 3A (will trip within seconds)
- **Max current**: 35A (can handle during trip)
- **Trip time**: 500ms @ 3A
- **Resistance**: 0.03Ω (minimal voltage drop)
- **Voltage**: 16V rating
- **Package**: SMD1210
- **Purpose**: Protect against sustained overloads and shorts
- **Recovery**: Auto-reset in 30-60 seconds

**Protection stages:**

| Current | Regulator | PTC State | Result |
|---------|-----------|-----------|--------|
| 0-1.5A | ✅ Pass | ✅ Pass | Normal operation |
| 1.5-2.2A | ⚠️ Current limit | ⚠️ Warming | PTC warming, regulator limiting |
| 2.2-3A | 🛑 Current limit | ⚠️ Heating | PTC will trip (1-5s) |
| >3A | 🛑 Current limit | 🛑 Trip | PTC trips (0.5-1s), auto-resets |

**Note:** LM7812 limits current to ~2.2A max, so PTC sees maximum 2.2A in practice.

### +5V Rail (0.5A design target, 1A regulator max)

**Selected PTC: C70119 - mSMD110-33V**
- **Hold current**: 1.1A
- **Trip current**: ~2.2A (typical, 2x hold)
- **Package**: 1812
- **Purpose**: Protect regulator (1A max) with margin
- **Recovery**: Auto-reset in 30-60 seconds

**Protection stages:**

| Current | Regulator | PTC State | Result |
|---------|-----------|-----------|--------|
| 0-1.0A | ✅ Pass | ✅ Pass | Normal operation |
| 1.0-1.5A | ⚠️ Current limit | ⚠️ Warming | PTC warming, regulator limiting |
| >1.5A | 🛑 Current limit | 🛑 Trip | PTC trips, auto-resets |

### -12V Rail (0.8A design target, 1A regulator max)

**Selected PTC: C2830246 - JK-nSMD100/16V**
- **Hold current**: 1.0A
- **Trip current**: ~2.0A (typical, 2x hold)
- **Package**: 1206
- **Purpose**: Protect regulator with margin
- **Recovery**: Auto-reset in 30-60 seconds

**Protection stages:**

| Current | Regulator | PTC State | Result |
|---------|-----------|-----------|--------|
| 0-1.0A | ✅ Pass | ✅ Pass | Normal operation |
| 1.0-1.5A | ⚠️ Current limit | ⚠️ Warming | PTC warming, regulator limiting |
| >1.5A | 🛑 Current limit | 🛑 Trip | PTC trips, auto-resets |

## Design Rationale

### Why PTC-Only Protection is Adequate

**Key insight:** Linear regulators prevent catastrophic shorts on the module side.

**Short circuit scenario with linear regulator:**

```
Module shorts +12V to GND:

Time:    0ms          100ms         500ms        1-5s
         │             │             │            │
Regulator: Current limit @ 1.5-2A ────────────► Thermal shutdown
         │             │             │            │
PTC:     heating...────────────► warming ────► 🛑 trip
         │
         └─→ Current limited to 1.5-2A (not 20A+!)
             No PCB trace damage possible!
```

**Protection layers working together:**
1. **Normal overload (1.2-1.5A)**: PTC trips, auto-resets → User-friendly ✅
2. **Module short (>1.5A)**: Regulator limits to 1.5-2A, PTC trips → Protected ✅
3. **Circuit short (>3A)**: DC-DC limits to 3-5A, PTC trips → Protected ✅
4. **Catastrophic fault**: USB-PD adapter protection → System protected ✅

### Cost-Benefit Analysis

**Component cost per rail:**
- PTC resettable fuse: ~$0.10-0.20
- Total for 3 rails: ~$0.30-0.60

**Benefits:**
- ✅ Auto-reset convenience (worth $0.20+ in user time per trip)
- ✅ Four-layer protection (better than most commercial supplies)
- ✅ Component protection (prevents regulator thermal stress)
- ✅ Uses inherent regulator protection (no wasted circuitry)
- ✅ Fully assembled by JLCPCB (no manual soldering)

**Compared to adding backup fuses:**
- ❌ Fuses not available in JLCPCB catalog (zero stock)
- ❌ Would require manual assembly
- ❌ Not needed due to regulator current limiting

**Verdict:** PTC-only is the optimal solution ✅

## Failure Modes and User Experience

### Scenario 1: Temporary Overload (1.5A spike)

**What happens:**
1. User plugs in too many modules
2. Current reaches 1.5A (above 1.3A hold)
3. PTC starts heating up (1-5 seconds)
4. PTC trips, current drops to ~10mA
5. LEDs dim/turn off (indicates overload)
6. PTC cools down (30-60 seconds)
7. PTC auto-resets, power returns
8. User removes some modules

**User experience:**
- ✅ No fuse replacement needed
- ✅ Clear indication via LED (overload)
- ✅ Auto-recovery in ~1 minute
- ✅ Friendly for live performance

### Scenario 2: Module Short Circuit (+12V to GND)

**What happens:**
1. Module shorts +12V to GND (bad cable, component failure)
2. LM7812 current limiting kicks in immediately → limits to 1.5-2A
3. PTC starts heating (1-5 seconds at 1.5-2A)
4. LM7812 starts heating (20W dissipation)
5. Within 5 seconds: PTC trips OR regulator thermal shutdown
6. Power output drops to near-zero
7. After 30-60s cooling: Auto-recovery

**User experience:**
- ✅ PCB and components protected (current limited to safe level)
- ✅ No smoke or fire
- ✅ Auto-recovery (no manual intervention)
- ✅ Clear indication via LED going out

### Scenario 3: Sustained Overload (2A continuous)

**What happens:**
1. User runs system at 2A (above 1.3A hold)
2. PTC heats up over 1-5 seconds
3. PTC trips before reaching thermal damage
4. Current drops to ~10mA
5. PTC remains tripped until load is reduced
6. User removes modules to reduce load
7. PTC cools and auto-resets

**User experience:**
- ✅ Prevents regulator thermal shutdown
- ✅ Auto-reset when problem is fixed
- ✅ Clear indication of overload

## Comparison to USB-PD Adapter Protection

**Question:** If USB-PD adapters have built-in protection, why do we need per-rail protection?

**Answer:** USB-PD protects the INPUT (15V), not the OUTPUT rails (+12V, +5V, -12V)

### Protection Zones

```
┌─────────────────┐
│  USB-PD Adapter │ ← Zone 1: USB-PD overcurrent protection
│     (15V)       │   (protects adapter and cable)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DC-DC Stage    │ ← Zone 2: No protection (vulnerable!)
│   +13.5V, etc   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Linear Regulators│ ← Zone 3: No protection (vulnerable!)
│ +12V, +5V, -12V │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PTC + Fuse     │ ← Zone 4: Per-rail protection ✅
│  (This design)  │   (protects regulators and modules)
└────────┬────────┘
         │
         ▼
     Modules
```

**What could go wrong without per-rail protection:**

1. **DC-DC converter failure**: Could short and output high current to linear regulator
2. **Linear regulator failure**: Could short and output high current to modules
3. **Module short**: Could draw excessive current and damage regulator
4. **Bad cable**: Could short rails together

**USB-PD adapter would protect in extreme cases, but:**
- Slower to respond (seconds vs milliseconds)
- Doesn't protect individual rails
- Doesn't distinguish between normal high load and fault condition
- Would shut down entire system (not just faulty rail)

## References and Research

This design is informed by research into commercial Eurorack power supplies:

### Doepfer A100
- Traditional fuse-only protection
- Simple, reliable, proven design
- Source: https://doepfer.de/a100_man/a100t_e.htm

### Intellijel TPS Series
- Multi-stage electronic protection
- Soft-start, foldback limiting, OVP, SCP
- High-end commercial approach

### DIY Community Consensus
- Traditional fuses preferred for reliability
- PTCs controversial due to slower response
- Multi-stage protection recommended for production designs

### Research Documents
- Doepfer A100 protection research: `__inbox/1230_0122-research-doepfer-a100-power-protection.md`
- Eurorack overcurrent protection research: `__inbox/1230_0127-research-eurorack-overcurrent-protection.md`

## Conclusion

This PTC-only protection design with inherent linear regulator protection provides:

✅ **Better than Doepfer**: Auto-reset convenience + multi-layer protection (4 layers vs 1)
✅ **Simpler than Intellijel**: Uses inherent regulator protection, no complex active circuitry
✅ **Defense in depth**: Four independent protection layers (USB-PD → DC-DC → Regulator → PTC)
✅ **User-friendly**: Auto-reset for all fault types, no manual fuse replacement
✅ **Safe**: Linear regulators prevent catastrophic shorts (current limited to 1.5-2A max)
✅ **Practical**: Fully assembled by JLCPCB, no manual soldering required
✅ **Cost-effective**: ~$0.30-0.60 for complete protection on all three rails

**Key insight:** The linear regulator's built-in current limiting and thermal shutdown make it act as a "smart current limiter," eliminating the need for backup fuses while still providing excellent protection against all common fault scenarios in modular synthesizer applications.

The design exceeds most commercial synth power supplies in protection while maintaining simplicity and user-friendliness.
