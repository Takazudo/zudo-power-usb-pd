---
sidebar_position: 2
---

# PCB Design Specification

This document provides comprehensive PCB design guidelines for the USB-PD modular synthesizer power supply. These specifications ensure proper electrical performance, thermal management, and manufacturability with JLCPCB.

## 1. Board Layer Stackup

### Recommended: 4-Layer PCB

```
Layer 1 (Top):    Component placement + Signal routing
Layer 2 (Inner):  Continuous GND plane
Layer 3 (Inner):  Power planes (+15V, +12V, -12V, +5V)
Layer 4 (Bottom): GND plane + Signal routing + GND fill
```

**Rationale:**

- **Continuous ground reference**: Provides low-impedance return path for all signals
- **Power plane distribution**: Minimizes voltage drop and improves load transient response
- **EMI performance**: Ground planes provide shielding between power and signal layers
- **Industry standard**: 4-layer is standard for power supplies &gt;10W
- **Total power**: This design delivers ~26W, making 4-layer appropriate

**Advantages:**

- ✅ Better noise immunity (switching noise from DC-DC converters)
- ✅ Lower impedance power distribution
- ✅ Easier thermal management (more copper for heat spreading)
- ✅ Better voltage regulation (minimal voltage drop)
- ✅ Professional-grade design suitable for production

**Cost Consideration:**

- 4-layer PCB costs 2-3× more than 2-layer
- For small prototype runs (5-10 boards), cost difference is ~$50-100 total
- For low-noise audio applications, the performance improvement justifies the cost

### Alternative: 2-Layer PCB (Budget Option)

If cost is critical, a 2-layer design is possible but requires careful layout:

```
Layer 1 (Top):    Components + Power traces (thick copper pours)
Layer 2 (Bottom): GND plane + Power return paths
```

**Trade-offs:**

- ⚠️ Higher power trace impedance (more voltage drop)
- ⚠️ More challenging routing (limited space for signals)
- ⚠️ Less effective noise rejection
- ⚠️ Requires larger PCB area for proper trace widths

**Recommendation**: Use 4-layer design. The performance and ease of layout justify the additional cost for a power supply application.

---

## 2. Copper Thickness

### Recommended: 2oz (70µm) Copper

**Specification:**

- **Outer layers**: 2oz (70µm)
- **Inner layers**: 1oz (35µm) is acceptable for Layer 2/3

**Rationale:**

**Voltage Drop Analysis:**

For +12V rail (worst case):

- Current: 1.2A
- Trace length: ~100mm (regulator to output connector)
- Trace width: 2mm

**1oz copper (35µm):**

- Resistance: ~8.5mΩ per trace
- Voltage drop: 1.2A × 8.5mΩ = 10.2mV (0.085% loss)

**2oz copper (70µm):**

- Resistance: ~4.25mΩ per trace
- Voltage drop: 1.2A × 4.25mΩ = 5.1mV (0.043% loss)

**Benefits of 2oz copper:**

- ✅ 50% reduction in voltage drop
- ✅ Better thermal dissipation (lower trace temperature)
- ✅ Higher current capacity for same trace width
- ✅ More robust traces (better manufacturing yield)

**JLCPCB Compatibility:**

- 2oz copper available as standard option
- No additional lead time
- Small cost increase (~10-15% vs 1oz)

---

## 3. Trace Width Specifications

### Power Traces

Use the following minimum trace widths for power distribution:

| Signal                   | Current | Min Width (2oz) | Min Width (1oz) | Notes                    |
| ------------------------ | ------- | --------------- | --------------- | ------------------------ |
| **USB-C VBUS (15V/3A)**  | 3A      | 2.0mm           | 3.0mm           | Keep short, wide traces  |
| **DC-DC Outputs (1-2A)** | 1-2A    | 1.5mm           | 2.0mm           | U2/U3/U4 outputs         |
| **+12V Rail**            | 1.2A    | 1.0mm           | 1.5mm           | After LM7812             |
| **-12V Rail**            | 0.8A    | 1.0mm           | 1.5mm           | After CJ7912             |
| **+5V Rail**             | 0.5A    | 0.8mm           | 1.2mm           | After LM7805             |
| **Ground Return**        | 3A      | 2.0mm+          | 3.0mm+          | Make as wide as possible |

