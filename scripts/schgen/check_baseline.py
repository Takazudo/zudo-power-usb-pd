#!/usr/bin/env python3
"""check_baseline.py — diff a spec module's NETS dict against a committed
connectivity baseline JSON.

Usage:
    python3 scripts/schgen/check_baseline.py <spec_module> <baseline.json> [--allow <deltas.json>]
    python3 scripts/schgen/check_baseline.py --self-test

<spec_module> is either a filesystem path to a .py file, or a dotted module
name importable on sys.path. It must define a module-level NETS dict:

    NETS = {"<NETNAME>": ["<Ref.Pin>", ...], ...}

<baseline.json> has the shape produced under scripts/schgen/baselines/:

    {"nets": {"<NETNAME>": ["<Ref.Pin>", ...], ...}, "unresolved": [...]}

Only the "nets" key is diffed; "unresolved" is documentation for humans and
is not consulted by this tool.

--allow <deltas.json> names intentional deltas between the spec and the
baseline so they don't count as mismatches (e.g. the J4/J5 interface-
connector additions, or other locked wave-6 decisions the netlist-derived
baseline predates). Shape:

    {
      "added_nets": ["<NETNAME>", ...],
      "removed_nets": ["<NETNAME>", ...],
      "added_pins": {"<NETNAME>": ["<Ref.Pin>", ...], ...},
      "removed_pins": {"<NETNAME>": ["<Ref.Pin>", ...], ...}
    }

"added_*" = present in the spec but not the baseline, allowed.
"removed_*" = present in the baseline but not the spec, allowed.

Every declared delta is also required to actually be true of the spec: an
"added_*" entry must be present in the spec, and a "removed_*" entry must be
absent from it. A stale or wrong --allow entry (e.g. claiming a pin was added
when the spec never added it) is itself reported as a mismatch, so --allow
can't silently paper over an incomplete implementation.

Exit 0 = spec matches the baseline, modulo allowed deltas that actually hold.
Exit 1 = mismatch found; the diff is printed to stdout.
"""

import argparse
import importlib
import importlib.util
import json
import sys
from pathlib import Path


def _load_module(spec_module_arg):
    """Load a spec module from either a filesystem .py path or a dotted
    module name on sys.path."""
    path = Path(spec_module_arg)
    if path.suffix == ".py" or path.exists():
        module_spec = importlib.util.spec_from_file_location(path.stem, path)
        if module_spec is None or module_spec.loader is None:
            raise SystemExit(f"error: could not load spec module from {spec_module_arg}")
        module = importlib.util.module_from_spec(module_spec)
        module_spec.loader.exec_module(module)
        return module
    return importlib.import_module(spec_module_arg)


def load_spec_nets(spec_module_arg):
    module = _load_module(spec_module_arg)
    if not hasattr(module, "NETS"):
        raise SystemExit(f"error: {spec_module_arg} has no top-level NETS dict")
    return {name: set(pins) for name, pins in module.NETS.items()}


def load_baseline_nets(baseline_path):
    with open(baseline_path) as f:
        data = json.load(f)
    return {name: set(pins) for name, pins in data.get("nets", {}).items()}


def load_allow(allow_path):
    if allow_path is None:
        return {"added_nets": set(), "removed_nets": set(), "added_pins": {}, "removed_pins": {}}
    with open(allow_path) as f:
        data = json.load(f)
    return {
        "added_nets": set(data.get("added_nets", [])),
        "removed_nets": set(data.get("removed_nets", [])),
        "added_pins": {k: set(v) for k, v in data.get("added_pins", {}).items()},
        "removed_pins": {k: set(v) for k, v in data.get("removed_pins", {}).items()},
    }


