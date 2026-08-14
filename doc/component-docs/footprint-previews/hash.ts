import { createHash } from "node:crypto";

export function sha256(contents: string | Uint8Array): string {
  return createHash("sha256").update(contents).digest("hex");
}

export function aggregateHash(entries: readonly { readonly path: string; readonly sha256: string }[]): string {
  return sha256(entries.map((entry) => `${entry.path}\0${entry.sha256}\n`).join(""));
}