### Signal Traces

| Signal Type         | Width     | Notes                                                  |
| ------------------- | --------- | ------------------------------------------------------ |
| **Feedback traces** | 0.2-0.3mm | Keep short (&lt;20mm), route away from switching nodes |
| **Control signals** | 0.25mm    | CH224D CFG pins, PG signals                            |
| **LED current**     | 0.25mm    | Low current (10-20mA)                                  |

**Important Notes:**

- Use **polygon pours** for power distribution instead of traces where possible
- Power traces should have **smooth corners** (no sharp 90° angles)
- **Minimize trace length** for high-current paths
- Use **multiple vias** when transitioning between layers (2-4 vias in parallel)

---

## 4. Component Placement and Spacing

### Thermal Separation Requirements

Heat-generating components must be properly spaced to prevent thermal coupling:

| Component Pair                  | Minimum Spacing | Rationale                                 |
| ------------------------------- | --------------- | ----------------------------------------- |
| **LM2596S ↔ LM2596S**           | 15mm            | Prevent DC-DC thermal coupling            |
| **LM2596S ↔ LM78xx/79xx**       | 20mm            | Isolate switching stage from linear stage |
| **LM7812 ↔ LM7805 ↔ CJ7912**    | 10mm            | Allow independent heat dissipation        |
| **PTC ↔ Heat sources**          | 15mm            | Prevent false trips from ambient heating  |
| **Inductors ↔ Feedback traces** | 10mm            | Minimize magnetic field coupling          |

### Circuit Stage Organization

**Recommended Physical Layout (Left to Right):**

```
[Stage 1]  →  [Stage 2]     →  [Stage 3]        →  [Stage 4]  →  [Output]
USB-PD         DC-DC            Linear Regulators   Protection     Connector
CH224D         LM2596S (×3)     LM7812/7805/7912   PTCs + TVS     IDC Header
```

**Key Principles:**

- **Power flow direction**: Arrange components following power flow path
- **Separation zones**: Physical gap between switching and low-noise sections
- **Minimize backtracking**: Avoid routing power traces back toward input
- **Star grounding**: Single-point ground connection at input capacitors

### Component Orientation

**TO-263 Packages (LM2596S, LM7812):**

- Orient thermal tabs toward board edge or large copper pour
- Allow space for thermal vias under tab
- Keep components oriented in same direction for visual inspection

**Electrolytic Capacitors:**

- Polarity markings must be clearly visible on silkscreen
- **Critical for -12V rail**: Add large "+" markers to prevent reverse polarity
- Group capacitors by stage for easier troubleshooting

**Inductors (CYA1265-100UH):**

- Orient away from sensitive feedback traces
- Magnetic field is strongest at coil ends
- Consider perpendicular orientation to minimize coupling between inductors

---

## 5. DC-DC Converter Critical Layout

The LM2596S switching regulators require careful PCB layout to minimize EMI and ensure stable operation.

### Switching Loop Minimization

**Critical Current Loop** (must be minimized):

```
Input Cap (C_IN) → VIN pin → Internal Switch → OUTPUT pin →
Schottky Diode (D) → Inductor (L) → Output Cap (C_OUT) →
GND → Input Cap (C_IN)
```

**Layout Rules:**

1. **Input capacitor (C3, C11, C19)**: Place as close as possible to VIN pin (&lt;5mm)
2. **Schottky diode (D1, D2, D3)**: Place immediately adjacent to OUTPUT pin (&lt;5mm)
3. **Catch diode to GND**: Short, wide trace from diode cathode to GND plane
4. **Inductor**: Place close to diode anode (minimize trace length)
5. **Output capacitor**: Place at inductor output, close to GND connection

**Target Loop Area**: &lt;1 square inch (6.5 cm²) per converter

**Why This Matters:**

- Switching frequency: 150kHz with high di/dt current spikes
- Large loop area acts as antenna (radiates EMI)
- Parasitic inductance in loop causes voltage ringing
- Poor layout can cause unstable regulation or oscillation

### Feedback Trace Routing

**Feedback Network (R1/R2, R3/R4, R5/R6):**

```
FB Pin ← R_lower ← GND
         ↑
      R_upper (with C_FF in parallel)
         ↑
       Vout
```

