/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { defineChromeBindings } from "@takazudo/zudo-doc/chrome-bindings";
import { ComponentReferences } from "../component-docs/ui/component-references.tsx";
import { EvidenceAnchor } from "../component-docs/ui/evidence-anchor.tsx";
import { EvidenceDetails } from "../component-docs/ui/evidence-details.tsx";
import { EvidenceTable } from "../component-docs/ui/evidence-table.tsx";
import { PackageModelViewer } from "../component-docs/ui/package-model-viewer.tsx";

export const chromeBindings = defineChromeBindings({
  mdxExtras: {
    EvidenceAnchor,
    EvidenceDetails,
    EvidenceTable,
    ComponentReferences,
    PackageModelViewer,
  },
});
