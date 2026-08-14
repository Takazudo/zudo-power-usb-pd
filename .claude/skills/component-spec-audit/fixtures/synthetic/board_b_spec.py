"""Synthetic board-b generator fixture; not a board specification and not component evidence.

R3 carries the same orderable as the DNP board-a placements and is fitted, so the fixture
inventory has one line that is simultaneously fitted and DNP depending on the placement.
"""

COMPONENTS = {
    "R3": ("0603WAF5101T5E_C23186", "5.1k", "C23186", "zudo-pd:R0603", False, (10.0, 10.0)),
    "J9": ("Conn_01x06_Pin", "B6B-XH-A", "C144397", "zudo-pd:HDR-TH_6P-FIXTURE", False, (30.0, 10.0)),
    "D1": ("FIXTURE-TVS-20A", "FIXTURE-TVS-20A", "C900002", "zudo-pd:SMA-FIXTURE", False, (50.0, 10.0)),
}

NETS = {}
