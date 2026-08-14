"""Fixture spec module: exactly matches fixtures/check_baseline/baseline.json.

Used by check_baseline.py --self-test to verify a clean pass (exit 0, no
mismatches) with no --allow file.
"""

NETS = {
    "GND": ["U1.1", "R1.2", "C1.2"],
    "VCC": ["U1.2", "R1.1", "C1.1"],
}