**Critical Rules:**

1. **Sense point location**: Connect R_upper to output capacitor (+) terminal, not inductor
2. **Trace isolation**: Route feedback traces away from:
   - Switching nodes (OUTPUT pin)
   - Inductor (magnetic field coupling)
   - Schottky diode (high-frequency switching)
3. **Trace length**: Keep feedback traces &lt;30mm total
4. **Trace width**: Use 0.2-0.3mm (thin traces reduce capacitive coupling)
5. **Shielding**: Route on inner layer if possible, or use ground guard traces

**Compensation Capacitor (C31, C32, C33 - 22nF):**

- Place directly in parallel with R_upper (R1, R3, R5)
- Keep component leads short
- Use C0G/NP0 ceramic for stability

### Ground Connection Strategy

**Recommended Approach (4-layer):**

- **Layer 2**: Solid GND plane (no splits, no traces)
- **Component connections**: Via directly from component GND pad to Layer 2
- **Power GND return**: Wide traces on top layer, multiple vias to Layer 2
- **Star point**: Input capacitor (C3/C11/C19) GND is the star ground point

**DO NOT:**

- ❌ Use thermal relief on power GND vias (use direct connection)
- ❌ Split GND plane under DC-DC converters
- ❌ Route high-current traces across GND plane splits

---

## 6. Linear Regulator Layout

### Thermal Vias for TO-263/TO-252 Packages

**TO-263-2 Packages (L7812CD2T-TR, L7805ABD2T-TR):**

```
Thermal Via Pattern (top view):

    [Component Body]
    ┌──────────────┐
    │   ● ● ● ●   │  ← 8-10 vias under thermal pad
    │   ● ● ● ●   │     0.3mm diameter (0.2mm hole)
    │   ● ● ●     │     ~2mm spacing
    └──────────────┘
       Thermal Tab
```

**Specifications:**

- **Via diameter**: 0.3mm (0.2mm drill hole)
- **Via count**: 8-10 vias per package
- **Via spacing**: 2.0-2.5mm grid pattern
- **Via plating**: Standard through-hole plating
- **Connection**: Direct to GND plane (Layer 2 and Layer 4)
- **NO thermal relief**: Use solid connection for maximum thermal transfer

**Copper Pour Requirements:**

- **Minimum area**: 6 cm² (600 mm²) connected to thermal tab
- **Pour thickness**: Use 2oz copper on top layer
- **Pour connection**: Direct connection to GND plane via multiple vias
- **Keep-out zone**: No other components within 10mm of regulator body

**TO-252-2L Package (CJ7912 - C94173):**

- **Via count**: 6-8 vias (smaller package)
- **Via diameter**: 0.3mm (0.2mm hole)
- **Via spacing**: 2.0mm
- Same copper pour and thermal design requirements

### Input/Output Capacitor Placement

**Critical Distances:**

| Capacitor                  | Max Distance | Component | Notes                     |
| -------------------------- | ------------ | --------- | ------------------------- |
| **Ceramic input (100nF)**  | 5mm          | VIN pin   | High-frequency bypass     |
| **Ceramic output (100nF)** | 5mm          | VOUT pin  | High-frequency decoupling |
| **Bulk input (470µF)**     | 20mm         | VIN pin   | Transient response        |
| **Bulk output (470µF)**    | 20mm         | VOUT pin  | Load transient response   |

**Why This Matters:**

- Ceramic capacitors provide high-frequency filtering (&gt;1MHz)
- Trace inductance reduces effectiveness if placed too far
- Linear regulators can oscillate with poor capacitor placement
- LM78xx series requires minimum 0.33µF input, 0.1µF output within 5mm

---

## 7. Ground Plane Strategy

### 4-Layer Ground Plane Design

**Layer 2 (Inner) - Primary GND Plane:**

- **100% solid copper** (no splits, no cutouts except for vias)
- Provides low-impedance return path for all signals
- Acts as heat spreader for thermal management
- Shields Layer 3 power planes from noise

**Layer 4 (Bottom) - Secondary GND Plane:**

- **GND fill on bottom layer** with signal routing
- Connected to Layer 2 via ground stitching vias
- Provides return path for bottom-layer signals

### Ground Stitching Vias

**Via Placement Strategy:**

