/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { defineChromeBindings } from "@takazudo/zudo-doc/chrome-bindings";
import { ComponentReferences } from "../component-docs/ui/component-references.tsx";
import { EvidenceAnchor } from "../component-docs/ui/evidence-anchor.tsx";
import { EvidenceDetails } from "../component-docs/ui/evidence-details.tsx";
import { EvidenceTable } from "../component-docs/ui/evidence-table.tsx";
import { PackageModelViewer } from "../component-docs/ui/package-model-viewer.tsx";

export const chromeBindings = defineChromeBindings({
  // Trailing item of the home hero link row, `/`-separated from the Overview
  // and GitHub links the package renders. Project-specific brand link
  // established in #1453; the package hero has no setting for it, so it comes
  // back through this slot.
  homeExtras: () => (
    <a
      href="https://x.com/Takazudo"
      class="text-fg underline hover:text-accent"
      target="_blank"
      rel="noopener noreferrer"
    >
      @Takazudo
    </a>
  ),
  mdxExtras: {
    EvidenceAnchor,
    EvidenceDetails,
    EvidenceTable,
    ComponentReferences,
    PackageModelViewer,
  },
});
