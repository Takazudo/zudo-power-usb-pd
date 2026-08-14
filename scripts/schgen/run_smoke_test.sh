#!/usr/bin/env bash
# Smoke-test the schgen generator against test_spec_smoke.py using real
# zudo-pd symbols, without touching the repo tree or requiring KiCad.
#
# Generates into a throwaway temp dir, parses the emitted .kicad_sch back
# via sexp.py, asserts the emitted global net labels equal the smoke spec's
# NETS, and runs the verify_geometry.py endpoint/collision checks (every
# label on a pin endpoint, no cross-net coordinate collisions, no_connect
# markers matching NO_CONNECT) against the emitted file.
#
# Usage: bash scripts/schgen/run_smoke_test.sh
# Exit codes: 0 PASS, 1 FAIL
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

python3 - "$SCRIPT_DIR" <<'PY'
import importlib
import os
import sys
import tempfile

script_dir = sys.argv[1]
sys.path.insert(0, script_dir)

import schgen_core
import verify_geometry
from sexp import load, atom, find_all

spec = importlib.import_module('test_spec_smoke')

with tempfile.TemporaryDirectory() as tmp_dir:
    # OUT becomes absolute here, so os.path.join(PROJ, OUT) inside
    # schgen_core.generate() discards PROJ and returns OUT unchanged —
    # generation never touches the repo tree.
    spec.OUT = os.path.join(tmp_dir, 'smoke.kicad_sch')
    out_path = schgen_core.generate(spec)

    tree = load(out_path)
    emitted_nets = {atom(node[1]) for node in find_all(tree, 'global_label')}
    expected_nets = set(spec.NETS.keys())

    if emitted_nets != expected_nets:
        print(f'FAIL: emitted global labels {sorted(emitted_nets)} != '
              f'spec NETS {sorted(expected_nets)}')
        sys.exit(1)

    problems = verify_geometry.run_check(spec, out_path)
    if problems:
        print(f'FAIL: verify_geometry found {len(problems)} problem(s):')
        for problem in problems:
            print(f'  - {problem}')
        sys.exit(1)

    # negative control: a corrupted label coordinate must be detected,
    # proving the geometry check can actually fail
    with open(out_path, encoding='utf-8') as f:
        text = f.read()
    needle = '(global_label "SMOKE_A"\n\t\t(shape passive)\n\t\t(at '
    i = text.index(needle) + len(needle)
    j = text.index(' ', i)
    broken = text[:i] + str(float(text[i:j]) + 1.27) + text[j:]
    broken_path = os.path.join(tmp_dir, 'smoke-broken.kicad_sch')
    with open(broken_path, 'w', encoding='utf-8') as f:
        f.write(broken)
    if not verify_geometry.run_check(spec, broken_path):
        print('FAIL: verify_geometry did not detect a corrupted label coordinate')
        sys.exit(1)

    print(f'PASS: {out_path} regenerated, '
          f'{len(emitted_nets)} global net labels match spec NETS, '
          f'geometry checks clean (and the negative control fails as it should)')
PY
