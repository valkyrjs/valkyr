import { ZodError } from "npm:zod@next";

export function toPrettyErrorLines(error: ZodError, padding: number = 0): string[] {
  const lines: string[] = [];
  const margin = " ".repeat(padding);
  const issues = [...error.issues].sort((a, b) => a.path.length - b.path.length);
  for (const issue of issues) {
    lines.push(`${margin}✖ ${issue.message}`);
    if (issue.path?.length) {
      lines.push(`${margin}  → at ${toDotPath(issue.path)}`);
    }
  }
  return lines;
}

function toDotPath(path: (string | number | symbol)[]): string {
  const segs: string[] = [];
  for (const seg of path) {
    if (typeof seg === "number") {
      segs.push(`[${seg}]`);
    } else if (typeof seg === "symbol") {
      segs.push(`["${String(seg)}"]`);
    } else if (seg.includes(".")) {
      segs.push(`["${seg}"]`);
    } else {
      if (segs.length) {
        segs.push(".");
      }
      segs.push(seg);
    }
  }
  return segs.join("");
}
