# schgen — schematic generation from board spec modules

Board schematics under `boards/` are not hand-drawn. Each board is generated
from a Python spec module (e.g. a future `board_a_spec.py` / `board_b_spec.py`)
that lists components, positions, nets, and no-connects. The spec is the
source of truth; the `.kicad_sch` file is a build artifact of it.

This toolchain was ported from `zudo-led-lamp` as pure foundation — no board
spec modules exist yet. Board A (USB-PD sink core) and Board B (synth power
conversion) each get their own spec module in a later sub-issue; see
`doc/src/content/docs/inbox/board-split-decision.md` for the A/B interface
contract.

## Files

- `board_a_spec.py`, `board_b_spec.py` (not yet created) — per-board
  `COMPONENTS` / `NETS` / `NO_CONNECT` tables. Edit these, not the
  `.kicad_sch` directly, once they exist.
- `decisions.json` — the wave-6 decision lock for epic #86 (part swaps,
  provisions, dispositions the board specs must implement), with rationale and
  fact-ID evidence per decision. Machine-consumable source of truth; issue
  bodies #124/#125/#126 mirror it.
- `check_decisions.py` — offline validator for `decisions.json`: schema shape,
  required decision keys, and resolution of every evidence ID against the
  component-bundle / integration-rule fact base. Run:
  `python3 scripts/schgen/check_decisions.py`.
- `schgen_core.py` — shared generator: reads symbols from
  `symbols/zudo-pd.kicad_sym`, places components, and emits global labels for
  every net (no drawn wires) plus no-connect markers.
- `sexp.py` — tiny, dependency-free KiCad s-expression tokenizer/parser used
  by the generator, the verifier, and the smoke test. No KiCad install
  required.
- `gen_schematic.py` — CLI entry point: `generate()` a board from its spec.
  Usage: `python3 scripts/schgen/gen_schematic.py <spec_module>` — the spec
  module name is `sys.argv[1]` (an importable module name, not a path); there
  is no `--help`.
- `verify_netlist.py` — diffs a kicad-cli netlist export against a spec's
  `NETS`/`NO_CONNECT` tables and prints `PASS`/`FAIL`.
- `verify.sh` — wraps the kicad-cli export + `verify_netlist.py` call for one
  board. Local-only (see below); not run in CI.
- `test_spec_smoke.py` — minimal spec (3 real zudo-pd resistor symbols, 2
  nets, 2 no-connects) used only to smoke-test the generator itself. Not a
  real board.
- `run_smoke_test.sh` — regenerates `test_spec_smoke.py` into a throwaway
  temp dir (never touches the repo tree) and asserts the emitted global net
  labels match the spec's `NETS`. Requires only stock `python3` — no pip
  installs, no KiCad.

## Regen + verify workflow

1. Edit the spec module (`board_a_spec.py` or `board_b_spec.py`, once they
   exist) — add/move a component, change a net, etc.
2. Regenerate the schematic:
   ```
   python3 scripts/schgen/gen_schematic.py board_a_spec   # or board_b_spec
   ```
   This rewrites `boards/<board>/<board>.kicad_sch` in place. No KiCad
   install needed — `gen_schematic.py` only depends on `sexp.py`.
3. Verify connectivity against a real netlist export (requires a local KiCad
   install with `kicad-cli` on `PATH`):
   ```
   scripts/schgen/verify.sh board-a   # or board-b
   ```
   This runs `kicad-cli sch export netlist --format kicadsexpr` on the
   regenerated `.kicad_sch`, then diffs the result against the spec's `NETS`
   and `NO_CONNECT` tables via `verify_netlist.py`, printing `PASS`/`FAIL`.
4. Open the regenerated schematic in KiCad's Eeschema at least once (ERC,
   visual sanity) before committing.
5. Commit the spec module and the regenerated `.kicad_sch` together — never
   one without the other.

## Smoke test (no board, no KiCad)

To sanity-check the generator itself — e.g. after touching `schgen_core.py`
or `sexp.py` — run:

```
bash scripts/schgen/run_smoke_test.sh
```

This generates `test_spec_smoke.py` into a temp directory, parses the result
back with `sexp.py`, and asserts the emitted global labels equal the spec's
`NETS`. It needs stock `python3` only.

## kicad-cli availability

`verify.sh` degrades gracefully when `kicad-cli` is not on `PATH`: it prints
a `SKIPPED` marker and exits `0` rather than failing — this check runs
*before* even checking whether the board's schematic exists, so it degrades
cleanly against boards that haven't been created yet too. This is
intentional — netlist verification is a local-only check that needs a real
KiCad install (the CI runner has no KiCad). Install KiCad (kicad-cli ships
with the desktop app) to exercise the real path.

## What CI checks instead

CI cannot run kicad-cli. Once board spec modules exist, CI can enforce a
weaker but still useful invariant: **regen-idempotency** — run
`gen_schematic.py` for each board against the checked-out tree and fail the
build if that changes anything under `boards/` (`git diff --exit-code
boards/`). This catches "spec and committed schematic have drifted apart" —
e.g. someone edited a spec module and forgot to regenerate, or hand-edited a
`.kicad_sch` directly. It does **not** catch wiring mistakes; only a local
`verify.sh` run (or opening the file in KiCad) does that.
