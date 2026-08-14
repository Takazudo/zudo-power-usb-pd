const ALLOWED_ELEMENTS = new Set(["svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);
const ALLOWED_ATTRIBUTES = new Set([
  "xmlns", "viewBox", "width", "height", "preserveAspectRatio", "transform", "style", "d",
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "points",
  "fill", "stroke", "stroke-width", "fill-opacity", "stroke-opacity", "fill-rule",
  "stroke-linecap", "stroke-linejoin", "opacity",
]);
const DENIED_ATTRIBUTE = /^(?:on|href$|xlink:href$)/iu;
const EXTERNAL_VALUE = /(?:javascript:|data:|https?:|file:|url\s*\()/iu;

export type SvgDimensions = {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
};

export function normalizeSvg(source: string): string {
  const root = /<svg\b([^>]*)>/iu.exec(source);
  if (root === null) throw new Error("SVG root is missing");
  const viewBox = /\bviewBox="([^"]+)"/iu.exec(root[1] ?? "")?.[1];
  if (viewBox === undefined) throw new Error("SVG viewBox is missing");
  const dimensions = parseViewBox(viewBox);
  const end = source.lastIndexOf("</svg>");
  if (end < 0) throw new Error("SVG root is not closed");
  let body = source.slice((root.index ?? 0) + root[0].length, end);
  body = body.replace(/<title\b[^>]*>[\s\S]*?<\/title>/giu, "");
  body = body.replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/giu, "");
  body = body.trim().replace(/\r\n?/gu, "\n").replace(/[ \t]+$/gmu, "");
  const normalized = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${formatDimensions(dimensions)}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`,
    body,
    "</svg>",
    "",
  ].join("\n");
  validateSvg(normalized);
  return normalized;
}

export function validateSvg(source: string): SvgDimensions {
  if (source.length > 2 * 1024 * 1024) throw new Error("SVG exceeds the 2 MiB safety limit");
  if (/<!DOCTYPE|<\?xml|<!--|<!\[CDATA\[|&/iu.test(source)) throw new Error("SVG contains forbidden declarations or entities");
  const root = /<svg\b([^>]*)>/iu.exec(source);
  if (root === null) throw new Error("SVG root is missing");
  const viewBox = /\bviewBox="([^"]+)"/iu.exec(root[1] ?? "")?.[1];
  if (viewBox === undefined) throw new Error("SVG viewBox is missing");
  const dimensions = parseViewBox(viewBox);
  let visibleGeometry = 0;
  for (const match of source.matchAll(/<\/?([A-Za-z][\w:.-]*)([^>]*)>/gu)) {
    const closing = match[0].startsWith("</");
    const name = (match[1] ?? "").toLowerCase();
    if (!ALLOWED_ELEMENTS.has(name)) throw new Error(`SVG element ${name} is not allowed`);
    if (!closing) {
      const rawAttributes = match[2] ?? "";
      const attributes = new Map<string, string>();
      if (/(?:^|\s)(?:on[^\s=/>]*|href|xlink:href)\s*=/iu.test(rawAttributes)) {
        throw new Error("SVG contains an unsafe event or link attribute");
      }
      let unmatchedAttributes = rawAttributes;
      for (const attribute of rawAttributes.matchAll(/([^\s=/>]+)\s*=\s*(["'])([\s\S]*?)\2/gu)) {
        const attributeName = attribute[1] ?? "";
        const value = attribute[3] ?? "";
        if (!ALLOWED_ATTRIBUTES.has(attributeName)) throw new Error(`SVG attribute ${attributeName} is not allowed`);
        if (attributes.has(attributeName)) throw new Error(`SVG attribute ${attributeName} is duplicated`);
        attributes.set(attributeName, value);
        const namespaceDeclaration = attributeName === "xmlns" && value === "http://www.w3.org/2000/svg";
        if (DENIED_ATTRIBUTE.test(attributeName) || (!namespaceDeclaration && EXTERNAL_VALUE.test(value)) || /@import|expression\s*\(|behavior\s*:|-moz-binding|display\s*:\s*none|visibility\s*:\s*hidden/iu.test(value)) {
          throw new Error(`SVG attribute ${attributeName} is unsafe`);
        }
        unmatchedAttributes = unmatchedAttributes.replace(attribute[0], "");
      }
      if (unmatchedAttributes.replace(/\//gu, "").trim() !== "") throw new Error("SVG contains malformed or unquoted attributes");
      if (validateGeometry(name, attributes, dimensions)) visibleGeometry += 1;
    }
  }
  if (visibleGeometry === 0) throw new Error("SVG contains no visible geometry");
  if (source.replace(/<\/?[A-Za-z][\s\S]*?>/gu, "").trim() !== "") throw new Error("SVG contains unexpected text content");
  if (!source.trimEnd().endsWith("</svg>")) throw new Error("SVG has trailing markup");
  return dimensions;
}

function validateGeometry(name: string, attributes: ReadonlyMap<string, string>, box: SvgDimensions): boolean {
  const transform = attributes.get("transform");
  if (transform !== undefined && transform.replace(/\s+/gu, " ").trim() !== "translate(0 0) scale(1 1)") {
    throw new Error("SVG contains a non-identity transform");
  }
  if (name === "path") return validatePath(attributes.get("d") ?? "", box);
  if (name === "circle") {
    const cx = numeric(attributes, "cx");
    const cy = numeric(attributes, "cy");
    const radius = numeric(attributes, "r");
    if (radius < 0) throw new Error("SVG circle has a negative radius");
    contained(cx - radius, cy - radius, box);
    contained(cx + radius, cy + radius, box);
    return radius > 0;
  }
  return false;
}

function validatePath(data: string, box: SvgDimensions): boolean {
  if (data === "" || /[^MLAZ0-9eE+.,\s-]/u.test(data)) throw new Error("SVG path uses unsupported syntax");
  const tokens = data.match(/[MLAZ]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/gu) ?? [];
  let index = 0;
  let command = "";
  let coordinateCount = 0;
  while (index < tokens.length) {
    const token = tokens[index] as string;
    if (/^[MLAZ]$/u.test(token)) {
      command = token;
      index += 1;
      if (command === "Z") continue;
    }
    if (command === "M" || command === "L") {
      const x = finiteToken(tokens[index]);
      const y = finiteToken(tokens[index + 1]);
      contained(x, y, box);
      coordinateCount += 2;
      index += 2;
      if (command === "M") command = "L";
    } else if (command === "A") {
      const rx = finiteToken(tokens[index]);
      const ry = finiteToken(tokens[index + 1]);
      finiteToken(tokens[index + 2]);
      const largeArc = finiteToken(tokens[index + 3]);
      const sweep = finiteToken(tokens[index + 4]);
      const x = finiteToken(tokens[index + 5]);
      const y = finiteToken(tokens[index + 6]);
      if (rx < 0 || ry < 0 || ![0, 1].includes(largeArc) || ![0, 1].includes(sweep)) throw new Error("SVG arc is invalid");
      contained(x, y, box);
      coordinateCount += 2;
      index += 7;
    } else {
      throw new Error("SVG path is missing a supported command");
    }
  }
  return coordinateCount >= 4;
}

function numeric(attributes: ReadonlyMap<string, string>, name: string): number {
  const value = attributes.get(name);
  if (value === undefined || value.trim() === "" || !Number.isFinite(Number(value))) throw new Error(`SVG ${name} is not finite`);
  return Number(value);
}

function finiteToken(token: string | undefined): number {
  if (token === undefined || /^[MLAZ]$/u.test(token) || !Number.isFinite(Number(token))) throw new Error("SVG path contains a non-finite coordinate");
  return Number(token);
}

function contained(x: number, y: number, box: SvgDimensions): void {
  // KiCad includes stroke/crop rounding outside its nominal plot box (the
  // reviewed corpus peaks below 0.1 mm); tolerate that renderer fringe only.
  const epsilon = 0.1;
  if (x < box.minX - epsilon || x > box.minX + box.width + epsilon || y < box.minY - epsilon || y > box.minY + box.height + epsilon) {
    throw new Error("SVG geometry escapes its viewBox");
  }
}

function parseViewBox(value: string): SvgDimensions {
  const numbers = value.trim().split(/[\s,]+/u).map(Number);
  if (numbers.length !== 4 || numbers.some((number) => !Number.isFinite(number))) {
    throw new Error("SVG viewBox must contain four finite numbers");
  }
  const [minX, minY, width, height] = numbers as [number, number, number, number];
  if (width <= 0 || height <= 0 || width > 1000 || height > 1000) {
    throw new Error("SVG viewBox is degenerate or uncontained");
  }
  return { minX, minY, width, height };
}

function formatDimensions(dimensions: SvgDimensions): string {
  return [dimensions.minX, dimensions.minY, dimensions.width, dimensions.height]
    .map((number) => number.toFixed(4))
    .join(" ");
}
