"""Fixture spec module: adds a new net (STATUS) and a new pin on an existing
net (VCC gains J5.1) relative to fixtures/check_baseline/baseline.json —
modeling an intentional addition like a new interface connector.

Used by check_baseline.py --self-test to verify these deltas pass when
fixtures/check_baseline/allow.json is supplied, and fail when it is not
(the sanity check that --allow is actually doing something).
"""

NETS = {
    "GND": ["U1.1", "R1.2", "C1.2"],
    "VCC": ["U1.2", "R1.1", "C1.1", "J5.1"],
    "STATUS": ["U1.3", "J5.2"],
}
