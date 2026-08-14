"use client";

/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { useEffect, useRef, useState } from "preact/hooks";

export type FootprintPreviewIslandProps = {
  readonly assetUrl: string;
  readonly footprintName: string;
  readonly footprintPath: string;
};

/**
 * Fork from led-lamp: no enlarge dialog.
 *
 * led-lamp's island also renders a `PreviewEnlargeDialog` trigger button. That
 * dialog needs `useModalDialog` / `ENLARGE_DIALOG_STYLE` / `AFTER_NAVIGATE_EVENT`
 * from `@takazudo/zudo-doc` subpaths this project's installed `^0.2.9` does not
 * export, so it is deliberately not ported here — a later sub-issue adds a
 * hand-rolled native `<dialog>` for both this and the 3D-model preview. The
 * `<img>` link plus the caption's "Open SVG" link is the whole affordance
 * until then.
 *
 * `data-footprint-preview-state` still flips "no-js" -> "ready" once the
 * image has actually decoded, matching led-lamp's contract — nothing in this
 * fork's CSS currently depends on that state, but it stays because it is the
 * truthful signal a reader (or a check script) can read regardless of what
 * consumes it.
 */
export function FootprintPreviewIsland({ assetUrl, footprintName, footprintPath }: FootprintPreviewIslandProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isImageReady, setImageReady] = useState(false);
  const alt = `Footprint preview for ${footprintName}`;

  useEffect(() => {
    const image = imageRef.current;
    if (image === null) return;
    const markReady = () => setImageReady(image.naturalWidth > 0);
    if (image.complete) markReady();
    else image.addEventListener("load", markReady, { once: true });
    return () => image.removeEventListener("load", markReady);
  }, [assetUrl]);

  return (
    <figure
      className="zld-component-references__footprint"
      data-footprint-preview-state={isImageReady ? "ready" : "no-js"}
    >
      <div className="zld-component-references__footprint-frame">
        <a href={assetUrl} aria-label={`Open footprint SVG for ${footprintName}`}>
          <img ref={imageRef} src={assetUrl} alt={alt} onLoad={() => setImageReady(true)} />
        </a>
      </div>
      <figcaption>
        Shared footprint package: <code>{footprintName}</code>. <a href={assetUrl}>Open SVG</a>
        <br />
        Source: <code>{footprintPath}</code>
      </figcaption>
    </figure>
  );
}

FootprintPreviewIsland.displayName = "FootprintPreviewIsland";
