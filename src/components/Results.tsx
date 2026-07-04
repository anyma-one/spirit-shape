import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Match, MatchResult } from "../engine";
import type { TierDef } from "../tiers";
import { buildProsePayload } from "../prose/buildSummary";
import { getProse } from "../prose/client";
import { templateProse } from "../prose/template";
import type { ProseResponse } from "../prose/types";
import { MUDDY_COPY } from "../data/copy";
import type { TierId } from "../data/copy";
import { animalArtUrl } from "../data/animalArt";
import { PROFILES } from "../data/profiles";
import { buildCompletedResult, saveResult } from "../persistence/sessions";
import { buildReveal } from "../reveal";
import { RevealCarousel } from "./RevealCarousel";
import type { CarouselAnimal } from "./RevealCarousel";
import type { FocusKey } from "./ui/revealCarousel";
import { ConversionNudge, MedicalFooter } from "./Disclaimers";
import { SymbolicProfile } from "./SymbolicProfile";
import { Mythology } from "./Mythology";
import { Layout } from "./ui/Layout";
import { Button } from "./ui/Button";
import { Note } from "./ui/Note";

interface ResultsProps {
  tier: TierDef;
  result: MatchResult;
  onRetake: () => void;
  /** Climb to / unlock a specific tier (used by the nudge and locked placeholders). */
  onUnlock: (tier: TierId) => void;
  onHome: () => void;
}

// A short epithet drawn from the animal's character note (the first phrase),
// e.g. Lion -> "the natural authority". Derived, never invented.
function epithetFor(name: string, note: string): string {
  const first = note.split(".")[0].trim();
  const stripped = first.replace(new RegExp(`^${name},?\\s*`, "i"), "").trim();
  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}

const RANK_LABEL: Record<FocusKey, string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Also close",
};
const TINT: Record<FocusKey, string> = {
  primary: "var(--tier)",
  secondary: "#cbe3ff",
  tertiary: "color-mix(in oklab, var(--tier) 60%, var(--indigo))",
};

