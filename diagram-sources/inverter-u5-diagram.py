#!/usr/bin/env python3
"""
LM2586SX-ADJ Flyback Converter Circuit Diagram (U5)

Generates a circuit diagram showing:
- LM2586SX-ADJ IC with pin configuration
- Input filtering (C13, C16)
- Flyback transformer (T1) for voltage inversion
- Compensation network (R9, C15)

Circuit: +15V IN → T1 (flyback) → LM2586 SW pin → -15V OUT (not shown)
"""

import os
import schemdraw
from schemdraw import elements as elm

# ============================================================================
# Configuration
# ============================================================================

# Drawing configuration
FONT = 'Arial'
FONT_SIZE = 11
LABEL_FONT_SIZE = 14
COLOR = 'black'
TRANSPARENT_BG = True
UNIT = 3

# IC positioning
IC_X = 6.0
IC_Y = 0.0

# Component dimensions
IC_EDGE_PAD_W = 3.0
IC_EDGE_PAD_H = 1.2
IC_PIN_SPACING = 0.8
IC_LEAD_LEN = 1.0
IC_PIN_LABEL_SIZE = 12

# Transformer configuration
TRANSFORMER_PRIMARY_TURNS = 3
TRANSFORMER_SECONDARY_TURNS = 3

# ============================================================================
# Main Drawing
# ============================================================================

with schemdraw.Drawing(
    font=FONT,
    fontsize=FONT_SIZE,
    color=COLOR,
    transparent=TRANSPARENT_BG
) as d:
    d.config(unit=UNIT)

    # ========================================================================
    # LM2586SX-ADJ IC (U5)
    # ========================================================================
    # IC is defined first at fixed position for reference by other components

    ic = (elm.Ic(
        pins=[
            # Left side (top to bottom)
            elm.IcPin(name='VIN', pin='7', side='left', slot='4/4'),
            elm.IcPin(name='COMP', pin='2', side='left', slot='3/4'),
            elm.IcPin(name='Freq.Sync.', pin='6', side='left', slot='2/4'),
            elm.IcPin(name='GND', pin='4', side='left', slot='1/4'),
            # Right side (top to bottom)
            elm.IcPin(name='SW', pin='5', side='right', slot='4/4'),
            elm.IcPin(name='Freq.Adj.', pin='1', side='right', slot='3/4'),
            elm.IcPin(name='FB', pin='3', side='right', slot='2/4'),
        ],
        edgepadW=IC_EDGE_PAD_W,
        edgepadH=IC_EDGE_PAD_H,
        pinspacing=IC_PIN_SPACING,
        leadlen=IC_LEAD_LEN,
        pinlblsize=IC_PIN_LABEL_SIZE
    ).at((IC_X, IC_Y))
     .anchor('VIN')
     .label('U5\nLM2586SX-ADJ', loc='top', fontsize=LABEL_FONT_SIZE, ofst=0.2)
    )

    # ========================================================================
    # Input Section: +15V IN with filtering capacitors (C13, C16)
    # ========================================================================

    # +15V input terminal
    vin_start = (0, ic.VIN[1])
    elm.Dot(open=True).at(vin_start).label('+15V IN', loc='top', fontsize=LABEL_FONT_SIZE, ofst=0.5)

    # Input rail with tap points for capacitors and transformer
    elm.Line().right(1)
    elm.Dot()
    vin_tap1 = d.here  # First tap: connects to T1 primary
    d.push()

    # Space for C13 branch
    elm.Line().right(0.5)
    elm.Dot()

    # C13: 100µF bulk capacitor
    elm.Capacitor().down(2.5).label('C13\n100µF', loc='bottom', fontsize=FONT_SIZE)
    elm.Ground()

    # Continue input rail to second tap
    d.pop()
    elm.Line().right(2.5)
    elm.Dot()
    vin_tap2 = d.here  # Second tap: connects to C16
    d.push()

    # C16: 100nF ceramic decoupling capacitor
    elm.Capacitor().down(2.5).label('C16\n100nF', loc='bottom', fontsize=FONT_SIZE)
    elm.Ground()

    # Continue to IC VIN pin
    d.pop()
    elm.Line().to(ic.VIN)

    # ========================================================================
    # Ground Connection
    # ========================================================================

    elm.Line().at(ic.GND).down(0.8)
    elm.Ground()

    # ========================================================================
    # Compensation Network: R9 and C15 from COMP pin
    # ========================================================================
    # Type II compensation network for control loop stability

    # Route from COMP pin
    elm.Line().at(ic.COMP).left(1)
    elm.Line().down(4)

    # R9: 3kΩ compensation resistor
    elm.Resistor(scale=0.7).left().label('R9\n3kΩ', loc='bottom', fontsize=FONT_SIZE, ofst=0.8)
    elm.Dot()
    comp_junction = d.here
    d.push()

    # C15: 47nF compensation capacitor to GND (first path)
    elm.Capacitor().down(2).label('C15\n47nF', loc='left', fontsize=FONT_SIZE, ofst=(-1, -0.8))
    elm.Ground()

    # Second GND path from compensation junction
    d.pop()
    elm.Line().left(2)
    elm.Line().down(1)
    elm.Ground()

    # ========================================================================
    # Flyback Transformer (T1): Primary connection to SW pin
    # ========================================================================
    # Circuit: +15V → T1 primary (p1-p2) → SW pin
    # T1 is a coupled transformer (47µH:47µH, 1:1 ratio)

    # Route from first tap point up and across to above SW pin
    elm.Line().at(vin_tap1).up(4.0)
    elm.Line().right(ic.SW[0] - d.here[0])
    elm.Line().down(1)
    t1_start = d.here

    # T1: Flyback transformer (MSD1514-473MED)
    # Oriented horizontally (.right()) with primary on left, secondary on right
    # Primary (p1-p2) connects between +15V and SW pin
    # Secondary (s1-s2) will connect to output rectifier (not shown)
    t1 = elm.Transformer(
        t1=TRANSFORMER_PRIMARY_TURNS,
        t2=TRANSFORMER_SECONDARY_TURNS
    ).right().anchor('p1').label('T1\n1:1', loc='left', fontsize=FONT_SIZE, ofst=(-0.5, 0))

    # Connect transformer p2 to IC SW pin
    elm.Line().at(t1.p2).to(ic.SW)

    # ========================================================================
    # Save Output
    # ========================================================================

    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, '../doc/static/circuits/inverter-u5-diagram.svg')
    d.save(output_path)

print("✓ LM2586 flyback converter diagram generated successfully")
