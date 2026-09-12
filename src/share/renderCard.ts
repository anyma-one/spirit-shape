// Draws the shareable result card onto a canvas and hands back a PNG blob.
//
// The card is an IMAGE, never a hosted page (user's call, 2026-07-30): the Deep
// Dive's distillation is personal, and an image the reader saves and places
// themselves means anyma publishes nothing, stores nothing, and has nothing to
// revoke. That also removes the whole /s/<token> + OG-preview problem.
//
// Everything layout-related lives in cardLayout.ts so it can be unit-tested; this
// file is the untestable half (fonts, images, compositing).

import {
  CARD_SPECS,
  blockHeight,
  blockTop,
  fitEchoes,
  wrapText,
  type CardContent,
  type CardFormat,
} from "./cardLayout";

const VOID = "#0A1124";
const INDIGO = "#14253F";
const CREAM = "#EDE8D9";
const DISPLAY = '"Cormorant Garamond", Georgia, serif';
const SANS = '"Hanken Grotesk", system-ui, sans-serif';

/**
 * Canvas paints with whatever is loaded at draw time and does NOT wait for webfonts,
 * so an un-awaited font silently falls back to Georgia. Both faces must be resolved
 * before the first fillText.
 */
async function ensureFonts(): Promise<void> {
  if (!("fonts" in document)) return;
  await Promise.all([
    document.fonts.load('400 100px "Cormorant Garamond"'),
    document.fonts.load('italic 400 40px "Cormorant Garamond"'),
    document.fonts.load('400 32px "Hanken Grotesk"'),
    document.fonts.load('500 22px "Hanken Grotesk"'),
  ]);
  await document.fonts.ready;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/**
 * The animal PNGs are alpha silhouettes — the app renders them as a CSS mask over a
 * tint. Canvas has no mask, so tint on an offscreen canvas with `source-in` and
 * composite the result in.
 */
function tintedArt(img: HTMLImageElement, size: number, colour: string): HTMLCanvasElement {
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const ctx = off.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, size, size);
  return off;
}

function paintBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, w * 0.4, h);
  sky.addColorStop(0, INDIGO);
  sky.addColorStop(0.55, VOID);
  sky.addColorStop(1, "#070C1A");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // A few faint stars, placed deterministically so the same result always produces
  // the same card (no Math.random: two shares of one reading should match).
  ctx.fillStyle = "rgba(237, 232, 217, 0.30)";
  for (let i = 0; i < 40; i++) {
    const x = ((i * 733) % 1009) / 1009;
    const y = ((i * 421) % 997) / 997;
    const r = i % 7 === 0 ? 2.2 : 1.2;
    ctx.beginPath();
    ctx.arc(x * w, y * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export interface RenderOptions {
  format: CardFormat;
  content: CardContent;
  /** Public URL of the animal line-art PNG. */
  artUrl: string;
}

export async function renderCard({ format, content, artUrl }: RenderOptions): Promise<Blob> {
  const spec = CARD_SPECS[format];
  await ensureFonts();

  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");

  paintBackground(ctx, spec.width, spec.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const cx = spec.width / 2;
  const maxTextWidth = spec.width - spec.pad * 2;

  // --- measure first, then draw ------------------------------------------
  // The block is vertically centred, so every wrap has to be known before the first
  // pixel is drawn.
  ctx.font = `italic 400 ${spec.epithetSize}px ${DISPLAY}`;
  const epithetLines = wrapText(content.epithet, maxTextWidth, (t) => ctx.measureText(t).width);

  ctx.font = `400 ${spec.lineSize}px ${DISPLAY}`;
  const wrappedLines: string[] = [];
  for (const line of content.lines) {
    wrappedLines.push(...wrapText(line, maxTextWidth, (t) => ctx.measureText(t).width));
  }

  ctx.font = `400 ${spec.echoValueSize}px ${DISPLAY}`;
  const provisionalTop = blockTop(
    spec,
    blockHeight(spec, {
      epithetLines: epithetLines.length,
      distillationLines: wrappedLines.length,
      hasEchoes: content.echoes.length > 0,
    }),
  );
  const echoBudget = fitEchoes(spec, wrappedLines.length, content.echoes, provisionalTop, (t) =>
    ctx.measureText(t).width,
  );
  let y = blockTop(
    spec,
    blockHeight(spec, {
      epithetLines: epithetLines.length,
      distillationLines: wrappedLines.length,
      hasEchoes: echoBudget > 0,
    }),
  );

  // --- artwork -------------------------------------------------------------
  try {
    const img = await loadImage(artUrl);
    const art = tintedArt(img, spec.artSize, CREAM);
    ctx.save();
    ctx.shadowColor = "rgba(169, 238, 242, 0.45)";
    ctx.shadowBlur = spec.artSize * 0.18;
    ctx.drawImage(art, cx - spec.artSize / 2, y, spec.artSize, spec.artSize);
    ctx.restore();
  } catch {
    // A missing PNG must not cost the reader their card — leave the space empty
    // rather than reflowing, so the composition stays put.
  }
  y += spec.artSize + spec.gapAfterArt;

  // --- name + epithet ------------------------------------------------------
  ctx.fillStyle = CREAM;
  ctx.font = `400 ${spec.nameSize}px ${DISPLAY}`;
  ctx.fillText(content.animalName, cx, y);
  y += spec.nameSize + spec.gapAfterName;

  ctx.fillStyle = "rgba(237, 232, 217, 0.62)";
  ctx.font = `italic 400 ${spec.epithetSize}px ${DISPLAY}`;
  for (const line of epithetLines) {
    ctx.fillText(line, cx, y);
    y += spec.epithetSize * 1.3;
  }
  y += spec.gapAfterEpithet;

  // --- the Deep Dive distillation (Tiers 1-2 pass none) --------------------
  if (wrappedLines.length > 0) {
    ctx.fillStyle = CREAM;
    ctx.font = `400 ${spec.lineSize}px ${DISPLAY}`;
    for (const line of wrappedLines) {
      ctx.fillText(line, cx, y);
      y += spec.lineSize * 1.35 + spec.gapBetweenLines;
    }
    y += spec.gapBeforeEchoes - spec.gapBetweenLines;
  } else if (echoBudget > 0) {
    y += spec.gapBeforeEchoes;
  }

  // --- symbolic echoes, side by side ---------------------------------------
  const shown = content.echoes.slice(0, echoBudget);
  if (shown.length > 0) {
    ctx.font = `400 ${spec.echoValueSize}px ${DISPLAY}`;
    const widths = shown.map((e) => {
      const v = ctx.measureText(e.value).width;
      ctx.font = `500 ${spec.echoLabelSize}px ${SANS}`;
      const l = ctx.measureText(e.label.toUpperCase()).width;
      ctx.font = `400 ${spec.echoValueSize}px ${DISPLAY}`;
      return Math.max(v, l);
    });
    const total =
      widths.reduce((a, b) => a + b, 0) + spec.gapBetweenEchoes * (shown.length - 1);
    let x = cx - total / 2;
    shown.forEach((echo, i) => {
      const centre = x + widths[i] / 2;
      ctx.fillStyle = "rgba(169, 238, 242, 0.75)";
      ctx.font = `500 ${spec.echoLabelSize}px ${SANS}`;
      ctx.fillText(echo.label.toUpperCase(), centre, y);

      ctx.fillStyle = CREAM;
      ctx.font = `400 ${spec.echoValueSize}px ${DISPLAY}`;
      ctx.fillText(echo.value, centre, y + spec.echoLabelSize * 1.3);
      x += widths[i] + spec.gapBetweenEchoes;
    });
  }

  // --- brand mark ----------------------------------------------------------
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(237, 232, 217, 0.45)";
  ctx.font = `400 ${spec.markSize}px ${SANS}`;
  ctx.fillText("anyma.one", cx, spec.height - spec.pad);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not encode the card");
  return blob;
}

/**
 * Hand the card to the OS share sheet where that exists (mobile), else download it.
 * Returns how it was delivered so the caller can word the confirmation honestly.
 */
export async function deliverCard(blob: Blob, filename: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
    share?: (d: { files: File[] }) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch (err) {
      // A user cancelling the sheet is not a failure; do not fall back to a
      // surprise download in that case.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
