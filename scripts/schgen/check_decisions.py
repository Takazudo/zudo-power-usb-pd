#!/usr/bin/env python3
"""Validate scripts/schgen/decisions.json (the wave-6 decision lock for epic #86).

Checks, offline and dependency-free:
  1. shape: required top-level keys, required decision keys, unique ids
  2. per-decision contract: status enum, non-empty decision/rationale,
     >= 1 evidence reference, >= 1 applies_to target of a known form
  3. every evidence ID resolves against the repo fact base
     (.claude/skills/component-*/ JSONs, circuit-spec-integration rules.json,
     component-spec-audit candidates.json)
  4. dated_observations carry ISO dates; LCSC numbers match ^C[0-9]+$

Usage: python3 scripts/schgen/check_decisions.py [path-to-decisions.json]
Exit 0 = PASS, 1 = FAIL (one line per problem on stderr).
"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DECISIONS = REPO_ROOT / "scripts" / "schgen" / "decisions.json"

REQUIRED_TOP_KEYS = {"schema_version", "source_issue", "locked_date", "review_report", "decisions"}
REQUIRED_DECISION_KEYS = {
    "a", "b", "c", "d", "e", "f", "g",
    "p1-form", "tvs3-orientation", "bb3-disposition", "ba2-disposition",
}
REQUIRED_FIELDS = {"key", "id", "title", "status", "applies_to", "decision", "rationale", "evidence"}
STATUS_ENUM = {"LOCKED", "NO-SPEC-CHANGE-NEEDS-BENCH", "DISPOSITION"}
APPLIES_TO_RE = re.compile(r"^(#\d+|board_[ab]_spec|doc)$")
LCSC_RE = re.compile(r"^C\d+$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ID_VALUE_RE = re.compile(r"^(fact|int|cov|rule|calc|cand|rec|src|line)-[A-Za-z0-9./+-]+$")

FACT_BASE_GLOBS = [
    ".claude/skills/component-*/*.json",
    ".claude/skills/circuit-spec-integration/references/*.json",
    ".claude/skills/component-spec-audit/references/candidates.json",
]


def collect_known_ids(root: Path) -> set:
    """Every value of a key ending in `_id` across the fact-base JSON files."""
    known = set()

    def walk(node):
        if isinstance(node, dict):
            for k, v in node.items():
                if k.endswith("_id") and isinstance(v, str):
                    known.add(v)
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    for pattern in FACT_BASE_GLOBS:
        for path in root.glob(pattern):
            try:
                walk(json.loads(path.read_text()))
            except (json.JSONDecodeError, OSError) as exc:
                print(f"WARN: unreadable fact-base file {path}: {exc}", file=sys.stderr)
    return known


def main() -> int:
    decisions_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DECISIONS
    errors = []

    try:
        doc = json.loads(decisions_path.read_text())
    except (json.JSONDecodeError, OSError) as exc:
        print(f"FAIL: cannot load {decisions_path}: {exc}", file=sys.stderr)
        return 1

    missing_top = REQUIRED_TOP_KEYS - set(doc)
    if missing_top:
        errors.append(f"missing top-level keys: {sorted(missing_top)}")
    if not DATE_RE.match(str(doc.get("locked_date", ""))):
        errors.append(f"locked_date is not YYYY-MM-DD: {doc.get('locked_date')!r}")

    decisions = doc.get("decisions", [])
    keys = [d.get("key") for d in decisions]
    ids = [d.get("id") for d in decisions]
    missing_keys = REQUIRED_DECISION_KEYS - set(keys)
    if missing_keys:
        errors.append(f"missing required decision keys: {sorted(missing_keys)}")
    for name, values in (("key", keys), ("id", ids)):
        dupes = {v for v in values if values.count(v) > 1}
        if dupes:
            errors.append(f"duplicate decision {name}s: {sorted(dupes)}")

    known_ids = collect_known_ids(REPO_ROOT)
    if not known_ids:
        errors.append("fact base resolved to zero known IDs -- glob roots wrong?")

    referenced = 0
    for d in decisions:
        label = d.get("id") or d.get("key") or "<unnamed>"
        missing_fields = REQUIRED_FIELDS - set(d)
        if missing_fields:
            errors.append(f"{label}: missing fields {sorted(missing_fields)}")
            continue
        if d["status"] not in STATUS_ENUM:
            errors.append(f"{label}: status {d['status']!r} not in {sorted(STATUS_ENUM)}")
        for field in ("title", "decision", "rationale"):
            if not str(d[field]).strip():
                errors.append(f"{label}: empty {field}")
        if not d["applies_to"]:
            errors.append(f"{label}: empty applies_to")
        for target in d["applies_to"]:
            if not APPLIES_TO_RE.match(target):
                errors.append(f"{label}: applies_to target {target!r} not '#N', 'board_a_spec', 'board_b_spec', or 'doc'")
        if not d["evidence"]:
            errors.append(f"{label}: empty evidence")
        for ref in d["evidence"]:
            referenced += 1
            if not ID_VALUE_RE.match(ref):
                errors.append(f"{label}: evidence ref {ref!r} is not a recognized ID form")
            elif ref not in known_ids:
                errors.append(f"{label}: evidence ref {ref!r} does not resolve in the fact base")
        for part in [d.get("winner")] + list(d.get("runners_up", [])):
            if part and not LCSC_RE.match(part.get("lcsc", "")):
                errors.append(f"{label}: LCSC number {part.get('lcsc')!r} is not C<digits>")
        for obs in d.get("dated_observations", []):
            if not DATE_RE.match(obs.get("date", "")):
                errors.append(f"{label}: dated_observation without YYYY-MM-DD date: {obs!r}")

    if errors:
        for e in errors:
            print(f"FAIL: {e}", file=sys.stderr)
        return 1

    print(
        f"PASS: decisions.json contract; {len(decisions)} decisions; "
        f"{referenced} evidence refs resolved against {len(known_ids)} known fact-base IDs"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
