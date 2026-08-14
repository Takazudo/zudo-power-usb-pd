/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { Island } from "@takazudo/zfb";
import { PackageModelViewerIsland } from "../../src/component-model-viewer/package-model-viewer-island.tsx";

export type PackageModelViewerProps = { readonly descriptor: string };

/** SSR-safe MDX binding. Its child is statically imported by the owned route. */
export function PackageModelViewer(props: PackageModelViewerProps) {
  return (
    <Island when="visible">
      <PackageModelViewerIsland {...props} />
    </Island>
  );
}
