"""Board B (synth power conversion) spec — DC-DC + LDO + protection + output stages.

Content = the board-b connectivity baseline (scripts/schgen/baselines/board-b.json,
netlist-derived doc tables as-fixed: Net-(C16-Pad2) merged to GND, C9 = C970687
100uF 50V) + the locked wave-6 decisions from scripts/schgen/decisions.json:
  (a) TVS2 = Brightking SMAJ6.5A C87267 (replaces SD05/C502527), fitted
  (c) C4/C22/C23 canonical LCSC = C335982 (C22383803 is the alias, not emitted)
  (d) C5/C7 = 470uF/35V FOLLON C22387780 (same line as C14/C20/C21/C24/C25)
  (g) PTC1 = RUILON SMD1210P150TF/16 C7529589 (replaces SMD1210P200TF/C20808)
  P1 = zudo-pd:PogoPad_1x04 bare pads: 1=ATT (J5.3), 2=PDOK (J5.4), 3=GND, 4=NC
  TVS3 orientation LOCK: cathode (pin 1) to GND, anode (pin 2) to -12V rail
  (f) R1 stays 10k — the +13.5V setpoint is bench-gated, NOT changed here
  BB-3 disposition: U4's -0.93V clamp-table-point abs-max overage is an accepted
  transient-class residual — no part or topology change; bench surge test must
  observe the U4 effective-input node.

U4 inverting referencing is LOCKED: U4 GND (pin 3), ~ON/OFF (pin 5), and TAB
(pin 6) all ride the '/DC-DC Conversion/-13.5V OUT' net, L3.2 is the only
DC-DC-stage pin on system GND, and D3 points catch-diode-cathode (pin 1) at the
switch node with its anode (pin 2) on the negative output — exactly as the
baseline states.

Net names are kept byte-identical to the baseline so check_baseline.py diffs
cleanly; derived-not-baselined connectivity (output stage, LED indicators,
interface, test pads, BB-11 catch-diode returns, baseline unresolved-note-7
GND pins) is documented in scripts/schgen/baselines/board-b-allow.json.

LED symbol polarity per the component-bundle pin maps: KT-0603YG (green) has
pin 1 = A / pin 2 = K (reversed numbering vs the other two); KT-0603B (blue)
and KT-0603R (red) have pin 1 = K / pin 2 = A. LED4 conducts from GND (anode)
into the -12V indicator network (cathode toward R9).
"""

PROJECT_NAME = 'board-b'
OUT = 'boards/board-b/board-b.kicad_sch'
PAPER = 'A2'

_C100N = ('CC0805KRX7R9BB104', '100nF 50V', 'C1711', 'zudo-pd:C0805')
_C470N = ('CL10B474KA8NNNC', '470nF', 'C1623', 'zudo-pd:C0603')
_C470U_35 = ('EFVH035ADA471M10B0', '470uF 35V', 'C22387780', 'zudo-pd:CAP-SMD_BD10.0-L10.3-W10.3-LS11.0-FD')
_C470U_25 = ('GVT1E477M0810CNVC', '470uF 25V', 'C2983319', 'zudo-pd:CAP-SMD_BD10.0-L10.3-W10.3-LS11.0-FD')
_C470U_10 = ('RVT1A471M0607_C335982', '470uF 10V', 'C335982', 'zudo-pd:CAP-SMD_BD6.3-L6.6-W6.6-FD')
_C22N = ('CL21B223KBANNNC', '22nF', 'C1729', 'zudo-pd:C0805')
_R1K_LED = ('0805W8F1001T5E', '1k', 'C17513', 'zudo-pd:R0805')
_LM2596 = ('LM2596S-ADJ', 'LM2596S-ADJ', 'C347423', 'zudo-pd:TO-263-5_L10.2-W8.9-P1.70-BR')
_SS34 = ('SS34_C8678', 'SS34', 'C8678', 'zudo-pd:SMA_L4.3-W2.6-LS5.2-RD')
_L100U = ('CYA1265-100UH', '100uH', 'C19268674', 'zudo-pd:IND-SMD_L13.8-W12.8')
_SMAJ15A = ('SMAJ15A_C571368', 'SMAJ15A', 'C571368', 'zudo-pd:D-FLAT_L4.3-W2.6-LS5.3-RD')
_FASTON = ('1217754-1', '63951-1', 'C591344', 'zudo-pd:CONN-TH_1217754-1')
_EURO16 = ('2541WR-2X08P', '2541WR-2X08P', 'C5383092', 'zudo-pd:HDR-TH_16P-P2.54-H-M-R2-C8-S2.54')

