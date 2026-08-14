"""Board A (USB-PD sink core) spec — the post-fix baseline
(scripts/schgen/baselines/board-a.json: D4 removed, R17/R18 DNP, CC-debounce
0R links, D5 SMAJ20A, J4 interface connector) plus the wave-6 decision deltas
locked in scripts/schgen/decisions.json:

  (e) dec-e-q1-20v-gate-guard — D8 BZT52C11-7-F zener across Q1 gate-source
      (cathode/pin 1 on VBUS_IN = Q1 source, anode/pin 2 on Net-(Q1-G)),
      fitted by default. R11/R12 values and topology untouched.

J4 pinout is the locked A-B interface contract: 1-2 = +15V (VBUS_OUT, post-Q1),
3 = ATT (U1.11), 4 = PDOK (U1.20), 5-6 = GND."""

PROJECT_NAME = 'board-a'
OUT = 'boards/board-a/board-a.kicad_sch'
PAPER = 'A3'

# shared component tuples: (lib symbol, value, lcsc, footprint)
_C100N = ('CC0805KRX7R9BB104', '100nF/50V', 'C1711', 'zudo-pd:C0805')
_C1U = ('CL10A105KB8NNNC', '1uF/50V', 'C15849', 'zudo-pd:C0603')
_R470 = ('0603WAF4700T5E', '470R', 'C23179', 'zudo-pd:R0603')
_R4K7 = ('0603WAF4701T5E', '4.7k', 'C23162', 'zudo-pd:R0603')
_R5K1 = ('0603WAF5101T5E', '5.1k', 'C23186', 'zudo-pd:R0603')
_R0 = ('0603WAF0000T5E', '0R', 'C21189', 'zudo-pd:R0603')
_PESD = ('PESD24VS1UB_C85382', 'PESD24VS1UB', 'C85382', 'zudo-pd:SOD-523_L1.2-W0.8-LS1.6-RD')

# ref: (lib symbol, value, lcsc, footprint, dnp, (x, y))
COMPONENTS = {
    'J1':  ('USB-TYPE-C-009', 'USB-TYPE-C-009', 'C456012', 'zudo-pd:TYPE-C-SMD_TYPE-C-6P', False, (63.5, 88.9)),
    'U1':  ('STUSB4500QTR', 'STUSB4500QTR', 'C2678061', 'zudo-pd:QFN-24_L4.0-W4.0-P0.50-BL-EP2.8', False, (152.4, 88.9)),
    'Q1':  ('AO3401A_C347476', 'AO3401A', 'C347476', 'zudo-pd:SOT-23_L2.9-W1.3-P1.90-LS2.4-BR', False, (241.3, 50.8)),
    'D5':  ('SMAJ20A_C571370', 'SMAJ20A', 'C571370', 'zudo-pd:D-FLAT_L4.3-W2.6-LS5.3-RD', False, (203.2, 38.1)),
    'D6':  (*_PESD, True, (228.6, 241.3)),
    'D7':  (*_PESD, True, (266.7, 241.3)),
    'D8':  ('BZT52C11-7-F_C92321', 'BZT52C11-7-F', 'C92321', 'zudo-pd:SOD-123_L2.8-W1.8-LS3.7-RD', False, (266.7, 25.4)),
    'C1':  ('CL31A106KBHNNNE', '10uF/50V', 'C13585', 'zudo-pd:C1206', False, (38.1, 165.1)),
    'C2':  (*_C100N, False, (76.2, 165.1)),
    'C30': (*_C1U, False, (114.3, 165.1)),
    'C34': (*_C1U, False, (152.4, 165.1)),
    'C35': (*_C100N, False, (190.5, 165.1)),
    'R11': ('0603WAF1003T5E', '100k', 'C25803', 'zudo-pd:R0603', False, (38.1, 190.5)),
    'R12': ('0603WAF5602T5E', '56k', 'C23206', 'zudo-pd:R0603', False, (76.2, 190.5)),
    'R13': (*_R470, False, (114.3, 190.5)),
    'R14': (*_R470, False, (152.4, 190.5)),
    'R15': (*_R4K7, False, (190.5, 190.5)),
    'R16': (*_R4K7, False, (228.6, 190.5)),
    'R17': (*_R5K1, True, (38.1, 215.9)),
    'R18': (*_R5K1, True, (76.2, 215.9)),
    'R19': (*_R0, False, (114.3, 215.9)),
    'R20': (*_R0, False, (152.4, 215.9)),
    'J4':  ('B6B-XH-A', 'B6B-XH-A(LF)(SN)', 'C144397', 'zudo-pd:CONN-TH_B6B-XH-A-6P', False, (317.5, 88.9)),
    'J2':  ('PogoPad_1x04', 'PogoPad_1x4_NVM_I2C', '', 'zudo-pd:PogoPad_1x04_P2.54mm', False, (317.5, 139.7)),
    'J3':  ('PogoPad_1x08', 'PogoPad_1x8_Debug', '', 'zudo-pd:PogoPad_1x08_P2.54mm', False, (317.5, 190.5)),
    'TP1': ('TestPoint', 'TP_VBUS_OUT', '', 'zudo-pd:TestPad_D1.5mm', False, (355.6, 50.8)),
    'TP2': ('TestPoint', 'TP_GND', '', 'zudo-pd:TestPad_D1.5mm', False, (355.6, 76.2)),
    'TP6': ('TestPoint', 'TP_VBUS_VS_DISCH', '', 'zudo-pd:TestPad_D1.5mm', False, (355.6, 101.6)),
}

