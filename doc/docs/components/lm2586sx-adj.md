---
sidebar_position: 3
---

import InverterU5Diagram from '../_fragments/inverter-u5-diagram.mdx';

# LM2586SX-ADJ Inverted SEPIC Converter

A high-efficiency 3A switching regulator designed for flyback, boost, and inverted SEPIC topologies. Used to generate negative voltage (-15V) from positive input (+15V).

- 🔗 [View on JLCPCB: C181324](https://jlcpcb.com/partdetail/C181324)
- 📄 [Download Datasheet (PDF)](/datasheets/LM2586-datasheet.pdf)

import FootprintSvg from '@site/src/components/FootprintSvg';
import LM2586 from '@site/static/footprints-svg/TO-263-7_L10.2-W8.6-P1.27-LS14.4-TL.svg';

<FootprintSvg src={LM2586} alt="LM2586SX-ADJ TO-263-7 Package" minWidth="300px" minHeight="200px" />

![LM2586SX-ADJ Package Preview](/footprints/LM2586SX-ADJ.png)

## Overview

The LM2586SX-ADJ is a 3A output capable switching regulator from Texas Instruments designed for multiple topologies including flyback, boost, forward, and **inverted SEPIC**. In this project, it's configured as an inverted SEPIC converter to generate -15V from +15V input.

**Why LM2586 instead of charge pump (ICL7660)?**
- **Current requirement**: The -12V rail needs 800mA, but charge pumps like ICL7660 only provide ~100mA
- **High current capability**: LM2586 can deliver 3A, providing ample headroom for the 800mA requirement
- **Input voltage compatibility**: Handles 4V-40V input (ICL7660 max is 10V, requiring voltage clamping)

Being an adjustable output type (ADJ), the output voltage can be set using a feedback resistor divider. The 200kHz switching frequency allows for reasonably sized inductors and capacitors.

## Specifications

### Electrical Characteristics

| Parameter | Value |
|-----------|-------|
| **Input Voltage Range** | 4V - 40V DC |
| **Output Voltage Range** | Adjustable (inverted SEPIC: negative outputs) |
| **Maximum Output Current** | 3A |
| **Switching Frequency** | 200kHz (typical) |
| **Efficiency** | 85% - 90% (typical, topology dependent) |
| **Reference Voltage** | 1.23V (internal, for feedback) |
| **Operating Temperature** | -40°C to +125°C |
| **ON/OFF Control** | Floating = ON, ≥3V = Shutdown |
| **Shutdown Current** | 56µA typical (16µA to VIN, 40µA to ON/OFF) |

### Package Information

- **Package Type**: TO-263-7 (DDPAK, 7-pin)
- **Dimensions**: 10.0mm × 9.0mm (approx)
- **Pin Count**: 7 pins
- **Mounting**: SMD (Surface Mount Device)
- **Thermal Pad**: Large metal tab for heat dissipation
- **LCSC Part Number**: C181324
- **Stock**: 89 units (as of last check - limited availability)

## Pin Configuration

```
         TOP VIEW
    ┌──────────────┐
    │1            7│
    │ VIN      NC  │
    │              │
    │2            6│
    │ SW       NC  │
    │              │
    │3            5│
    │ GND   ON/OFF │
    │              │
    │4             │
    │ FB           │
    │              │
    └──────────────┘
      TO-263-7
```

| Pin | Name | Function |
|-----|------|----------|
| 1 | VIN | Input voltage (+15V) |
| 2 | SW | Switch output (connects to L1) |
| 3 | GND | Ground reference |
| 4 | FB | Feedback input (voltage sense) |
| 5 | ON/OFF | Enable/disable control (floating = ON, ≥3V = shutdown) |
| 6 | NC | Not connected |
| 7 | NC | Not connected |

## Application in This Project

### Inverted SEPIC Configuration (Diagram4: U5)

<InverterU5Diagram />

### Component Values for -15V Output

| Component | Value | Purpose |
|-----------|-------|---------|
| **L1** | 47µH, 3A rated | Input inductor |
| **L2** | 47µH, 3A rated | Output inductor (can use coupled inductor with L1) |
| **C1** | 47µF | SEPIC coupling capacitor |
| **CIN** | 100µF electrolytic | Input filter capacitor |
| **COUT** | 100µF electrolytic | Output filter capacitor (reversed polarity) |
| **D1** | Schottky diode, 3A | Output rectifier (e.g., SS34, MBRS340) |
| **R1** | 10kΩ | Feedback resistor (upper) |
| **R2** | TBD | Feedback resistor (lower, sets output voltage) |

### Output Voltage Calculation

The output voltage is set by the feedback resistor divider:

```
VOUT = -1.23V × (1 + R1/R2)

For -15V output:
-15V = -1.23V × (1 + 10kΩ/R2)
R2 ≈ 920Ω
```

## Design Considerations

### Inductor Selection

- **Coupled inductors** recommended for better efficiency and smaller board space
- **Current rating**: Minimum 3A continuous
- **Saturation current**: 4A or higher for safety margin
- **DCR (DC resistance)**: Lower is better for efficiency

### Capacitor Selection

- **C1 (coupling cap)**: Low ESR ceramic or electrolytic, rated for high ripple current
- **CIN, COUT**: Low ESR electrolytic, rated for switching frequency ripple
- **Voltage rating**:
  - CIN: ≥25V (input is +15V)
  - COUT: ≥25V (output is -15V, reversed polarity)
  - C1: ≥25V (sees both input and output voltage swing)

### Diode Selection

- **Schottky diode** required for high-frequency switching (200kHz)
- **Forward voltage**: Lower is better for efficiency
- **Current rating**: Minimum 3A average, 5A peak
- **Reverse voltage**: ≥40V (must handle input voltage + output voltage)

### ON/OFF Pin Control

For **always-on operation** (this project):
- Leave pin 5 **floating (open circuit)**
- Do not source or sink current to/from this pin

For **enable/disable control** (future enhancement):
- Connect to microcontroller GPIO or switch
- Float or pull low (&lt;0.8V) = Enable
- Pull high (≥3V) = Shutdown
- Use isolation diode if needed

### Thermal Management

- **Maximum junction temperature**: 150°C
- **Thermal resistance**: θJA depends on PCB copper area
- **Heat dissipation**:
  - Power loss ≈ (1 - efficiency) × (VIN × IIN)
  - For 15V → -15V @ 800mA with 85% efficiency: ~2W loss
- **Thermal pad connection**: Connect to large ground plane for heat spreading

## PCB Layout Guidelines

### Critical Traces (Minimize Length and Loop Area)

1. **Input capacitor (CIN)**: Place very close to VIN and GND pins
2. **SEPIC coupling capacitor (C1)**: Minimize trace length to L1/L2 junction
3. **Output diode (D1)**: Keep close to L2 and COUT
4. **Feedback resistors**: Keep close to FB pin, minimize noise pickup

### Ground Plane

- **Separate power ground and signal ground** initially, connect at single point near IC
- **Large copper pour** under thermal pad for heat dissipation
- **Ground vias** around thermal pad for thermal transfer to bottom layer

### Component Placement

```
[VIN] ─── CIN ─── [U5 LM2586] ─── L1 ─── C1 ─── L2 ─── D1 ─── COUT ─── [VOUT]
                       │                            │
                      GND ─────────────────────────GND
```

## Stock and Availability

:::warning Limited Stock
**JLCPCB Stock**: 89 units (as of last check)

This is **significantly lower** than other components in this project:
- LM2596S: 12,075 units
- CH224D: 2,291 units

**Recommendations**:
1. Order early if using JLCPCB assembly
2. Consider alternative part numbers (LM2586S-ADJ/NOPB variants)
3. Monitor stock levels before PCB production
:::

## Troubleshooting

### No Output Voltage

- **Check ON/OFF pin**: Should be floating or pulled low (not high)
- **Verify input voltage**: Should be 4V-40V range
- **Check inductor connections**: L1 and L2 must be properly connected
- **Verify diode polarity**: Cathode to L2/C1 junction, anode to GND

### Low Output Voltage

- **Check feedback resistors**: Verify R1/R2 ratio for desired output
- **Verify diode**: Use Schottky type with low forward voltage
- **Check inductor saturation**: May need higher saturation current rating

### High Output Ripple

- **Output capacitor ESR**: Use low-ESR capacitor for COUT
- **Increase output capacitance**: Add parallel capacitors
- **PCB layout**: Minimize loop area of output diode and COUT

### Overheating

- **Reduce load current**: Check if within 3A rating
- **Improve thermal management**: Add copper pour, thermal vias
- **Check efficiency**: Verify input/output voltage differential isn't excessive

## Related Documents

- [Diagram4: Voltage Inverter Circuit](../inbox/circuit-diagrams#diagram4-15v---15v-voltage-inverter-lm2586-inverted-sepic-u5)
- [Diagram5: -15V → -13.5V Buck Converter](../inbox/circuit-diagrams#diagram5--15v---135v-buck-converter-lm2596s-u4)
- [Overview: System Architecture](../inbox/overview)
- [Quick Reference: Component Specifications](../inbox/quick-reference)

## References

- Texas Instruments LM2586 Datasheet
- Application Note: "Inverted SEPIC Made SIMPLE" (SNVA743)
- [JLCPCB Part Detail: C181324](https://jlcpcb.com/partdetail/C181324)