COMPONENTS = {
    # DC-DC power path (row A)
    'U2':   (*_LM2596, False, (38.1, 50.8)),
    'D1':   (*_SS34, False, (88.9, 50.8)),
    'L1':   (*_L100U, False, (139.7, 50.8)),
    'U3':   (*_LM2596, False, (190.5, 50.8)),
    'D2':   (*_SS34, False, (241.3, 50.8)),
    'L2':   (*_L100U, False, (292.1, 50.8)),
    'U4':   (*_LM2596, False, (342.9, 50.8)),
    'D3':   (*_SS34, False, (393.7, 50.8)),
    'L3':   (*_L100U, False, (444.5, 50.8)),
    # LDOs + protection (row B)
    'U6':   ('L7812CD2T', 'L7812CD2T', 'C13456', 'zudo-pd:TO-263-2_L10.0-W9.1-P5.08-LS15.2-TL', False, (38.1, 101.6)),
    'U7':   ('L7805ABD2T', 'L7805ABD2T', 'C86206', 'zudo-pd:TO-263-2_L10.0-W9.2-P5.08-LS15.3-TL-CW', False, (88.9, 101.6)),
    'U8':   ('CJ7912', 'CJ7912', 'C94173', 'zudo-pd:TO-252-3_L6.5-W5.8-P4.58-BL', False, (139.7, 101.6)),
    'PTC1': ('SMD1210P150TF/16', 'SMD1210P150TF/16', 'C7529589', 'zudo-pd:F1210', False, (190.5, 101.6)),
    'PTC2': ('mSMD110-33V', 'mSMD110-33V', 'C70119', 'zudo-pd:F1812', False, (241.3, 101.6)),
    'PTC3': ('BSMD1206-150-16V', 'BSMD1206-150-16V', 'C883133', 'zudo-pd:F1206', False, (292.1, 101.6)),
    'TVS1': (*_SMAJ15A, False, (342.9, 101.6)),
    'TVS2': ('SMAJ6.5A_C87267', 'SMAJ6.5A', 'C87267', 'zudo-pd:D-FLAT_L4.3-W2.6-LS5.3-RD', False, (393.7, 101.6)),
    'TVS3': (*_SMAJ15A, False, (444.5, 101.6)),
    # DC-DC stage capacitors (row C)
    'C3':   (*_C470U_25, False, (38.1, 152.4)),
    'C4':   (*_C470U_10, False, (88.9, 152.4)),
    'C5':   (*_C470U_35, False, (139.7, 152.4)),
    'C6':   (*_C100N, False, (190.5, 152.4)),
    'C7':   (*_C470U_35, False, (241.3, 152.4)),
    'C8':   (*_C100N, False, (292.1, 152.4)),
    'C9':   ('RVT1H101M0810', '100uF 50V', 'C970687', 'zudo-pd:CAP-SMD_BD8.0-L8.3-W8.3-LS9.0-FD', False, (342.9, 152.4)),
    'C10':  (*_C100N, False, (393.7, 152.4)),
    'C11':  (*_C470U_25, False, (444.5, 152.4)),
    # LDO stage capacitors (rows D-E)
    'C14':  (*_C470U_35, False, (38.1, 203.2)),
    'C15':  (*_C470N, False, (88.9, 203.2)),
    'C16':  (*_C470N, False, (139.7, 203.2)),
    'C17':  (*_C100N, False, (190.5, 203.2)),
    'C18':  (*_C100N, False, (241.3, 203.2)),
    'C19':  (*_C100N, False, (292.1, 203.2)),
    'C20':  (*_C470U_35, False, (342.9, 203.2)),
    'C21':  (*_C470U_35, False, (393.7, 203.2)),
    'C22':  (*_C470U_10, False, (444.5, 203.2)),
    'C23':  (*_C470U_10, False, (38.1, 254)),
    'C24':  (*_C470U_35, False, (88.9, 254)),
    'C25':  (*_C470U_35, False, (139.7, 254)),
    # feedforward caps + feedback dividers (rows E-F)
    'C31':  (*_C22N, False, (190.5, 254)),
    'C32':  (*_C22N, False, (241.3, 254)),
    'C33':  (*_C22N, False, (292.1, 254)),
    'R1':   ('0603WAF1002T5E', '10k', 'C25804', 'zudo-pd:R0603', False, (342.9, 254)),
    'R2':   ('0603WAF1001T5E', '1k', 'C21190', 'zudo-pd:R0603', False, (393.7, 254)),
    'R3':   ('0603WAF5101T5E', '5.1k', 'C23186', 'zudo-pd:R0603', False, (444.5, 254)),
    'R4':   ('0603WAF1001T5E', '1k', 'C21190', 'zudo-pd:R0603', False, (38.1, 304.8)),
    'R5':   ('0603WAF1002T5E', '10k', 'C25804', 'zudo-pd:R0603', False, (88.9, 304.8)),
    'R6':   ('0603WAF1001T5E', '1k', 'C21190', 'zudo-pd:R0603', False, (139.7, 304.8)),
    # rail indicators (row F)
    'R7':   (*_R1K_LED, False, (190.5, 304.8)),
    'R8':   (*_R1K_LED, False, (241.3, 304.8)),
    'R9':   (*_R1K_LED, False, (292.1, 304.8)),
    'LED2': ('KT-0603YG', 'Green', 'C2289', 'zudo-pd:LED0603-RD', False, (342.9, 304.8)),
    'LED3': ('KT-0603B', 'Blue', 'C2288', 'zudo-pd:LED0603-RD', False, (393.7, 304.8)),
    'LED4': ('KT-0603R', 'Red', 'C2286', 'zudo-pd:LED0603-RD', False, (444.5, 304.8)),
    # interface, provisions, test pads, Faston outputs (row G)
    'J5':   ('B6B-XH-A', 'B6B-XH-A(LF)(SN)', 'C144397', 'zudo-pd:CONN-TH_B6B-XH-A-6P', False, (38.1, 355.6)),
    'P1':   ('PogoPad_1x04', 'ATT/PDOK pads', '', 'zudo-pd:PogoPad_1x04_P2.54mm', False, (88.9, 355.6)),
    'TP3':  ('TestPoint', '+13.5V', '', 'zudo-pd:TestPad_D1.5mm', False, (139.7, 355.6)),
    'TP4':  ('TestPoint', '+7.5V', '', 'zudo-pd:TestPad_D1.5mm', False, (190.5, 355.6)),
    'TP5':  ('TestPoint', '-13.5V', '', 'zudo-pd:TestPad_D1.5mm', False, (241.3, 355.6)),
    'J6':   (*_FASTON, False, (292.1, 355.6)),
    'J7':   (*_FASTON, False, (342.9, 355.6)),
    'J8':   (*_FASTON, False, (393.7, 355.6)),
    'J9':   (*_FASTON, False, (444.5, 355.6)),
    # Eurorack bus headers (row H)
    'J10':  (*_EURO16, False, (139.7, 393.7)),
    'J11':  (*_EURO16, False, (292.1, 393.7)),
}

