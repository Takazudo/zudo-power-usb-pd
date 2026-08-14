/** @jsxRuntime automatic */
/** @jsxImportSource preact */

/**
 * A stable in-page link target for a record, source, fact, coverage domain,
 * interaction or pin map.
 *
 * Why a component instead of a heading: heading anchors are derived from
 * heading TEXT, so rewording a heading silently breaks every external link to
 * it. Evidence IDs never change once published, so anchoring on the ID keeps
 * `…/records/al8860mp-13/#fact-al8860-vin-absolute-max` valid across
 * rewording. The generator emits these; `id` always comes from a provider ID
 * that matched `SLUG_PATTERN`.
 *
 * SSR-only by design — it is not an island and hydrates nothing, so the page
 * remains complete with JavaScript disabled.
 */

import type { JSX } from "preact";

export type EvidenceAnchorProps = {
  id: string;
};

export function EvidenceAnchor({ id }: EvidenceAnchorProps): JSX.Element {
  return <span class="zld-evidence-anchor" id={id} aria-hidden="true" />;
}
