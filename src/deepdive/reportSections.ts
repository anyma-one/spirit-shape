// Groups the parsed report into collapsible sections for the Tier-3 result page.
//
// WHY THIS IS SHAPE-BASED, NOT STRING-BASED: the report prompt tells the model to
// use "plain headings of your own choosing" (api/deepdive-report.ts, STRUCTURE), so
// the headings are NOT a fixed vocabulary. Nothing here may match on heading text.
//
// The prompt's intended shape is: five parts, then a short distillation ("three or
// four short lines ... the version someone screenshots and remembers"), then a close
// of exactly three questions. The distillation is promoted to the top of the result
// page, always open, so the payoff is not buried under ~900 words. It is found by
// SHAPE - short, line-based, not first, not last - and if nothing matches, nothing is
// promoted and the reading renders in its written order.

import { parseReport, type Block } from "./reportFormat";

/**
 * The row labels shown on the result page. PRODUCT COPY - edit here, not in the
 * prompt. The report model still writes its own headings (they are what marks where
 * one section ends and the next begins), but that wording is never displayed: when
 * the report has exactly the shape the prompt asks for, these labels replace it, so
 * every reader sees the same navigation instead of per-run wording.
 *
 * Order must match the prompt's STRUCTURE block in api/deepdive-report.ts.
 * Index 5 is the distillation, which the page promotes to the top.
 */
export const SECTION_LABELS = [
  "At your core",
  "Beyond the spirit",
  "You & the world",
  "What challenges you",
  "What you might not be aware of",
  "The short version",
  "Three questions to go deeper",
] as const;

const DISTILLATION_INDEX = 5;

export interface ReportSection {
  /** The label to display: pinned copy when the shape matched, else the model's own. */
  title: string;
  /** Body blocks, headings excluded. */
  blocks: Block[];
}

export interface StructuredReport {
  /** Any prose before the first heading (the prompt forbids a preamble; be defensive). */
  lead: Block[];
  /** Sections in written order, with `distillation` removed when one was promoted. */
  sections: ReportSection[];
  /** The screenshot-and-remember distillation, or null when none was identified. */
  distillation: ReportSection | null;
}

const blockText = (b: Block) => b.lines.map((l) => l.map((s) => s.text).join("")).join(" ");
const wordCount = (blocks: Block[]) =>
  blocks.reduce((n, b) => n + blockText(b).split(/\s+/).filter(Boolean).length, 0);
const lineCount = (blocks: Block[]) => blocks.reduce((n, b) => n + b.lines.length, 0);

/**
 * The distillation is short and line-based where the four parts are paragraphs.
 * Bounds are deliberately loose: the prompt asks for three or four lines, and this
 * accepts two to six and up to 90 words so a slightly over-long one still promotes.
 */
function isDistillation(section: ReportSection): boolean {
  const lines = lineCount(section.blocks);
  return lines >= 2 && lines <= 6 && wordCount(section.blocks) <= 90;
}

/**
 * A stray title line above the first heading ("Final Reading", "Your reading"), which
 * the prompt forbids ("Prose only. No preamble") but which real output has produced.
 * Rendered as-is it becomes a floating sentence fragment at the top of the panel, so a
 * short unpunctuated lead is dropped. Anything long enough to be real prose is kept.
 */
function isStrayTitle(blocks: Block[]): boolean {
  if (blocks.length !== 1) return false;
  const text = blockText(blocks[0]).trim();
  return text.split(/\s+/).length <= 8 && !/[.!?]$/.test(text);
}

/** Split parsed blocks into `heading -> body` sections. */
export function splitSections(blocks: Block[]): { lead: Block[]; sections: ReportSection[] } {
  const lead: Block[] = [];
  const sections: ReportSection[] = [];
  for (const block of blocks) {
    if (block.type === "heading") {
      sections.push({ title: blockText(block), blocks: [] });
    } else if (sections.length === 0) {
      lead.push(block);
    } else {
      sections[sections.length - 1].blocks.push(block);
    }
  }
  return { lead, sections };
}

export function structureReport(text: string): StructuredReport {
  const split = splitSections(parseReport(text));
  // A heading with nothing under it is a title, not a section (real run 2026-09-27:
  // the model opened with "# The Bear" straight above "## At Your Core"). Counting it
  // would break the positional match below and lose the pinned labels.
  const sections = split.sections.filter((s) => s.blocks.length > 0);
  const lead = isStrayTitle(split.lead) ? [] : split.lead;

  // HAPPY PATH: the report has exactly the seven sections the prompt asks for, so
  // position is trustworthy. Swap in the pinned labels and take the distillation by
  // index - no guessing at all.
  if (sections.length === SECTION_LABELS.length) {
    const labelled = sections.map((s, i) => ({ ...s, title: SECTION_LABELS[i] }));
    const [distillation] = labelled.splice(DISTILLATION_INDEX, 1);
    return { lead, sections: labelled, distillation };
  }

  // FALLBACK: the model wrote a different number of sections, so position means
  // nothing. Keep its own headings as labels and find the distillation by shape.
  // Search the interior only: never promote the opening part (where the animal
  // lands) or the closing questions, both of which can be short enough to match.
  let distillation: ReportSection | null = null;
  for (let i = sections.length - 2; i >= 1; i--) {
    if (isDistillation(sections[i])) {
      distillation = sections[i];
      sections.splice(i, 1);
      break;
    }
  }

  return { lead, sections, distillation };
}
