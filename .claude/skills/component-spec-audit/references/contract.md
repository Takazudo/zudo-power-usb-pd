# Frozen component-spec contract (version 1)

The central inventory is generated-spec identity truth; an owner record is evidence truth. One inventory line represents one nonblank LCSC/orderable identity and may have many placements across `board-a` and `board-b`. Bare-copper pogo and test pads remain explicit exclusions.

DNP belongs to a placement, never to a line. The same orderable is DNP at one board and refdes and fitted at another, so every placement carries its own reviewed `dnp` flag and the generator spec locks each one. A line-level `dnp` key is invalid.

A candidate is a researched replacement part that no generator spec places. It is not an inventory line, does not count toward inventory assertions, and may not reuse a placed LCSC. Its evidence lives in an owner bundle under this same contract, in a record whose `line_id` is null and whose `candidate_id` names the candidate entry. Every record sets exactly one of `line_id` and `candidate_id`, so unplaced research never weakens manifest-to-inventory parity.

Every standalone or subordinate record uses the same files and schema. Subordinates receive their own record, source, fact, interaction, routing, coverage, and pin-map IDs; parentage changes organization, never rigor.

A subordinate's `parent_record_id` resolves to a standalone record in the same bundle. Each record lists exactly all and only its assigned source, fact, and interaction IDs, has direct positive/negative routing plus coverage and pin-map data, and owns no unexplained orphan data. Each open domain is a named entry matched one-for-one by `OPEN` coverage with an explicit reason.

Every coverage entry also carries a machine-readable `blocking_fact_ids` array. For an `OPEN` entry it names the exact same-record facts whose non-PASS verdicts keep the domain open; each member must carry a verdict of `UNSOURCED` or `NEEDS BENCH`, or cite a `SOURCE UNAVAILABLE` source. The converse is enforced too: whenever any fact listed in `fact_ids` meets that same blocking test, `blocking_fact_ids` must name at least one of them. It may be empty only when no listed fact addresses the domain in that sense — a `NOT APPLICABLE` fact never blocks, so an `OPEN` entry whose only evidence is `NOT APPLICABLE` correctly keeps the array empty. Independently, a reason whose text claims evidence is unavailable, lower-authority, or `UNSOURCED` must cite those facts through `blocking_fact_ids` rather than leave the claim unverifiable.

## Evidence retention

A source lock records document title/number, revision/date, primary and optional alternate authoritative URLs, retrieval date, authority class, SHA-256, physical PDF page index, printed label, and exact section/table/figure/row locator. Retain a normalized, minimal evidence extract beside the locator so a reviewer can audit a critical claim without redistributing a PDF. An inaccessible source is `SOURCE UNAVAILABLE`; its SHA-256 is always the all-zero sentinel. Its extract may remain for audit history but cannot promote a new claim or invite a memory-based fallback.

Fact classes are `ABSOLUTE_MAXIMUM`, `RECOMMENDED_OPERATION`, `GUARANTEED_ELECTRICAL`, `TYPICAL_CURVE`, `TRANSIENT`, `PROTECTION_STANDOFF`, `PROTECTION_BREAKDOWN`, `PROTECTION_CLAMP`, `THERMAL_SOA`, and `PROJECT_STATE`. Provenance is `PRIMARY-SPEC`, narrowly scoped `DISTRIBUTOR-IDENTITY`, `REFERENCE-DESIGN`, `CALCULATED`, `PROJECT-CHOICE`, `BENCH-OBSERVED`, or `UNVERIFIED`. Every quantitative fact carries an explicit unit and conditions; textual facts use unit `NONE`. Calculated facts list raw fact IDs and an evaluable arithmetic expression. Cycles are invalid.

Only these verdicts are valid: `PASS - primary-source confirmed`, `CONFIRMED - distributor identity only`, `BLOCKER - deterministic spec violation`, `NEEDS BENCH`, `UNSOURCED`, and `NOT APPLICABLE`. Distributor identity confirmation is valid only for an `AVAILABLE` `DISTRIBUTOR_IDENTITY` source and a `PROJECT_STATE` identity fact; it cannot support electrical/thermal limits, calculations, primary PASS, or deterministic BLOCKER.

`PRIMARY-SPEC` may receive a PASS only from an `AVAILABLE` `MANUFACTURER_PRIMARY` source. A calculated PASS is trusted only when every raw leaf in its dependency closure is such a primary-source PASS. Its expression names exactly the transformed fact IDs in `depends_on`; undeclared, unused, self, missing, or cyclic dependencies fail.

Unknown identity, source, open harness/mechanical domains, unavailable URLs, and unexplained coverage gaps stay explicit. Generic-family, distributor, or same-name cross-vendor data never silently stands in for the exact orderable.

## Staged and strict validation

`validate.py` runs staged by default and strict under `--strict`. Staged tolerates exactly two forms of incompleteness while the two boards are being built: an inventory owner whose skill directory does not exist yet, and absent generator specs — including one board's spec being absent while the other's is present (each board is built in its own worktree), in which case every generator-derived check is restricted to the present boards and the absent board is named in a STAGED-SKIP line. It never relaxes a rule about data that is present — every committed bundle is validated in full, and an owner directory that no inventory line or candidate assigns is an error in both modes. Staged prints every gate it skipped, so a staged PASS is never mistaken for a strict one. Strict restores generator identity parity, KiCad pin-asset parity, exact owner-directory parity, exact inventory-to-record parity, and the non-empty review, refresh-evidence, pin-lock, and cross-component-rule requirements.