def diff(baseline_nets, spec_nets, allow):
    """Return a list of human-readable mismatch strings; empty means clean."""
    problems = []
    baseline_names = set(baseline_nets)
    spec_names = set(spec_nets)

    missing_nets = (baseline_names - spec_names) - allow["removed_nets"]
    extra_nets = (spec_names - baseline_names) - allow["added_nets"]
    for name in sorted(missing_nets):
        problems.append(f"missing net (in baseline, not in spec): {name}")
    for name in sorted(extra_nets):
        problems.append(f"extra net (in spec, not in baseline, not allowed): {name}")

    for name in sorted(baseline_names & spec_names):
        baseline_pins = baseline_nets[name]
        spec_pins = spec_nets[name]
        allowed_removed = allow["removed_pins"].get(name, set())
        allowed_added = allow["added_pins"].get(name, set())
        missing_pins = (baseline_pins - spec_pins) - allowed_removed
        extra_pins = (spec_pins - baseline_pins) - allowed_added
        for pin in sorted(missing_pins):
            problems.append(f"net {name}: missing pin (in baseline, not in spec): {pin}")
        for pin in sorted(extra_pins):
            problems.append(f"net {name}: extra pin (in spec, not in baseline, not allowed): {pin}")

    problems.extend(_check_allow_fulfilled(spec_nets, allow))
    return problems


def _check_allow_fulfilled(spec_nets, allow):
    """A declared --allow delta is a claim about the spec, not just a
    license to ignore a diff. Verify each claim actually holds, so a stale
    or wrong allow-list entry surfaces as a mismatch instead of silently
    masking an incomplete implementation."""
    problems = []

    for name in sorted(allow["added_nets"]):
        if name not in spec_nets:
            problems.append(f"allow-list: declared added net not found in spec: {name}")

    for name in sorted(allow["removed_nets"]):
        if name in spec_nets:
            problems.append(f"allow-list: declared removed net still present in spec: {name}")

    for name in sorted(allow["added_pins"]):
        spec_pins = spec_nets.get(name, set())
        for pin in sorted(allow["added_pins"][name]):
            if pin not in spec_pins:
                problems.append(f"allow-list: declared added pin not found in spec: net {name}: {pin}")

    for name in sorted(allow["removed_pins"]):
        spec_pins = spec_nets.get(name, set())
        for pin in sorted(allow["removed_pins"][name]):
            if pin in spec_pins:
                problems.append(f"allow-list: declared removed pin still present in spec: net {name}: {pin}")

    return problems


def run_check(spec_module_arg, baseline_path, allow_path):
    baseline_nets = load_baseline_nets(baseline_path)
    spec_nets = load_spec_nets(spec_module_arg)
    allow = load_allow(allow_path)
    return diff(baseline_nets, spec_nets, allow)


# --- self-test ---------------------------------------------------------

def run_self_test():
    fixtures_dir = Path(__file__).parent / "fixtures" / "check_baseline"
    baseline_path = fixtures_dir / "baseline.json"
    allow_path = fixtures_dir / "allow.json"

    checks = [
        ("clean pass", run_check(fixtures_dir / "spec_clean.py", baseline_path, None) == []),
        (
            "allowed delta passes with --allow",
            run_check(fixtures_dir / "spec_allowed_delta.py", baseline_path, allow_path) == [],
        ),
        (
            "same delta fails without --allow (sanity check)",
            run_check(fixtures_dir / "spec_allowed_delta.py", baseline_path, None) != [],
        ),
        (
            "real mismatch is detected",
            run_check(fixtures_dir / "spec_mismatch.py", baseline_path, None) != [],
        ),
        (
            "unfulfilled allow-list declaration is detected",
            run_check(fixtures_dir / "spec_clean.py", baseline_path, allow_path) != [],
        ),
    ]

    all_ok = True
    for name, ok in checks:
        print(f"[{'PASS' if ok else 'FAIL'}] {name}")
        all_ok = all_ok and ok

    return 0 if all_ok else 1


# --- CLI -----------------------------------------------------------------

def main(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("spec_module", nargs="?", help="path to a .py spec module, or a dotted module name")
    parser.add_argument("baseline", nargs="?", help="path to a baseline JSON file")
    parser.add_argument("--allow", default=None, help="path to an allowed-deltas JSON file")
    parser.add_argument("--self-test", action="store_true", help="run the bundled fixture self-test and exit")
    args = parser.parse_args(argv)

    if args.self_test:
        return run_self_test()

    if not args.spec_module or not args.baseline:
        parser.error("spec_module and baseline are required unless --self-test is given")

    problems = run_check(args.spec_module, args.baseline, args.allow)

    if problems:
        print(f"check_baseline: {len(problems)} mismatch(es) vs {args.baseline}")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    allow_note = f" (allowed deltas from {args.allow})" if args.allow else ""
    print(f"check_baseline: OK — spec matches {args.baseline}{allow_note}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