// Reveal (handoff: reveal_carousel). The matched animals become a browsable carousel:
// tap a pill to focus a match; the artwork rotates and the psychological profile +
// mythology origin below crossfade to the focused animal. Tier gating unchanged —
// secondary unlocks at Soul Search, tertiary at Deep Dive (locked until then).
export function Results({ tier, result, onRetake, onUnlock, onHome }: ResultsProps) {
  const tierScope: "speed" | "soul" = tier.id === "soul-search" ? "soul" : "speed";
  const [focus, setFocus] = useState<FocusKey>("primary");
  const [prose, setProse] = useState<ProseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const savedRef = useRef(false);

  const advance = () => {
    const target = tier.nudge.target;
    if (target) onUnlock(target);
  };

  // Primary reading via the prose pipeline (Claude when a backend exists, else the
  // deterministic template — which is all the static app ever gets).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    savedRef.current = false;
    const payload = buildProsePayload(tier, result);
    getProse(payload).then((res) => {
      if (cancelled) return;
      setProse(res);
      setLoading(false);
      if (!savedRef.current) {
        savedRef.current = true;
        saveResult(buildCompletedResult(tier.id, tier.name, result, res.text, res.source));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tier, result]);

  const { primary, secondary, split, alsoClose, muddy } = result;

  // Per-animal derived data: epithet, art, tint, rank label, and a per-animal reveal
  // model (mythology swaps to the focused animal; symbolic stays — it's vector-based).
  const data = useMemo(() => {
    const mk = (match: Match, key: FocusKey, pct?: number) => ({
      key,
      match,
      pct,
      name: match.archetype.name,
      epithet:
        PROFILES[match.archetype.id]?.epithet ??
        epithetFor(match.archetype.name, match.archetype.note),
      art: animalArtUrl(match.archetype.name) ?? "",
      reveal: buildReveal(tier.id, { ...result, primary: match }),
    });
    const list = [mk(primary, "primary", split.primary), mk(secondary, "secondary", split.secondary)];
    if (alsoClose) list.push(mk(alsoClose, "tertiary"));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, tier.id]);

  // Deterministic template readings for the non-primary animals, focused on that
  // animal (its match swapped into the primary slot). Instant, so browse never waits.
  const templateReadings = useMemo(() => {
    const out: Partial<Record<FocusKey, string>> = {};
    const focal = (match: Match, pct: number) =>
      templateProse(
        buildProsePayload(tier, {
          ...result,
          primary: match,
          secondary: result.primary,
          split: { primary: pct, secondary: split.primary },
        }),
      );
    out.secondary = focal(secondary, split.secondary);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, tier.id]);

  const carouselAnimals: CarouselAnimal[] = useMemo(
    () =>
      data.map((a) => ({
        key: a.key,
        rankLabel: RANK_LABEL[a.key],
        name: a.name,
        epithet: a.epithet,
        pct: a.pct,
        art: a.art,
        tint: TINT[a.key],
        open: a.key === "primary" ? true : a.key === "secondary" ? tierScope === "soul" : false,
        softLock: a.key === "secondary" && tierScope === "speed",
        unlockHint: a.key === "secondary" ? "Take Soul Search to unlock" : "Take Deep Dive to unlock",
      })),
    [data, tierScope],
  );

  const handleFocus = useCallback((key: FocusKey) => setFocus(key), []);

  // Clicking a locked pill routes to the unlock CTA below. Scroll the WINDOW (not
  // scrollIntoView — .app is an overflow:hidden scroll container, same trap as Home)
  // via rAF, since native smooth-scroll silently no-ops in some contexts.
  const nudgeRef = useRef<HTMLDivElement>(null);
  const scrollToNudge = useCallback(() => {
    const el = nudgeRef.current;
    if (!el) return;
    const start = window.scrollY;
    const target = Math.max(0, el.getBoundingClientRect().top + start - 24);
    const dist = target - start;
    if (Math.abs(dist) < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, target);
      return;
    }
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / 520);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      window.scrollTo(0, start + dist * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  const focusData = data.find((a) => a.key === focus) ?? data[0];
  const isPrimary = focus === "primary";
  const readingText = isPrimary ? prose?.text : templateReadings[focus];
  const readingLoading = isPrimary && loading;

  // Soul Search surfaces the fuller profile: Drawn-to, Watch-for, Kin-and-rivals,
  // and the Tier 3 tease (profiles-and-mythology-v1 §1), all for the focused animal.
  const isSoul = tierScope === "soul";
  const focalProfile = PROFILES[focusData.match.archetype.id];

  return (
    <Layout header={{ tier: tier.id, onHome, onSelectTier: onUnlock }}>
      <main className="view view--center view--content">
        <RevealCarousel
          animals={carouselAnimals}
          tierScope={tierScope}
          muddy={muddy}
          onFocus={handleFocus}
          onLockedClick={scrollToNudge}
        />

        <div className="reveal__body">
          {muddy && (
            <Note tone="honesty" title={MUDDY_COPY.heading}>
              <p className="note__body">{MUDDY_COPY.body}</p>
            </Note>
          )}

          {/* Focus-swappable region — keyed by focus so it crossfades in place. */}
          <div key={focus} className="reveal-swap">
            {/* Layer 1 — Psychological profile (the focused animal's reading). */}
            <div className="panel">
              <p className="section-label">Psychological profile</p>
              {readingLoading ? (
                <p className="prose-loading">Writing your reading…</p>
              ) : (
                <>
                  {readingText?.split("\n\n").map((para, i) => (
                    <p key={i} className="prose-para">
                      {para}
                    </p>
                  ))}
                  {isPrimary && prose?.source === "template" && (
                    <p className="prose-source">
                      Generated from your trait profile. Add an Anthropic API key for a Claude-written
                      reading.
                    </p>
                  )}
                </>
              )}

              {/* Soul Search only: the canonical Drawn-to / Watch-for facets. */}
              {isSoul && focalProfile && (
                <div className="profile-facets">
                  <div className="profile-facet">
                    <p className="profile-facet__label">Drawn to</p>
                    <p className="profile-facet__text">{focalProfile.drawnTo}</p>
                  </div>
                  <div className="profile-facet">
                    <p className="profile-facet__label">Watch for</p>
                    <p className="profile-facet__text">{focalProfile.watchFor}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Layer 2 — The origin of your spirit (focused animal; deeper levels locked). */}
            <Mythology
              animalName={focusData.name}
              paras={focusData.reveal.mythologyParas}
              olderMyth={focusData.reveal.mythologyOlderMyth}
              disclaimer={focusData.reveal.mythologyDisclaimer}
              locked={focusData.reveal.mythologyLocked}
              onUnlock={onUnlock}
            />

            {/* Soul Search only: Kin and rivals (the focused animal's four archetypal
                relationships), closed by the Tier 3 tease. */}
            {isSoul && focalProfile && (
              <>
                <div className="panel">
                  <p className="section-label">Kin and rivals · {focusData.name}</p>
                  <p className="prose-para">{focalProfile.kinAndRivals}</p>
                </div>
                <p className="reveal-tease">{focalProfile.tease}</p>
              </>
            )}
          </div>

          {/* Layer 3 — Symbolic echoes (vector-based; same regardless of focus). */}
          <SymbolicProfile items={data[0].reveal.symbolic} onUnlock={onUnlock} />

          {/* Conversion nudge (curiosity) toward the next tier — locked pills scroll here. */}
          <div ref={nudgeRef}>
            <ConversionNudge nudge={tier.nudge} onAdvance={advance} />
          </div>
        </div>

        <div className="reveal__actions">
          <Button variant="ghost" size="md" caps onClick={onRetake}>
            Retake the {tier.name}
          </Button>
        </div>

        <MedicalFooter />
      </main>
    </Layout>
  );
}
