/** Removes every fp_text form while preserving all other canonical bytes verbatim. */
export function suppressFootprintText(source: string): string {
  const ranges: Array<readonly [number, number]> = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "(") {
      if (/^\(fp_text\s/u.test(source.slice(index))) start = index;
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth < 0) throw new Error("unbalanced footprint expression");
      if (start >= 0 && depth === depthAt(source, start)) {
        let end = index + 1;
        if (source[end] === "\r") end += 1;
        if (source[end] === "\n") end += 1;
        ranges.push([start, end]);
        start = -1;
      }
    }
  }
  if (depth !== 0 || inString || start >= 0) throw new Error("unbalanced footprint expression");
  let result = source;
  for (const [rangeStart, rangeEnd] of ranges.reverse()) {
    result = result.slice(0, rangeStart) + result.slice(rangeEnd);
  }
  if (/\(fp_text\s/u.test(result)) throw new Error("failed to suppress footprint text");
  return result;
}

function depthAt(source: string, target: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < target; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
  }
  return depth;
}
