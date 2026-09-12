// Lightweight formatter for the streamed Deep Dive report. The report model
// emits plain text with `##`-style section headings, blank-line-separated
// paragraphs, and (per the report prompt's EMPHASIS rule) the one load-bearing
// sentence per section wrapped in **double asterisks**. The parchment report
// view has no markdown renderer, so this turns that text into a simple block
// structure the view maps to <h2>/<p>/<strong>. Kept pure + tested; safe to run
// on partial text mid-stream.

export interface Segment {
  text: string;
  bold: boolean;
}

export interface Block {
  type: "heading" | "paragraph";
  /** One entry per source line; paragraphs may hold several (rendered with <br>). */
  lines: Segment[][];
}

const HEADING = /^#{1,6}\s+(.*)$/;
const BOLD = /\*\*(.+?)\*\*/g;

/** Split one line into plain / bold segments on **...** markers. */
export function parseInline(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  BOLD.lastIndex = 0;
  while ((match = BOLD.exec(text))) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), bold: false });
    segments.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), bold: false });
  return segments.length ? segments : [{ text, bold: false }];
}

/** Parse the report into heading/paragraph blocks. */
export function parseReport(text: string): Block[] {
  return text
    .split(/\n{2,}/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((block): Block => {
      const heading = HEADING.exec(block);
      if (heading) {
        return { type: "heading", lines: [parseInline(heading[1].trim())] };
      }
      return {
        type: "paragraph",
        lines: block.split(/\n/).map((line) => parseInline(line.trim())),
      };
    });
}
