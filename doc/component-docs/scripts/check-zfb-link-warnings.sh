#!/usr/bin/env bash
set -euo pipefail

# Gate a captured `zfb build` log on link warnings.
#
# ## Why this exists instead of `failOnBroken: true`
#
# zfb's `linkValidation` resolves `#fragment` targets against HEADING-derived
# anchors only. Every anchor the component-docs generator emits is an
# `<EvidenceAnchor>` component id, and all three markup forms were probed
# directly: a heading anchor validates, a raw-HTML `id` warns, an MDX component
# id warns. No markup this generator can emit satisfies the checker, so every
# one of those warnings is false — the links do resolve in the built HTML.
#
# That leaves two obvious options, and both are wrong:
#
#   `failOnBroken: true`   fails every build on thousands of false positives;
#   ignore the log         means a genuinely broken HAND-AUTHORED link never
#                          surfaces, which is the failure mode that matters.
#
# What already covers the generated pages is `assertLinkIntegrity`, which runs
# on the VIEW MODEL inside the pipeline and is fatal there — it does not care
# what markup the renderers emit. That independence is also why the warning
# COUNT carries no signal: wrapping the evidence tables in a component dropped
# it from 4324 to 2536 with no change in link health, because zfb does not
# descend into JSX flow elements. Nothing here gates on a count, or on any
# expected number.
#
# ## What this suppresses, and what it refuses to
#
# Two classes are suppressed. Everything else fails — including a
# `zfb warn:` line whose SHAPE is not recognised. That last part is
# deliberate: if zfb changes its warning format, an unrecognised line has to
# turn CI red rather than silently switch this gate off.
#
# 1. A same-page `#fragment` reported against a file in the generated tree
#    (the class above).
#
# 2. `imageDimensions: cannot probe dimensions of '<path>': Could not decode
#    image` for a `public/circuits/*.svg`. These are schemdraw-generated
#    circuit diagrams (see `diagram-sources/*.py` at the repo root) — real,
#    openable SVGs (`file` reports "SVG Scalable Vector Graphics image"), but
#    zfb's dimension prober cannot parse the `pt`-unit / negative-origin
#    `viewBox` schemdraw emits. Pre-existing and unrelated to link health —
#    verified locally: every warning of this shape in a real build log names a
#    `public/circuits/*.svg`, never a hand-authored link.
#
# Usage: bash check-zfb-link-warnings.sh <build-log>
#   Locally:  pnpm build 2>&1 | tee /tmp/doc-build.log
#             bash component-docs/scripts/check-zfb-link-warnings.sh /tmp/doc-build.log

LOG="${1:-}"
if [ -z "$LOG" ] || [ ! -f "$LOG" ]; then
  echo "usage: check-zfb-link-warnings.sh <build-log>" >&2
  exit 2
fi

# The generated tree, as it appears in zfb's absolute warning paths.
GENERATED_TREE='/src/content/docs/components/'
# Where the schemdraw circuit SVGs live, as they appear in zfb's absolute
# warning paths.
CIRCUITS_TREE='/public/circuits/'

WORK="$(mktemp -d "${TMPDIR:-/tmp}/zfb-link-warnings-XXXXXX")"
cleanup() {
  case "$WORK" in
    */zfb-link-warnings-*) rm -rf "$WORK" ;;
    *) echo "refusing to clean an unexpected work path: $WORK" >&2 ;;
  esac
}
trap cleanup EXIT

KNOWN_LINKS="$WORK/known-false-links.txt"
KNOWN_DIMS="$WORK/known-false-dims.txt"
UNEXPECTED="$WORK/unexpected.txt"
: >"$KNOWN_LINKS"
: >"$KNOWN_DIMS"
: >"$UNEXPECTED"

awk -v known_links="$KNOWN_LINKS" -v known_dims="$KNOWN_DIMS" -v unexpected="$UNEXPECTED" \
    -v tree="$GENERATED_TREE" -v circuits="$CIRCUITS_TREE" '
  BEGIN {
    prefix = "zfb warn: "
    link_sep = ": broken link: "
    dims_prefix = "imageDimensions: cannot probe dimensions of '\''"
    dims_suffix = "'\'': Could not decode image"
  }
  index($0, prefix) != 1 { next }
  {
    rest = substr($0, length(prefix) + 1)

    at = index(rest, link_sep)
    if (at > 0) {
      path = substr(rest, 1, at - 1)
      target = substr(rest, at + length(link_sep))
      if (index(path, tree) > 0 && substr(target, 1, 1) == "#") {
        print > known_links
        next
      }
    }

    if (index(rest, dims_prefix) == 1) {
      body = substr(rest, length(dims_prefix) + 1)
      suffix_at = length(body) - length(dims_suffix) + 1
      if (suffix_at > 0 && substr(body, suffix_at) == dims_suffix) {
        path = substr(body, 1, suffix_at - 1)
        if (index(path, circuits) > 0 && path ~ /\.svg$/) {
          print > known_dims
          next
        }
      }
    }

    print > unexpected
  }
' "$LOG"

known_links_count=$(wc -l <"$KNOWN_LINKS")
known_dims_count=$(wc -l <"$KNOWN_DIMS")
unexpected_count=$(wc -l <"$UNEXPECTED")

if [ "$unexpected_count" -ne 0 ]; then
  echo "$unexpected_count zfb warning(s) outside the known-false classes:" >&2
  cat "$UNEXPECTED" >&2
  if [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "::error::${unexpected_count} zfb warning(s) are not one of the known-false classes (generated-anchor link, circuit-SVG dimension probe) — a hand-authored link is broken, a real image is unreadable, or zfb changed its warning format."
  fi
  exit 1
fi

echo "link check: no zfb warning outside the known-false classes"
echo "  suppressed  $known_links_count same-page fragment warning(s) in $GENERATED_TREE"
echo "              (false by construction — zfb resolves fragments against heading"
echo "               anchors only; assertLinkIntegrity proves these fatally on the"
echo "               view model. The count tracks markup choices, not link health.)"
echo "  suppressed  $known_dims_count image-dimension warning(s) in $CIRCUITS_TREE"
echo "              (schemdraw SVGs zfb's dimension prober cannot parse; the files"
echo "               are valid, openable images — see the script header.)"
if [ "$known_links_count" -gt 0 ]; then
  echo "  link sample:"
  head -5 "$KNOWN_LINKS" | sed 's/^/    /'
fi
if [ "$known_dims_count" -gt 0 ]; then
  echo "  dims sample:"
  head -5 "$KNOWN_DIMS" | sed 's/^/    /'
fi
