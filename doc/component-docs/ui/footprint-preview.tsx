/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { Island } from "@takazudo/zfb";
import { FootprintPreviewIsland } from "../../src/component-preview/footprint-preview-island.tsx";

export type FootprintPreviewProps = {
  readonly assetUrl: string;
  readonly footprintName: string;
  readonly footprintPath: string;
};

/**
 * SSR-safe footprint preview with a static direct-link fallback.
 *
 * The enlarge affordance is progressive: the SSR figure is a plain image
 * inside a link to the SVG, and the hydrated island adds the enlarge trigger
 * plus the shared `PreviewEnlargeDialog`.
 */
export function FootprintPreview(props: FootprintPreviewProps) {
  return (
    <Island when="visible">
      <FootprintPreviewIsland {...props} />
    </Island>
  );
}
