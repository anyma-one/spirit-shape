# Spirit Animal — Phases 1–2 (Speed Run + Soul Search)

A psychological spirit-animal quiz in tiers that form a funnel. Both built tiers
score eight trait axes, match against 16 archetype animals by Euclidean distance,
and render a two-animal percentage split with a grounded prose reading.

- **Speed Run** (Phase 1) — 16 scenario questions, ~5 min, a soft two-animal read.
- **Soul Search** (Phase 2) — 36 questions (24 grounded full-weight + 12 depth
  half-weight), ~15 min, **save & resume**, a sharper split (lower temperature). The
  v0.6 set blends multiple choice with three richer input formats — bipolar sliders,
  two-axis pads, and drag-to-rank — all normalised to the same per-question weight.

The deterministic engine is the shared spine: Soul Search reuses it unchanged, and
the Deep Dive (Phase 3, not built) will reuse the matcher as a nominator.

## What's here

| Layer | Path | Notes |
|-------|------|-------|
| Pure engine | `src/engine/` | Tier-agnostic. Scoring (with a half-weight `WeightMultiplier` hook), Euclidean matcher, softmax-to-percentage, muddy detection, deterministic tie-break. No React, no data, no network. |
| Tier data | `src/data/` | The 16 Speed Run + 36 Soul Search questions (MC + slider/pad/rank formats), archetype vectors (16 common + 10 rare, ready for Phase 3), the eight axes, per-animal profile/mythology/relationship content, per-tier tuning config, and copy. |
| Tier registry | `src/tiers.ts` | Binds the engine to each tier's questions, config, pool, and weighting. Adding a tier is data, not new UI. |
| Persistence | `src/persistence/` | A swappable KV store (localStorage now, serverless KV later) with save-resume sessions and completed-result records for cross-tier continuity. |
| Prose | `src/prose/`, `api/prose.ts` | Serverless Claude call grounded in the user's axis leans, with a deterministic template fallback so the app works with no API key. |
| UI | `src/components/`, `src/App.tsx` | Home/tier-picker (with resume) → quiz → results, with the per-tier Barnum nudge (Variant A) and medical footer. |

## Run it

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173  (UI + engine; prose uses template fallback)
npm test           # unit tests (vitest)
npm run typecheck  # tsc -b --noEmit
npm run build      # typecheck + production build -> dist/
```

There is also a `./serve.sh` helper that serves a built `dist/` over plain `python3
-m http.server` (no Node needed) for quick local/LAN testing.

### Getting Claude-written prose

`npm run dev` (Vite alone) does **not** run the serverless function, so prose comes
from the deterministic template. To exercise the real `api/prose.ts` endpoint:

```bash
cp .env.example .env.local      # then set ANTHROPIC_API_KEY
npx vercel dev                  # runs the Vite app AND the /api function together
```

Without a key the endpoint returns 501 and the client silently falls back to the
template — the app always produces a reading and is honest about which engine wrote it.

## How matching works

1. **Score** — each chosen option carries axis weights (config data, never code).
   Sum per axis, divide by `scaleDivisor`, clamp to [-2, 2]. → the user's vector.
2. **Match** — Euclidean distance to every common-animal vector.
3. **Percentages** — softmax over negative distance with a tunable temperature;
   the top two are renormalised to a headline split (e.g. 61% / 39%).
4. **Also-close** — the third animal is shown only when within `alsoCloseMargin`.
5. **Muddy** — a flat profile (low vector norm) is named honestly, not hidden, and
   is the strongest hook to climb a tier.

All tuning lives in `src/data/config.ts`. Ties break deterministically on the
user's most extreme axis, so the same answers always give the same result.

### Verification

The engine and content are covered by `vitest` (`npm test`): scoring math and the
per-format normalisation, deterministic tie-breaks, the muddy band, an **archetypal
reachability** guard (a user answering in-character as each animal is matched to it),
content completeness + relationship-graph symmetry, and the Soul Search question-order
rules. A couple of tuning targets are intentionally `.skip`ped, deferred to real
Phase-2 distribution data rather than eyeballed on one simulated run.

## Phase boundaries

- **Done (Phase 1):** Speed Run.
- **Done (Phase 2 / Soul Search):** 36-question set with the v0.6 input formats
  (slider/pad/rank), half-weight depth-item mechanic, sharper split, save-resume
  persistence, and the funnel (Speed Run nudges up to Soul Search). Persistence is
  client-side (localStorage) via the `KVStore` interface, ready to swap for a
  serverless KV/Postgres backend.
- **Next (Phase 3 / Deep Dive):** reuses `matchVector` as a nominator over the full
  pool (the 10 rare animals in `src/data/archetypes.ts` are already vectored and
  gated only by the pool filter); extends persistence for cross-tier continuity
  (the `CompletedResult` records and `latestResult()` are already in place) with
  the anti-anchoring separation.

## Tiered reveal (locked-content gate)

The result page reveals the current tier's full output and shows higher-tier layers
(Archetype at Speed Run; Mythic role and deeper mythology) as **blurred
placeholders** with an "Unlock at …" CTA. `src/reveal.ts` (`buildReveal`) is the single gate: for locked
layers it produces a stub with a label + unlock target and **no value** (locked
symbolic values are not computed; locked mythology text is omitted), so locked
content is absent from the rendered DOM, and the blur is decorative chrome over
placeholder bars — never a CSS filter over real text.

**Caveat (honest):** the patch's ideal is *server-side* gating so locked values
never reach the client. This app is client-side (the engine runs in-browser; only
prose has an optional serverless function), so while locked values aren't rendered
or in the DOM, the selectors live in the bundle and the trait vector is in
localStorage — a determined user could still derive them. `buildReveal` is written
as the exact seam where real gating moves server-side: when result computation goes
behind a backend, that function moves with it and the client only ever receives the
gated model. Until then this is display-layer gating (which the patch itself states
it is).

## Tuning notes (first-draft, per spec §13)

Question weights, archetype vectors, and the four config knobs are all first drafts
meant to be tuned against real answer distributions once Phase 1 has users. The
known coverage caveat from the question set: SOC runs slightly heavy; COG and REC
sit at the two-question floor.

## License

No license yet — all rights reserved. (GitHub treats a repo with no `LICENSE` file
as all-rights-reserved by default.) A license may be added later.
