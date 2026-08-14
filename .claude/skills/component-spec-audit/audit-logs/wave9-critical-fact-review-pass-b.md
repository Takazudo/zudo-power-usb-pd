# Wave 9 critical-fact review — independent pass B

Issue #128 (Final confirm: strict parity flip + full gate run + cross-repo contract
check). Scope: the `rail`, `converter`, `thermal`, and `current` destructive-risk
domains from `.claude/skills/component-spec-audit/references/schema.json`
`critical_review_domains`.

This pass is independent of the foreground review recorded in
`fixtures/golden/critical-fact-review.json` (`reviews[].reviewer` = "issue-128 worktree
child (Claude Sonnet 5), foreground destructive-risk review") and of independent pass A
(`wave9-critical-fact-review-pass-a.md`): each `CALCULATED` fact below was recomputed
from its own cited leaf facts rather than trusting the recorded result, and each
`PRIMARY-SPEC` fact was re-checked against its source's retained evidence extract.

## rev-rail-ptc1b-vmax-margin — fact-ptc1b-vmax-margin

Recomputed: `fact-ptc1b-vmax` (16 V, `src-ptc1b-smd1210-datasheet` Page 2 row
`SMD1210P150TF/16`) minus the +12V nominal rail = 4 V, matching the fact's recorded
value exactly. Independently cross-checked against the sibling
`fact-ptc1-vmax-margin` (the superseded SMD1210P200TF/6V part on the same +12V rail),
whose margin is -6 V — a deterministic spec violation. This confirms
`scripts/schgen/decisions.json` decision (g)'s rationale for swapping PTC1 to the /16
variant is exactly what turns a negative margin into this fact's positive one; the
review is not rubber-stamping an isolated number, it is reconfirming the fix that makes
the number correct. Fact verdict is `PASS - primary-source confirmed`; review status:
`CONFIRMED`. Destructive-risk framing: an under-rated PTC voltage rating fails
catastrophically (arcing/venting) under a downstream fault on the +12V rail, rather than
tripping safely.

## rev-converter-lm2596-u4-absmax-margin — fact-lm2596-u4-absmax-margin

Recomputed: `fact-lm2596-vin-absmax` (45 V, `src-lm2596-umw-ds` Absolute Maximum Ratings
table) minus `fact-lm2596-u4-effective-input` (28.5 V = 15 V board input + 13.5 V
`|VOUT|`, bootstrapped-GND per the datasheet's Inverting Regulator section) = 16.5 V,
matching the fact's recorded value exactly. Fact verdict is `NEEDS BENCH` (the fact's
own `conditions` flag input transients/ringing as out of scope for this static margin);
review status: `OPEN`. Destructive-risk framing: U4 runs the inverting buck-boost
topology with its GND pin bootstrapped to the negative output, so its effective
device-referred input is board input plus output magnitude, not just the +15V rail —
exceeding the 45V absolute maximum here damages U4, and the margin is close enough
(16.5V on a 45V limit, i.e. no safety factor beyond ~1.6x) that input-side transients
are a legitimate open bench item rather than a formality.

## rev-thermal-cj7912-tj-rise — fact-cj7912-tj-rise-full-load

Recomputed: `fact-cj7912-pd-full-load-mw` (1200 mW) times `fact-cj7912-rthja` (100
degC/W) / 1000 = 120 degC rise, matching the fact's recorded value exactly. At Ta=25C
this implies Tj ~145C, above the +125C operating junction limit in
`fact-cj7912-tj-operating-range`, unless board-b's actual copper materially improves on
`src-cj7912-project-docs`'s free-air-basis RthJA. This is a genuine destructive-risk
finding this review surfaces rather than closes: `NEEDS BENCH` is the correct fact
verdict (over-temperature operation degrades or destroys U8), not a documentation-only
gap waiting on paperwork. Review status: `OPEN`.

## rev-current-ptc1-itrip — fact-ptc1-itrip

Source: `src-ptc1-smd1210-datasheet` (RUILON SMD1210 Series, MANUFACTURER_PRIMARY,
AVAILABLE). Its retained `evidence_extract` states the row verbatim: "row
'SMD1210P200TF' ... Itrip=4.00A". Matches `fact-ptc1-itrip`'s recorded value and unit
exactly. Independently cross-checked against the sibling `fact-ptc1-ihold` (2.0 A, same
record) for internal consistency: `Itrip` (4.0A) exceeds `Ihold` (2.0A) as required for
a resettable fuse to have a well-defined trip window between "never trips" and "always
trips". Fact verdict is `PASS - primary-source confirmed`; review status: `CONFIRMED`.
Destructive-risk framing: an inverted or mistranscribed trip/hold pair would leave a
downstream fault either untripped (thermal/fire risk) or trip on normal load (nuisance
disconnection masking the fuse's protective role).

— issue-128 worktree child (Claude Sonnet 5), independent pass B
