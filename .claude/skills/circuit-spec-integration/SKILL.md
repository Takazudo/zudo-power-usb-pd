---
name: circuit-spec-integration
description: Audit cross-component circuit behavior, evidence chains, substitutions, startup, rails, protection, thermal limits, and as-built state on board-a and board-b. Use whenever a question spans multiple exact component skills or changes USB-PD/NVM negotiation, the load switch, either DC-DC or linear stage, the board-to-board interface, protection, or bench claims.
---

# Circuit specification integration

Run `python3 .claude/skills/component-spec-audit/scripts/validate.py`, then read `references/rules.json` and load every exact owner skill named by all matching rules.

Resolve MPN and LCSC identifiers independently. Reject conflicts, same-name wrong-vendor parts, and ambiguous bare aliases. Directly load subordinate records; never answer only from their parent.

Use the listed fact IDs with their exact conditions and locators. `UNSOURCED` evidence cannot close a domain, and project connectivity cannot prove programmed, assembled, or bench state. For substitutions or design changes, report the affected rule, raw facts, recalculated margins, missing evidence stages, and one honest verdict. Do not silently change design files.

Run `python3 .claude/skills/circuit-spec-integration/scripts/check_forward_tests.py --strict` (the mode CI enforces) after editing rules, routes, facts, or evidence-chain state. Deterministic fixtures prove routing and discovery; the hash-locked `references/observed-runs.json` records explicit-skill policy rendering/refusal against frozen evidence and does not claim independent model discovery of IDs.

`references/rules.json` carries the committed cross-component rules — nine domains, mirrored exactly by `component-spec-audit/references/schema.json` `integration_domains` (both files must change together). `references/forward-tests.json` and the hash-locked `references/observed-runs.json` carry the deterministic forward cases; re-run the observed runs whenever a case's frozen expectations change. Full `--strict` runs of both gates additionally require the generator specs (`scripts/schgen/board_a_spec.py` / `board_b_spec.py`), which are committed — `--strict` is what CI runs.

## Human component reference

Human projection of this bundle: [the cross-component rules](/docs/components/integration/). Those pages are generated from the JSON files here and add nothing to them — where the two disagree, this bundle is correct. See also the [component catalog](/docs/components/catalog/) and the [component records](/docs/components/records/).