NETS = {
    'VBUS_IN':            ['J1.A9', 'J1.B9', 'U1.24', 'C1.2', 'C2.2', 'R14.1', 'R11.2', 'Q1.2', 'J3.4', 'D5.1', 'D8.1'],
    'CC1':                ['J1.A5', 'U1.2', 'R17.1', 'R19.2', 'D6.1'],
    'CC2':                ['J1.B5', 'U1.4', 'R18.1', 'R20.2', 'D7.1'],
    'CC1DB':              ['U1.1', 'R19.1', 'J3.1'],
    'CC2DB':              ['U1.5', 'R20.1', 'J3.2'],
    'VBUS_VS_DISCH':      ['U1.18', 'R14.2', 'TP6.1'],
    'VBEN':               ['U1.16', 'R12.1', 'J3.8'],
    'Net-(Q1-G)':         ['Q1.1', 'R11.1', 'R12.2', 'C35.1', 'D8.2'],
    'VBUS_OUT':           ['Q1.3', 'R13.1', 'TP1.1', 'J4.1', 'J4.2'],
    'Net-(U1-DISCH)':     ['U1.9', 'R13.2'],
    'VREG_2V7':           ['U1.23', 'C30.2', 'R15.2', 'R16.2', 'J3.3'],
    'Net-(U1-VREG_1V2)':  ['U1.21', 'C34.1'],
    'SCL-pin1':           ['U1.7', 'R15.1', 'J2.1'],
    'SDA-pin2':           ['U1.8', 'R16.1', 'J2.2'],
    'ATT':                ['U1.11', 'J3.6', 'J4.3'],
    'PDOK':               ['U1.20', 'J3.7', 'J4.4'],
    'GND':                ['U1.6', 'U1.10', 'U1.12', 'U1.13', 'U1.22', 'U1.25',
                           'J1.7', 'J1.A12', 'J1.B12',
                           'C1.1', 'C2.1', 'C30.1', 'C34.2', 'C35.2',
                           'R17.2', 'R18.2',
                           'TP2.1', 'J2.3', 'J3.5',
                           'D5.2', 'D6.2', 'D7.2',
                           'J4.5', 'J4.6'],
}

NO_CONNECT = ['U1.3', 'U1.14', 'U1.15', 'U1.17', 'U1.19', 'J2.4']

# Q1's vertical VBUS_OUT/VBUS_IN labels run through the default text spots
LABEL_OVERRIDES = {
    'Q1': {'Reference': (241.3 + 15.24, 50.8 - 7.62), 'Value': (241.3 + 15.24, 50.8 + 7.62)},
}