| Location                      | Via Spacing   | Rationale                                  |
| ----------------------------- | ------------- | ------------------------------------------ |
| **General areas**             | 10-15mm grid  | Maintain low impedance between planes      |
| **Around DC-DC converters**   | 5mm grid      | Minimize loop inductance                   |
| **Power component perimeter** | 3-5mm spacing | Maximize thermal and electrical connection |
| **Board edges**               | 10mm spacing  | Prevent slot antenna effects               |

**Via Specifications:**

- Diameter: 0.4mm (0.25mm drill)
- Plating: Standard through-hole
- Connection: Layer 2 ↔ Layer 4 (GND to GND)

### Star Grounding Architecture

**Single-Point Ground Connection:**

```
                    [Star Ground Point]
                    Input Cap (C1/C2) GND
                           |
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   [DC-DC Stage]    [Linear Stage]    [Protection Stage]
   LM2596S GND      LM78xx GND        PTC GND
```

**Implementation:**

- **Star point location**: Near USB-C connector, at input capacitor GND
- **Stage separation**: Minimize ground current mixing between stages
- **Return path**: All GND currents flow back to star point
- **Connection**: Use solid GND plane (Layer 2) to implement star grounding

**Why This Matters:**

- Prevents ground loops (noise coupling between stages)
- Isolates switching noise from sensitive linear regulator stage
- Reduces ripple and noise on final outputs
- Standard practice for low-noise audio power supplies

---

## 8. EMI/EMC Considerations

### Input Filtering

**USB-C VBUS Input:**

- **C1 (10µF)**: Bulk filtering of PD adapter noise
- **C2 (100nF)**: High-frequency noise suppression

**Additional Recommendations:**

- Consider adding **ferrite bead** between USB-C and C1 (optional)
- Ferrite impedance: 100-300Ω @ 100MHz
- Helps reduce conducted emissions back to USB-PD adapter

### Output Filtering

**DC-DC Converter Outputs:**

- Current design uses LC filter (inductor + output cap)
- **Additional option**: Add 10-100nF ceramic cap in parallel with bulk electrolytics
- Improves high-frequency noise rejection
- Already included in design (C8, C16, C22, C26: 100nF ceramics) ✅

### Switching Node Shielding

**High-Frequency Switching Nodes:**

- **LM2596S OUTPUT pin**: High di/dt switching transients
- **Schottky diode connections**: High-frequency ringing

**Layout Recommendations:**

