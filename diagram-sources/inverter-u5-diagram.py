#!/usr/bin/env python3
"""
ICL7660 Voltage Inverter: +15V → -15V
Complete circuit with transparent background, black foreground, Arial font
"""

import os
import schemdraw
from schemdraw import elements as elm

with schemdraw.Drawing(
    font='Arial',
    fontsize=11,
    color='black',
    transparent=True
) as d:
    d.config(unit=3)

    # ICL7660M voltage inverter IC (8-pin)
    # Use empty names for CAPP/CAPN to hide default labels
    ic = (elm.Ic(
        pins=[
            elm.IcPin(name='GND', pin='3', side='left', slot='1/4'),
            elm.IcPin(name='NC', pin='1', side='left', slot='2/4'),
            elm.IcPin(name='VIN', pin='8', side='left', slot='3/4'),
            elm.IcPin(name='', pin='2', side='top', slot='2/7', anchorname='CAPP'),
            elm.IcPin(name='', pin='4', side='top', slot='6/7', anchorname='CAPN'),
            elm.IcPin(name='LV', pin='6', side='right', slot='1/4'),
            elm.IcPin(name='OSC', pin='7', side='right', slot='2/4'),
            elm.IcPin(name='VOUT', pin='5', side='right', slot='3/4'),
        ],
        edgepadW=2.5,
        edgepadH=0.8,
        pinspacing=0.8,
        leadlen=1.0,
        pinlblsize=14
    ).label('U5\nICL7660M', loc='center', fontsize=14)
     .label('CAPP', 'CAPP', fontsize=14, ofst=(0, -1.5))
     .label('CAPN', 'CAPN', fontsize=14, ofst=(0, -1.5))
    )

    # GND connection
    elm.Line().at(ic.GND).left(0.5)
    elm.Line().down(1.0)
    elm.Ground()

    # +15V input
    elm.Dot(open=True).at((ic.VIN[0] - 1.5, ic.VIN[1])).label('+15V\nIN', loc='top', ofst=(0.5, 0.5), fontsize=14)
    elm.Line().to(ic.VIN)

    # Flying capacitor C12 (between CAPP and CAPN)
    cap_plus_top = (ic.CAPP[0], ic.CAPP[1] + 1.0)
    cap_minus_top = (ic.CAPN[0], ic.CAPN[1] + 1.0)

    elm.Line().at(ic.CAPP).up(1.0)
    elm.Dot()
    d.push()

    elm.Line().at(ic.CAPN).up(1.0)
    elm.Dot()

    # Draw horizontal line connecting the capacitor
    elm.Line().at(cap_plus_top).to(cap_minus_top)

    # Add capacitor label at center
    cap_center = ((cap_plus_top[0] + cap_minus_top[0]) / 2, cap_plus_top[1])
    elm.Label().at(cap_center).label('C12\n10µF', loc='top', ofst=0.3)

    # Output: -15V with filter capacitor C13
    elm.Line().at(ic.VOUT).right(1)
    elm.Dot()
    output_junction = d.here
    d.push()

    # C13 output filter capacitor
    elm.Capacitor().down(2.0).label('C13\n10µF', loc='bot')
    elm.Ground()

    # -15V output label
    d.pop()
    elm.Line().right(1.5)
    elm.Dot(open=True).label('-15V\nOUT', loc='top', fontsize=14, ofst=(-0.5, 0.5))

    # LV and OSC pins left open (floating)
    # No connections needed - just labels showing they're open

    # Save to doc/static/circuits/
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, '../doc/static/circuits/inverter-u5-diagram.svg')
    d.save(output_path)

print("✓ Voltage inverter diagram generated with transparent background")
