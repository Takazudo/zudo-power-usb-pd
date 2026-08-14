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
 * Ships without an enlarge dialog: led-lamp's `preview-enlarge-dialog.tsx`
 * imports `useModalDialog` / `ENLARGE_DIALOG_STYLE` / `AFTER_NAVIGATE_EVENT`
 * from `@takazudo/zudo-doc` subpaths that do not exist at the installed
 * `^0.2.9` here. A later sub-issue adds a hand-rolled native `<dialog>` for
 * both preview kinds; until then the figure plus the "Open SVG" link is the
 * whole affordance.
 */
export function FootprintPreview(props: FootprintPreviewProps) {
  return (
    <Island when="visible">
      <FootprintPreviewIsland {...props} />
    </Island>
  );
}
