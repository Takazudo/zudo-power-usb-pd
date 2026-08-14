/** @jsxRuntime automatic */
/** @jsxImportSource preact */

/**
 * Static disclosure for the one kind of content on a generated page that is
 * looked up rather than read: a pin-assignment table.
 *
 * `<details>` is native HTML. It opens and closes with no JavaScript at all, so
 * this stays true to the rule that the static page is the complete reference:
 * the rows are in the generated file, in the built HTML and in `llms-full.txt`
 * whether or not the element is open. Site search is the one surface they do
 * not reach — zudo-doc's index truncates `body` to 300 characters, which the
 * disclosure has no bearing on.
 *
 * Nothing that carries a claim is ever wrapped in this. No value, condition,
 * verdict, coverage reason or source goes behind a disclosure: hiding those
 * would weaken the semantics the pages exist to preserve, which is the opposite
 * of the job. It exists to keep a twenty-row pad table from burying a record's
 * structure, and for nothing else.
 *
 * The summary text is authored here rather than passed in. Generated pages may
 * only put slug-shaped values in a JSX attribute — evidence text can never
 * reach one — so the generator names a label and this component owns the
 * wording. An unrecognised label degrades to a readable form of the slug rather
 * than rendering nothing, so a new label is never an invisible failure.
 */

import type { ComponentChildren, JSX } from "preact";

const SUMMARY_LABELS: Readonly<Record<string, string>> = {
  "pin-assignments": "Pin assignments",
};

function summaryFor(label: string): string {
  const known = SUMMARY_LABELS[label];
  if (known !== undefined) return known;
  const spaced = label.replace(/-/gu, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export type EvidenceDetailsProps = {
  label: string;
  children?: ComponentChildren;
};

export function EvidenceDetails({ label, children }: EvidenceDetailsProps): JSX.Element {
  return (
    <details class="zld-evidence-details">
      <summary>{summaryFor(label)}</summary>
      {children}
    </details>
  );
}