NETS = {
    # --- baseline nets (names byte-identical to baselines/board-b.json) ---
    '+15V -> +13.5V gen': [
        'U2.1', 'C5.1', 'C6.1', 'U3.1', 'C7.1', 'C8.1', 'U4.1', 'C9.1', 'C10.1',
        'J5.1', 'J5.2',                       # A-B interface +15V pair (derived)
    ],
    'Net-(D1-K)': ['U2.2', 'D1.1', 'L1.1'],
    '/DC-DC Conversion/+13.5V OUT': [
        'L1.2', 'R1.2', 'C3.1', 'C31.2', 'C14.1', 'C20.1', 'U6.1',
        'TP3.1',                              # rail test pad (derived)
    ],
    'Net-(U2-Feedback)': ['U2.4', 'R1.1', 'R2.2', 'C31.1'],
    'Net-(D2-K)': ['U3.2', 'D2.1', 'L2.1'],
    '/DC-DC Conversion/+7.5V OUT': [
        'L2.2', 'R3.1', 'C4.1', 'C32.2', 'C15.1', 'C22.1', 'U7.1',
        'TP4.1',                              # rail test pad (derived)
    ],
    'Net-(U3-Feedback)': ['U3.4', 'R3.2', 'R4.1', 'C32.1'],
    'Net-(D3-K)': ['U4.2', 'D3.1', 'L3.1'],
    # U4 inverting referencing — LOCKED: GND/~ON-OFF/TAB bootstrap to -13.5V OUT
    '/DC-DC Conversion/-13.5V OUT': [
        'U4.3', 'U4.5', 'U4.6', 'D3.2', 'C9.2', 'C10.2', 'C11.2', 'R6.2',
        'C16.1', 'C24.2', 'U8.2',
        'TP5.1',                              # rail test pad (derived)
    ],
    'Net-(U4-Feedback)': ['U4.4', 'R5.1', 'R6.1', 'C33.1'],
    'GND': [
        # baseline rows
        'U2.3', 'U2.5', 'U2.6', 'R2.1', 'C5.2', 'C6.2',
        'U3.3', 'U3.5', 'U3.6', 'R4.2', 'C7.2', 'C8.2',
        'L3.2',
        'C14.2', 'C15.2', 'C17.1', 'C18.2', 'C20.2', 'C21.2', 'C22.2', 'C23.2',
        'U6.4', 'U7.2', 'U8.1',
        'C16.2', 'C24.1', 'C19.2', 'C25.1',
        # derived: BB-11 buck catch-diode ground returns
        'D1.2', 'D2.2',
        # derived: baseline unresolved note 7 (doc-implied DC-DC GND pins)
        'C3.2', 'C4.2', 'C11.1', 'R5.2', 'C33.2',
        # derived: A-B interface GND pair + P1 probe return
        'J5.5', 'J5.6', 'P1.3',
        # derived: indicator LED ground legs (green 2=K; blue 1=K; red 2=A on GND)
        'LED2.2', 'LED3.1', 'LED4.2',
        # derived: TVS ground legs (TVS3 cathode-to-GND is the locked orientation)
        'TVS1.2', 'TVS2.2', 'TVS3.1',
        # derived: output-stage GND (J9 Faston, J10/J11 pins 9-14 GND moat)
        'J9.1', 'J9.2',
        'J10.9', 'J10.10', 'J10.11', 'J10.12', 'J10.13', 'J10.14',
        'J11.9', 'J11.10', 'J11.11', 'J11.12', 'J11.13', 'J11.14',
    ],
    'Net-(U6-OUT)': ['U6.3', 'C17.2', 'C21.1', 'R7.1', 'PTC1.1'],
    'Net-(U7-OUT)': ['U7.3', 'C18.1', 'C23.1', 'R8.1', 'PTC2.1'],
    'Net-(U8-OUT)': ['U8.3', 'C19.1', 'C25.2', 'R9.1', 'PTC3.1'],
    # --- derived output-stage rails (post-PTC; baseline lists these as unresolved) ---
    '+12V rail': ['PTC1.2', 'TVS1.1', 'J7.1', 'J7.2', 'J10.7', 'J10.8', 'J11.7', 'J11.8'],
    '+5V rail':  ['PTC2.2', 'TVS2.1', 'J8.1', 'J8.2', 'J10.5', 'J10.6', 'J11.5', 'J11.6'],
    '-12V rail': ['PTC3.2', 'TVS3.2', 'J6.1', 'J6.2', 'J10.15', 'J10.16', 'J11.15', 'J11.16'],
    'GATE rail': ['J10.1', 'J10.2', 'J11.1', 'J11.2'],
    'CV rail':   ['J10.3', 'J10.4', 'J11.3', 'J11.4'],
    # --- derived interface signals (open-drain, no on-board pull-up on either board) ---
    'ATT':  ['J5.3', 'P1.1'],
    'PDOK': ['J5.4', 'P1.2'],
    # --- derived indicator midpoints (LED2 green: pin 1 = A; LED3/LED4: pin 1 = K) ---
    'Net-(R7-LED2)': ['R7.2', 'LED2.1'],
    'Net-(R8-LED3)': ['R8.2', 'LED3.2'],
    'Net-(R9-LED4)': ['R9.2', 'LED4.1'],
}

NO_CONNECT = [
    'P1.4',  # declared no-connect per the locked P1 form (decision p1-form)
]
