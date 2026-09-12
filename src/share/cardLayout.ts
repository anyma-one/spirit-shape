// Layout maths for the shareable result card. Pure and unit-tested: canvas drawing
// is untestable in this project's environment, so everything that can be decided
// without a rendering context is decided here.
//
// Two formats from one set of rules (user's call, 2026-07-30):
//   square  1080×1080  feeds — Instagram, WhatsApp, Discord, X
//   story   1080×1920  Instagram/WhatsApp stories
// The story format is not a taller square: the extra height goes to the artwork and
// the gaps, not to bigger text, or the type stops looking like the app.

export type CardFormat = "square" | "story";

export interface CardSpec {
  width: number;
  height: number;
  /** Side padding; all content sits inside this. */
  pad: number;
  /** Square box the animal art is drawn into, centred horizontally. */
  artSize: number;
  artTop: number;
  /** Type sizes, in px at full card resolution. */
  nameSize: number;
  epithetSize: number;
  lineSize: number;
  echoLabelSize: number;
  echoValueSize: number;
  markSize: number;
  /** Vertical rhythm. */
  gapAfterArt: number;
  gapAfterName: number;
  gapAfterEpithet: number;
  gapBetweenLines: number;
  gapBeforeEchoes: number;
  gapBetweenEchoes: number;
}

export const CARD_SPECS: Record<CardFormat, CardSpec> = {
  square: {
    width: 1080,
    height: 1080,
    pad: 96,
    artSize: 300,
    artTop: 84,
    nameSize: 104,
    epithetSize: 40,
    lineSize: 34,
    echoLabelSize: 22,
    echoValueSize: 32,
    markSize: 26,
    gapAfterArt: 40,
    gapAfterName: 12,
    gapAfterEpithet: 44,
    gapBetweenLines: 14,
    gapBeforeEchoes: 44,
    gapBetweenEchoes: 22,
  },
  story: {
    width: 1080,
    height: 1920,
    pad: 108,
    artSize: 440,
    artTop: 300,
    nameSize: 128,
    epithetSize: 46,
    lineSize: 38,
    echoLabelSize: 24,
    echoValueSize: 36,
    markSize: 28,
    gapAfterArt: 64,
    gapAfterName: 16,
    gapAfterEpithet: 72,
    gapBetweenLines: 18,
    gapBeforeEchoes: 72,
    gapBetweenEchoes: 30,
  },
};

export interface CardContent {
  animalName: string;
  epithet: string;
  /** Revealed symbolic layers only — locked ones must never reach the card. */
  echoes: { label: string; value: string }[];
  /** The Deep Dive's distillation, one entry per line. Empty for Tiers 1-2. */
  lines: string[];
}

/**
 * Greedy word wrap against a measuring function, so it can be tested with a stub
 * instead of a real CanvasRenderingContext2D. A single word longer than maxWidth is
 * emitted on its own line rather than dropped or split.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`;
    if (measure(candidate) <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

/** Height of the single echo row: label above value. */
export function echoRowHeight(spec: CardSpec): number {
  return spec.echoLabelSize * 1.3 + spec.echoValueSize * 1.3;
}

export interface BlockCounts {
  epithetLines: number;
  distillationLines: number;
  hasEchoes: boolean;
}

/** Total height of the drawn content, art through echoes (brand mark excluded). */
export function blockHeight(spec: CardSpec, counts: BlockCounts): number {
  let h = spec.artSize + spec.gapAfterArt;
  h += spec.nameSize + spec.gapAfterName;
  h += counts.epithetLines * spec.epithetSize * 1.3 + spec.gapAfterEpithet;
  if (counts.distillationLines > 0) {
    h +=
      counts.distillationLines * spec.lineSize * 1.35 +
      (counts.distillationLines - 1) * spec.gapBetweenLines;
  }
  if (counts.hasEchoes) h += spec.gapBeforeEchoes + echoRowHeight(spec);
  return h;
}

/**
 * Where the block starts, so it sits optically centred between the top edge and the
 * brand mark rather than pinned to a fixed top. Without this the story format left
 * its whole lower half empty, because it is nearly twice the square's height while
 * carrying the same content. Never rises above `artTop`, which acts as a minimum
 * top margin.
 */
export function blockTop(spec: CardSpec, height: number): number {
  const bottomReserved = spec.pad + spec.markSize * 2;
  const free = spec.height - bottomReserved - height;
  return Math.max(spec.artTop, free / 2);
}

/**
 * How many echoes fit, laid out as ONE ROW OF COLUMNS rather than stacked.
 *
 * Stacking cost a full row of height per echo, which on the square card left no
 * room for them at all once the Deep Dive's distillation was present — the card
 * silently lost the layer the share feature exists to show. Side by side, all three
 * cost the height of one.
 *
 * Two independent limits: the row has to fit vertically above the brand mark, and
 * the widest cell in each column has to fit across the card. Echoes are dropped from
 * the END, so Element (the layer every tier has) is the last to go.
 */
export function fitEchoes(
  spec: CardSpec,
  lineCount: number,
  echoes: { label: string; value: string }[],
  /** Height already used from the top of the card to the end of the epithet. */
  usedAbove: number,
  /** Measures at the value's font size; labels are smaller, so this is the binding one. */
  measure: (s: string) => number,
): number {
  if (echoes.length === 0) return 0;

  const bottomReserved = spec.pad + spec.markSize * 2;
  const linesHeight =
    lineCount === 0
      ? 0
      : lineCount * spec.lineSize * 1.35 + (lineCount - 1) * spec.gapBetweenLines;
  const available = spec.height - usedAbove - bottomReserved - linesHeight - spec.gapBeforeEchoes;
  if (available < echoRowHeight(spec)) return 0;

  const maxWidth = spec.width - spec.pad * 2;
  const gutter = spec.gapBetweenEchoes;
  for (let n = echoes.length; n > 0; n--) {
    const widths = echoes.slice(0, n).map((e) => Math.max(measure(e.value), measure(e.label)));
    const total = widths.reduce((a, b) => a + b, 0) + gutter * (n - 1);
    if (total <= maxWidth) return n;
  }
  return 0;
}
