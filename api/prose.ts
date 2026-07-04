import Anthropic from "@anthropic-ai/sdk";
import { buildProseSystem, buildProseUserPrompt } from "../src/prose/prompt";
import type { ProsePayload } from "../src/prose/types";

// Thin serverless endpoint (Vercel/Netlify Node function). Holds the API key,
// builds the grounded prompt, and asks Claude for the three-paragraph reading.
//
// Cost note (spec §10): Speed Run prose is a few hundred tokens. A cheap model is
// the right default; override with ANTHROPIC_PROSE_MODEL.
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

// Minimal request/response shapes so we don't depend on a specific host's types.
interface ReqLike {
  method?: string;
  body?: unknown;
}
interface ResLike {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
}

function isValidPayload(b: unknown): b is ProsePayload {
  if (typeof b !== "object" || b === null) return false;
  const p = b as Record<string, unknown>;
  return (
    typeof p.tier === "string" &&
    typeof p.primary === "object" &&
    p.primary !== null &&
    typeof p.secondary === "object" &&
    p.secondary !== null &&
    Array.isArray(p.standoutAxes)
  );
}

export default async function handler(req: ReqLike, res: ResLike): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured: tell the client to use its deterministic fallback.
    res.status(501).json({ error: "No API key configured; client should use template." });
    return;
  }

  // Vercel parses JSON bodies; if a host passes a string, parse defensively.
  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = undefined;
    }
  }

  if (!isValidPayload(body)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_PROSE_MODEL || DEFAULT_MODEL;

    const message = await client.messages.create({
      model,
      max_tokens: body.long ? 1000 : 600,
      system: buildProseSystem(body.long),
      messages: [{ role: "user", content: buildProseUserPrompt(body) }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) {
      res.status(502).json({ error: "Empty completion" });
      return;
    }

    res.status(200).json({ text });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: "Prose generation failed", detail });
  }
}
