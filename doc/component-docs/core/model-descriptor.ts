export const MODEL_ASSET_BASE = "/assets/component-previews/models/";

export type ModelVector = { readonly x: number; readonly y: number; readonly z: number };

export type ModelViewerDescriptor = {
  readonly version: 1;
  readonly packageId: string;
  readonly packageLabel: string;
  readonly modelUrl: string;
  readonly offset: ModelVector;
  readonly rotation: ModelVector;
  readonly scale: ModelVector;
};

const SAFE_TEXT = /^[A-Za-z0-9][A-Za-z0-9 ._+(),/-]*$/u;
const SAFE_MODEL_URL = /^\/assets\/component-previews\/models\/[A-Za-z0-9][A-Za-z0-9._+-]*\.wrl$/u;
const HEX = /^(?:[0-9a-f]{2})+$/u;

export function encodeModelDescriptor(descriptor: ModelViewerDescriptor): string {
  assertModelDescriptor(descriptor);
  return [...new TextEncoder().encode(JSON.stringify(descriptor))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function decodeModelDescriptor(encoded: string): ModelViewerDescriptor {
  if (!HEX.test(encoded) || encoded.length > 4096) throw new Error("Invalid model descriptor encoding");
  const bytes = new Uint8Array(encoded.length / 2);
  for (let index = 0; index < encoded.length; index += 2) {
    bytes[index / 2] = Number.parseInt(encoded.slice(index, index + 2), 16);
  }
  const candidate: unknown = JSON.parse(new TextDecoder().decode(bytes));
  assertModelDescriptor(candidate);
  return candidate;
}

export function assertModelDescriptor(value: unknown): asserts value is ModelViewerDescriptor {
  if (typeof value !== "object" || value === null) throw new Error("Model descriptor must be an object");
  const descriptor = value as Record<string, unknown>;
  const keys = Object.keys(descriptor).sort().join(",");
  if (keys !== "modelUrl,offset,packageId,packageLabel,rotation,scale,version") {
    throw new Error("Model descriptor has unexpected fields");
  }
  if (
    descriptor.version !== 1 ||
    typeof descriptor.packageId !== "string" ||
    !SAFE_TEXT.test(descriptor.packageId) ||
    typeof descriptor.packageLabel !== "string" ||
    !SAFE_TEXT.test(descriptor.packageLabel) ||
    typeof descriptor.modelUrl !== "string" ||
    !SAFE_MODEL_URL.test(descriptor.modelUrl)
  ) {
    throw new Error("Model descriptor identity or URL is unsafe");
  }
  for (const key of ["offset", "rotation", "scale"] as const) assertVector(descriptor[key], key);
}

function assertVector(value: unknown, name: string): asserts value is ModelVector {
  if (typeof value !== "object" || value === null) throw new Error(`${name} must be a vector`);
  const vector = value as Record<string, unknown>;
  if (Object.keys(vector).sort().join(",") !== "x,y,z") throw new Error(`${name} has unexpected fields`);
  for (const axis of ["x", "y", "z"] as const) {
    const coordinate = vector[axis];
    if (typeof coordinate !== "number" || !Number.isFinite(coordinate) || Math.abs(coordinate) > 1e6) {
      throw new Error(`${name}.${axis} is invalid`);
    }
  }
}
