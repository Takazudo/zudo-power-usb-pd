"""Synthetic board-a generator fixture; not a board specification and not component evidence.

It exists so the inventory, placement-level DNP, exclusion, and candidate rules stay
testable before the real scripts/schgen specs exist. C23186 is deliberately DNP here and
fitted on the board-b fixture: that split is the exact case placement-level DNP protects.
"""

COMPONENTS = {
    "R17": ("0603WAF5101T5E_C23186", "5.1k", "C23186", "zudo-pd:R0603", True, (10.0, 10.0)),
    "R18": ("0603WAF5101T5E_C23186", "5.1k", "C23186", "zudo-pd:R0603", True, (10.0, 20.0)),
    "J9": ("Conn_01x06_Pin", "B6B-XH-A", "C144397", "zudo-pd:HDR-TH_6P-FIXTURE", False, (30.0, 10.0)),
    "TP1": ("TestPoint", "", "", "zudo-pd:FIXTURE-PAD", False, (40.0, 10.0)),
}

NETS = {}
