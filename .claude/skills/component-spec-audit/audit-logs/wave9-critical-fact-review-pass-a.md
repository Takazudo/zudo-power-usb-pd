# Wave 9 critical-fact review — independent pass A

Issue #128 (Final confirm: strict parity flip + full gate run + cross-repo contract
check). Scope: the `connector`, `polarity`, `pin`, and `default-state` destructive-risk
domains from `.claude/skills/component-spec-audit/references/schema.json`
`critical_review_domains`.

This pass is independent of the foreground review recorded in
`fixtures/golden/critical-fact-review.json` (`reviews[].reviewer` = "issue-128 worktree
child (Claude Sonnet 5), foreground destructive-risk review"): rather than re-reading
the foreground reviewer's own notes, each item below is re-derived directly against the
cited source's retained evidence and, where a stronger independent cross-check exists
elsewhere in the repo (a generator spec, a symbol library, an already-locked pin map),
against that cross-check too.

## rev-connector-jst-identity — fact-jst-b6b-xh-a-identity

Source: `src-jst-xh-header` (JST eXH.pdf header-dimensions catalog,
MANUFACTURER_PRIMARY, AVAILABLE), Page 5 Header table row B6B-XH-A and note 1. Live
re-fetch of `https://www.jst.com/wp-content/uploads/2025/06/eXH.pdf` during this pass
reproduced SHA-256 `1128a1bdb747cf3da211ed85e11c542f2d310652d8188a69b2dc0e8c40115ef8`,
matching the source's locked hash exactly (also recorded as refresh evidence in
`fixtures/refresh-evidence.json`). The source's Page 5 table row confirms the six-circuit
top-entry through-hole B6B-XH-A(LF)(SN) orderable, matching
`fact-jst-b6b-xh-a-identity`'s recorded value exactly. Cross-checked against
`fixtures/golden/real-pin-maps.json`'s already-locked `pinmap-jst-b6b-xh-a` entry (same
6-pin, 2.5 mm-pitch header). Fact verdict is `PASS - primary-source confirmed`; review
status: `CONFIRMED`. Destructive-risk framing: the wrong header identity (wrong pitch or
circuit count) would let a cable mate incorrectly or under mechanical stress, defeating
the keying that otherwise makes a reversed or cross-header connection physically
impossible; the A-to-B power/signal pinout itself (`fact-jst-b6b-xh-a-locked-contract`)
is a separate project-decision fact, still `NEEDS BENCH`, not re-reviewed here because
its `conditions` field names the sibling cross-repo interface-donor project (the one
compared against in issue #128's cross-repo contract check) and this pass keeps that
identifier out of files scanned by
`test_validate.py::test_no_led_lamp_identifiers_survived_the_port`.

## rev-polarity-d8-orientation — fact-bzt52c11-d8-orientation

Source: `src-bzt52c11-diodes-primary` (Diodes Inc. DS18004 Rev. 38-2,
MANUFACTURER_PRIMARY, AVAILABLE), Page 1 mechanical data: "Polarity: Cathode Band". The
fact's circuit-orientation claim (cathode/pin 1 on VBUS_IN, anode/pin 2 on
Net-(Q1-G)) is a project wiring assertion, not something the manufacturer datasheet can
confirm on its own — so this pass re-derived it directly from
`scripts/schgen/board_a_spec.py`'s `NETS` dict rather than trusting the foreground
review's restatement: `VBUS_IN` lists `'D8.1'` and `Net-(Q1-G)` lists `'D8.2'`,
confirming cathode(pin 1)=VBUS_IN / anode(pin 2)=Net-(Q1-G) exactly as claimed. Fact
verdict is `NEEDS BENCH` (Eeschema ERC/visual review and soft-start bench measurement
still pending per the fact's own `conditions`), so this review's status is `OPEN`.
Destructive-risk framing: if D8 were placed backwards, it would forward-conduct at the
operating `|Vgs|` instead of blocking, collapsing the R11/R12 gate-divider voltage and
risking uncontrolled AO3401A load-switch gate drive.

## rev-pin-lm2596-pinout — fact-lm2596-pinout

Source: `src-lm2596-umw-ds` (UMW LM2596S-ADJ datasheet, MANUFACTURER_PRIMARY,
AVAILABLE), Pin Descriptions table (printed page 3): VIN/Output/GND/Feedback/ON-OFF for
the 5-lead TO-263 package. Matches `fact-lm2596-pinout`'s recorded value exactly.
Independently cross-checked against `symbols/zudo-pd.kicad_sym`'s `LM2596S-ADJ` symbol
(used unmodified for U2/U3/U4 in `scripts/schgen/board_b_spec.py`) and against the
already-locked `pinmap-lm2596s-adj` entry in `fixtures/golden/real-pin-maps.json`, which
assigns the same five roles plus the thermal TAB pin — no drift between the datasheet,
the symbol, and the locked pin map. Fact verdict is `PASS - primary-source confirmed`,
so this review's status is `CONFIRMED`. Destructive-risk framing: a VIN/GND pin swap in
layout would put the full +15V input directly across the input capacitor bank to GND.

## rev-default-state-stusb-vben — fact-stusb-vben

Source: `src-stusb-ds12499` (STUSB4500 DS12499 Rev 8, `authority_class`
`MANUFACTURER_MIRROR`, AVAILABLE — a web-archive mirror of ST's own PDF, not a
first-party ST domain fetch). Per `references/contract.md`, a `PRIMARY-SPEC` fact can
only reach `PASS` from an `AVAILABLE` `MANUFACTURER_PRIMARY` source; a mirror cannot
close that trust gap. This matches the fact's own recorded `provenance: UNVERIFIED` /
`verdict: UNSOURCED` — confirmed, not contradicted, by this pass. Independently checked
the hardware fallback: `fact-c25803-topology` (component-project-passives bundle)
documents R11 (100 kOhm) as a passive pull-up from `Net-(Q1-G)` to `VBUS_IN`, holding
Q1's gate high (load switch OFF) regardless of `VBUS_EN_SNK`'s power-up logic level. The
destructive default-state risk — the load switch conducting before a PD contract is
negotiated — is independently mitigated by this passive network even though the pin's
own reset-state claim stays unsourced from a primary datasheet. Review status:
`UNSOURCED`, matching the fact's verdict per the contract's own rule.

— issue-128 worktree child (Claude Sonnet 5), independent pass A
