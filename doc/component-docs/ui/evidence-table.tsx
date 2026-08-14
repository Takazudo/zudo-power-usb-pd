/** @jsxRuntime automatic */
/** @jsxImportSource preact */

/**
 * The scroll container a dense evidence table lives in.
 *
 * The generated tables are wide because the evidence is wide: a fact keeps its
 * value, unit, conditions, verdict, provenance and citation as six separate
 * columns because they are six separate claims, and none of them may be dropped
 * to make a phone fit. So the table keeps every column and the container
 * scrolls — the page body never does.
 *
 * `tabindex="0"` is the whole reason this is a component rather than a CSS
 * rule. A scrolling region that is not focusable can only be scrolled with a
 * pointer, which fails WCAG 2.1.1 (and is exactly what axe-core reports as
 * `scrollable-region-focusable`). CSS cannot add a tab stop; markup has to.
 *
 * Deliberately no `role="region"` and no `aria-label`. A region is a landmark
 * and a landmark wants a unique accessible name, and this component cannot
 * produce one: generated pages may only put slug-shaped values in a JSX
 * attribute, so the fact class that distinguishes one facts table from the next
 * on the same record cannot reach here. A silent focusable scroll box is
 * correct and unambiguous; several landmarks all called "Facts" would not be.
 * The heading directly above each table is what names it.
 *
 * SSR-only, like the other two components here — it is not an island, it
 * hydrates nothing, and the table inside it is plain generated markdown that is
 * present in the HTML and the search index either way.
 */

import type { ComponentChildren, JSX } from "preact";

/** The same shape the generator's `ATTRIBUTE_VALUE_PATTERN` enforces. */
const LABEL_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;

/**
 * The label is a presentation hook, not content: it selects the width class in
 * `global.css` and appears nowhere a reader can see it. An unrecognised label
 * is not an error — it simply falls back to the default width — so adding a
 * table to a renderer never silently breaks a page.
 */
function modifierFor(label: string): string {
  return LABEL_PATTERN.test(label) ? ` zld-evidence-table--${label}` : "";
}

export type EvidenceTableProps = {
  label: string;
  children?: ComponentChildren;
};

export function EvidenceTable({ label, children }: EvidenceTableProps): JSX.Element {
  return (
    <div class={`zld-evidence-table${modifierFor(label)}`} tabIndex={0}>
      {children}
    </div>
  );
}
