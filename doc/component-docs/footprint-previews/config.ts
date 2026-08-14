import { join } from "node:path";

import { DOC_ROOT, FOOTPRINT_MASTER_ROOT, FOOTPRINT_ROOT } from "../adapters/circuit/paths.ts";

export const KICAD_IMAGE = "kicad/kicad@sha256:e638b79b0321f29395a5b783e94bb9f3c73303e8da15da27b8f5cb4b67a37729";
export const KICAD_VERSION = "9.0.9";
// The pinned digest publishes linux/amd64 only; stated explicitly so ARM hosts emulate
// rather than failing manifest resolution. Verified to render byte-identical output.
export const KICAD_PLATFORM = "linux/amd64";
export const EXPORT_LAYERS = ["F.Cu", "F.Silkscreen", "F.Fabrication", "F.Courtyard"] as const;
export const EXPORT_THEME = "KiCad Default";
export const EXPORT_OPTIONS = ["--black-and-white"] as const;
export const PREVIEW_FORMAT_VERSION = 1;

export const PREVIEW_ROOT = join(DOC_ROOT, "public", "assets", "component-previews", "footprints");
export const PREVIEW_MANIFEST = join(PREVIEW_ROOT, "manifest.json");
export { FOOTPRINT_MASTER_ROOT, FOOTPRINT_ROOT };