1. **Minimize trace length** (&lt;5mm) for OUTPUT → Diode connection
2. **Route on top layer only** (don't use vias for switching nodes)
3. **Keep away from sensitive traces** (&gt;10mm clearance to feedback traces)
4. **No parallel routing** with feedback or control signals

---

## 9. PCB Design Checklist

### Before Starting Layout

- [ ] **Schematic complete** and reviewed
- [ ] **Component footprints verified** from JLCPCB library
- [ ] **BOM finalized** with all JLCPCB part numbers
- [ ] **Layer stackup decided** (4-layer recommended)
- [ ] **Copper thickness selected** (2oz recommended)
- [ ] **Board dimensions** determined (based on case/mounting requirements)

### During Layout

**Component Placement:**

- [ ] **Power flow left-to-right** or top-to-bottom
- [ ] **Thermal spacing** verified (see Section 4)
- [ ] **DC-DC switching loops** minimized (&lt;1 square inch)
- [ ] **Ceramic capacitors** within 5mm of IC pins
- [ ] **Thermal vias** placed under TO-263 packages (8-10 vias)
- [ ] **Electrolytic polarity** clearly marked on silkscreen

**Routing:**

- [ ] **Power trace widths** meet specifications (see Section 3)
- [ ] **Feedback traces** routed away from switching nodes
- [ ] **Ground stitching vias** placed (5-15mm grid)
- [ ] **Thermal relief disabled** on power vias
- [ ] **No 90° angles** on power traces (use 45° or curved)

**Thermal Management:**

- [ ] **Copper pours** connected to thermal pads (6 cm² minimum)
- [ ] **Component spacing** allows airflow
- [ ] **No heat-sensitive parts** near regulators

**Silkscreen:**

- [ ] **Polarity markings** on all polarized components
- [ ] **Pin 1 indicators** on all ICs
- [ ] **Component reference** designators (U1, C1, R1, etc.)
- [ ] **Voltage rail labels** (+12V, -12V, +5V, GND)
- [ ] **Warning text**: "⚠️ REVERSE POLARITY DESTROYS MODULES"
- [ ] **Board revision** and date

### Design Rule Check (DRC)

**JLCPCB Design Rules:**

- [ ] **Minimum trace width**: 0.15mm (6mil)
- [ ] **Minimum clearance**: 0.15mm (6mil)
- [ ] **Minimum via diameter**: 0.3mm (hole 0.2mm)
- [ ] **Minimum hole size**: 0.2mm
- [ ] **Copper to edge**: 0.3mm minimum

### Before Ordering PCB

- [ ] **DRC passed** with zero errors
- [ ] **ERC passed** (electrical rule check)
- [ ] **3D view** checked for component collisions
- [ ] **Gerber files** generated and visually inspected
- [ ] **Drill file** verified (hole sizes correct)
- [ ] **BOM exported** with JLCPCB part numbers
- [ ] **CPL (component placement)** file generated for SMT assembly

---

## 10. JLCPCB Manufacturing Specifications

### PCB Stackup Order

When ordering from JLCPCB, select:

**PCB Specifications:**

- **Layers**: 4 layers
- **Dimensions**: (TBD based on final layout)
- **PCB Thickness**: 1.6mm (standard)
- **PCB Color**: Green (standard, lowest cost)
- **Silkscreen**: White
- **Surface Finish**: HASL (lead-free) or ENIG (better for fine pitch)
- **Copper Weight**:
  - Outer layers: 2oz (70µm)
  - Inner layers: 1oz (35µm)
- **Via Covering**: Tented (covered with soldermask)
- **Min Track/Spacing**: 6/6 mil
- **Min Hole Size**: 0.2mm

**SMT Assembly Options:**

- **Assembly Side**: Top
- **Assembly Type**: Economic (for prototypes)
- **Tooling Holes**: Added by JLCPCB
- **Edge Rails**: Not required for small boards
- **Confirm Parts Placement**: Yes (verify before production)

### Component Orientation Notes

**Critical Assembly Notes for JLCPCB:**

1. **Electrolytic Capacitors (Negative Rail)**:
   - Add note: "VERIFY POLARITY - Negative rail capacitors"
   - Mark clearly on silkscreen with oversized "+" symbols

2. **TO-263/TO-252 Packages**:
   - Add note: "Thermal pad orientation critical"
   - Verify pin 1 marking matches datasheet

3. **QFN-20 Package (CH224D)**:
   - Add note: "Ensure thermal pad solder paste coverage"
   - Use stencil with reduced apertures (80% of pad size)

---

## 11. Design References

**Industry Standards:**

- IPC-2221: Generic Standard on Printed Board Design
- IPC-2152: Standard for Determining Current Carrying Capacity in Printed Board Design
- IPC-7351: Generic Requirements for Surface Mount Design and Land Pattern Standard

**Application Notes:**

- Texas Instruments: "PCB Layout Guidelines for Switching Power Supplies"
- Analog Devices: "A Printed Circuit Board Layout Guide for Switching Regulators"
- Linear Technology (Analog Devices): AN139 "Minimizing Switching Regulator Residue in Linear Regulator Outputs"

**Validated Designs:**

- Toppobrillo Eurobus power distribution
- The Gremblog Dual ±12V PSU
- Doepfer A-100 power system

---

## Summary

This PCB design specification provides comprehensive guidelines for creating a manufacturable, high-performance PCB for the USB-PD modular synthesizer power supply. Key recommendations:

1. ✅ **4-layer PCB** with 2oz outer copper
2. ✅ **Careful component placement** with thermal spacing
3. ✅ **Minimize DC-DC switching loops** (&lt;1 square inch)
4. ✅ **Proper thermal management** (8-10 vias per TO-263 package)
5. ✅ **Solid ground planes** with stitching vias
6. ✅ **Appropriate trace widths** for current capacity
7. ✅ **Follow JLCPCB design rules** for successful manufacturing

Following these specifications will result in a PCB design that meets electrical performance requirements, dissipates heat effectively, and can be reliably manufactured by JLCPCB with their SMT assembly service.
