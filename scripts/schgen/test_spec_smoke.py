"""Minimal smoke-test spec for the schgen toolchain — not a real board.

Exercises schgen_core.generate() end-to-end (symbol-library lookup, pin-cache
building, global-label placement) against real zudo-pd symbols, without
requiring KiCad or a real board layout. See run_smoke_test.sh, which
regenerates this spec into a throwaway temp dir and checks the output.

0603WAF4700T5E (470R, LCSC C23179) and 0603WAF1001T5E (1k, LCSC C22548) are
real 2-pin resistor symbols in symbols/zudo-pd.kicad_sym, used on the
DC-DC/USB-PD sheets (e.g. R6, R13, R14) with footprint zudo-pd:R0603.
"""

PROJECT_NAME = 'schgen-smoke'
OUT = 'schgen-smoke.kicad_sch'  # overridden by run_smoke_test.sh to a temp path
PAPER = 'A4'

COMPONENTS = {
    'R1': ('0603WAF4700T5E', '470R', 'C23179', 'zudo-pd:R0603', False, (38.1, 38.1)),
    'R2': ('0603WAF1001T5E', '1k', 'C22548', 'zudo-pd:R0603', False, (76.2, 38.1)),
    'R3': ('0603WAF4700T5E', '470R', 'C23179', 'zudo-pd:R0603', False, (114.3, 38.1)),
}

NETS = {
    'SMOKE_A': ['R1.1', 'R2.1'],
    'SMOKE_B': ['R2.2', 'R3.1'],
}

NO_CONNECT = ['R1.2', 'R3.2']
