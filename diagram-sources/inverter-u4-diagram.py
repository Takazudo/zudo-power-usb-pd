#!/usr/bin/env python3
"""
LM2596S-ADJ IC only (U4)
Complete circuit with transparent background, black foreground, Arial font
"""

import schemdraw
from schemdraw import elements as elm

with schemdraw.Drawing(
    font='Arial',         # Sans-serif font
    fontsize=11,
    color='black',        # Foreground: black
    transparent=True      # Transparent background
) as d:
    d.config(unit=3)

    # Just the IC
    ic = elm.Ic(
        pins=[
            elm.IcPin(name='GND', pin='3', side='left', slot='1/3'),
            elm.IcPin(name='ON', pin='5', side='left', slot='2/3'),
            elm.IcPin(name='VIN', pin='1', side='left', slot='3/3'),
            elm.IcPin(name='OUT', pin='2', side='right', slot='1/2'),
            elm.IcPin(name='FB', pin='4', side='right', slot='2/2'),
        ],
        edgepadW=2.5,
        edgepadH=0.8,
        pinspacing=1.0,
        leadlen=1.0
    ).label('U4\nLM2596S', loc='center', fontsize=10)

    # Input rail from VIN pin
    elm.Line().at(ic.VIN).left(2)
    elm.Dot() # to C10
    d.push()

    elm.Line().left(2)
    elm.Dot() # to C9
    d.push()

    elm.Line().left(2)
    elm.Dot(open=True).label('+15V\nIN', loc='left')

    # C10 capacitor (closer to IC) - establish bottom rail position first
    d.pop()
    elm.Line().down(0.5)
    elm.Capacitor().down().label('C10\n100nF', loc='bot')
    elm.Line().down(2)
    elm.Dot()
    bottom_rail_pos = d.here  # Save position of bottom rail

    # C9 capacitor (farther from IC) - align to bottom rail
    d.pop()
    elm.Line().down(0.5)
    elm.Capacitor().down().label('C9\n100µF', loc='bot')
    elm.Line().to((d.here[0], bottom_rail_pos[1]))
    elm.Dot()

    # GND pin to bottom rail
    elm.Line().at(ic.GND).to((ic.GND[0], bottom_rail_pos[1]))
    elm.Dot()

    # Output from OUT pin
    elm.Line().at(ic.OUT).right(1)
    elm.Dot() # to D3
    d.push()

    elm.Inductor().right().label('L3\n100µH', loc='bottom', ofst=0.5)
    elm.Dot() # to C11
    d.push()

    elm.Line().right(2)
    elm.Line().down(1)
    elm.Ground()

    # C11 capacitor (from "to C11" dot)
    d.pop()
    elm.Capacitor().down().label('C11\n470µF', loc='bot')
    elm.Line().to((d.here[0], bottom_rail_pos[1]))
    elm.Dot()

    # D3 diode (from "to D3" dot)
    d.pop()
    elm.Diode().down().reverse().label('D3\nSS34', loc='bot')
    elm.Line().to((d.here[0], bottom_rail_pos[1]))
    elm.Dot()

    # Save to doc/static/circuits/ (one level up from diagram-sources)
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, '../doc/static/circuits/inverter-u4-diagram.svg')
    d.save(output_path)

print("✓ U4 IC diagram generated with transparent background")
