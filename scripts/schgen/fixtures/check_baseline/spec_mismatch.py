"""Fixture spec module: genuinely drops a pin (GND loses R1.2) relative to
fixtures/check_baseline/baseline.json, with no corresponding --allow entry.

Used by check_baseline.py --self-test to verify a real mismatch is detected
(nonzero exit) rather than silently ignored.
"""

NETS = {
    "GND": ["U1.1", "C1.2"],
    "VCC": ["U1.2", "R1.1", "C1.1"],
}
