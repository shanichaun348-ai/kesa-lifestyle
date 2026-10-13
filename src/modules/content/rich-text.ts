/**
 * The small bit of formatting the owner types into product copy:
 * `**bold**`, lines starting with `- ` (or `* ` / `• `) as bullet points,
 * and one paragraph per line. Nothing else is interpreted, and the text
 * is never treated as HTML, so pasted content cannot inject markup.
 *
 * `parseRichText` is what the product page renders; `plainText` strips the
 * marks for places that want prose only (meta description, structured
 * data, cards, dialogs).
 */

export type InlineRun = { text: string; bold: boolean };

export type RichBlock =
  | { kind: "paragraph"; runs: InlineRun[] }
  | { kind: "list"; items: InlineRun[][] };

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;
const BOLD = /\*\*([^*]+?)\*\*/g;

/** Splits one line into bold and plain runs; unmatched `**` stays as typed. */
export function parseInline(line: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let last = 0;
  for (const match of line.matchAll(BOLD)) {
    const start = match.index ?? 0;
    if (start > last) runs.push({ text: line.slice(last, start), bold: false });
    runs.push({ text: match[1]!, bold: true });
    last = start + match[0].length;
  }
  if (last < line.length) runs.push({ text: line.slice(last), bold: false });
  return runs;
}

/** Paragraphs and bullet lists from the owner's text. Blank lines are skipped. */
export function parseRichText(text: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = BULLET.exec(line);
    if (bullet) {
      const item = parseInline(bullet[1]!.trim());
      const previous = blocks[blocks.length - 1];
      if (previous?.kind === "list") previous.items.push(item);
      else blocks.push({ kind: "list", items: [item] });
    } else {
      blocks.push({ kind: "paragraph", runs: parseInline(line) });
    }
  }
  return blocks;
}

/** The same text with the marks removed, one line per paragraph or bullet. */
export function plainText(text: string): string {
  return parseRichText(text)
    .flatMap((block) => (block.kind === "paragraph" ? [block.runs] : block.items))
    .map((runs) => runs.map((r) => r.text).join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the text carries any of the marks `parseRichText` understands. */
export function hasRichMarks(text: string): boolean {
  return BOLD.test(text) || text.split(/\r?\n/).some((line) => BULLET.test(line));
}
