import { useEffect, useRef, useState } from "react";
import type { TierId } from "../data/copy";
import { TIERS } from "../tiers";
import { latestResult, loadProgress } from "../persistence/sessions";
import type { InProgressSession } from "../persistence/sessions";
import { TierCard } from "./TierCard";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { Layout } from "./ui/Layout";

// Landing (handoff: screens.jsx Landing). Hero + the Light→Mid→Deep tier ladder;
// Deep Dive shown as a coming-soon card. Clicking a tier starts it immediately —
// resuming a saved session if one exists, else starting fresh. A small "Start
// over" appears on a card only when it has a saved session.
export function Home({
  onStart,
  onResume,
  onHome,
}: {
  onStart: (tier: TierId) => void;
  onResume: (tier: TierId, session: InProgressSession) => void;
  onHome: () => void;
}) {
  const last = latestResult();
  const speedSession = loadProgress("speed-run");
  const soulSession = loadProgress("soul-search");

  const handleSelect = (tier: TierId, session: InProgressSession | null) => () =>
    session ? onResume(tier, session) : onStart(tier);

  // Scroll affordance: the explainer sits below the fold, so a chevron hints
  // there's more. It fades once the reader starts scrolling. The "Take the test"
  // button at the foot returns them to the tier ladder.
  const tiersRef = useRef<HTMLDivElement>(null);
  const explainRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Only fade the "Learn more" hint once the reader has scrolled a meaningful
    // distance, not on the first nudge (a low threshold felt too twitchy).
    const onScroll = () => setScrolled(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll the WINDOW to an element (not scrollIntoView): .app has overflow:hidden
  // to clip the atmosphere, which makes it a scroll container — scrollIntoView
  // would scroll .app internally and push the header off-screen with no way back.
  // We animate with rAF rather than `behavior:"smooth"`, which silently no-ops in
  // some Chrome/automation contexts; repeated instant scrolls work everywhere.
  const scrollToEl = (el: HTMLElement | null, offset = 24) => {
    if (!el) return;
    const start = window.scrollY;
    const target = Math.max(0, el.getBoundingClientRect().top + start - offset);
    const dist = target - start;
    if (Math.abs(dist) < 2) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      window.scrollTo(0, target);
      return;
    }
    const duration = 520;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / duration);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
      window.scrollTo(0, start + dist * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  return (
    <Layout header={{ onHome }}>
      <main className="view view--center view--landing">
        <span className="kicker">A question, a mirror, a revelation</span>
        <h1 className="landing__title">What Shape Does Your Spirit Take?</h1>
        <p className="landing__sub">
          Find the shape of your spirit and reveal its mystery. Learn about yourself and the origins
          of your spirit as you move deeper and deeper into the layers of psychology and mythology.
        </p>

        {last && (
          <p className="landing__last">
            Last · {last.tierName}: <strong>{last.primary.name}</strong> {last.split.primary}% /{" "}
            {last.secondary.name} {last.split.secondary}%
          </p>
        )}

        <div className="tier-grid" ref={tiersRef}>
          <TierCard
            scope="speed"
            badgeLabel={TIERS["speed-run"].name}
            name="Quick Now"
            tagline="Get an idea of your tendencies and go deeper when you are keen to learn more."
            meta="16 questions"
            commitment="5–10 min"
            onSelect={handleSelect("speed-run", speedSession)}
            onStartOver={speedSession ? () => onStart("speed-run") : undefined}
          />
          <TierCard
            scope="soul"
            badgeLabel={TIERS["soul-search"].name}
            name="Show Me More"
            tagline="Get a full profile, learn about your allies, about your rivals, and uncover almost forgotten stories."
            meta="35 questions"
            commitment="10–15 min"
            onSelect={handleSelect("soul-search", soulSession)}
            onStartOver={soulSession ? () => onStart("soul-search") : undefined}
          />
          <TierCard
            scope="deep"
            badgeLabel="Deep Dive"
            name="Coming Soon …"
            tagline="Receive a personalised report and full insight into your mythological connection."
            meta="Free form · individual"
            commitment="30–60 min"
            disabled
          />
        </div>

        {/* "Learn more" scroll affordance, in-flow below the tiers — a quiet
            bobbing chevron that jumps to the explainer and fades once scrolled. */}
        <button
          type="button"
          className={`scroll-hint${scrolled ? " is-hidden" : ""}`}
          aria-label="Learn more about Anyma"
          onClick={() => scrollToEl(explainRef.current)}
        >
          <span className="scroll-hint__label">Learn more</span>
          <Icon name="chevron-down" />
        </button>

        {/* Explainer block (Soul Spec landing handoff): centered reading column
            below the tier ladder. All type pulled from the design tokens. */}
        <div className="ss-explain" ref={explainRef}>
          <div className="ss-explain-section">
            <h3 className="ss-explain-h">What is this?</h3>
            <p className="ss-explain-p">
              Anyma strives to give you genuine insight into your psyche while you connect with and
              learn about its mythological origins. Find your match among 16 animal shapes
              representing universal human archetypes, and become familiar with its role and
              challenges.
            </p>
          </div>

          <div className="ss-explain-section">
            <h3 className="ss-explain-h">Science &amp; stories</h3>
            <p className="ss-explain-p">
              Psychology is one of our preferred frameworks to make sense of the human experience.
              Mythology used to be the same for our ancestors. As one looks closer, those two are
              inherently linked, and they both have their strong suits and limits. Together they
              paint a fuller picture.
            </p>
          </div>

          <div className="ss-explain-section">
            <h3 className="ss-explain-h">Seeking truth, sparking curiosity</h3>
            <p className="ss-explain-p">
              Anyma offers three levels of depth, each reflecting the level of introspection
              necessary. The more time and energy you invest, the more insightful the results will
              be. Each tier is built to spark curiosity and pull you deeper into the next.
            </p>
            <p className="ss-explain-p">
              Your results come with a psychological profile and the mythological connection to your
              spirit shape. You will learn about yourself and about how the world has always seen
              you: your role, your tendencies, your priorities and your challenges.
            </p>
            <p className="ss-explain-p">
              Unlike most personality tests, Anyma does not claim to know or tell you who you are,
              but invites you to explore more.
            </p>
          </div>

          <p className="ss-explain-close">Go deeper. Always.</p>

          <Button
            variant="luminous"
            size="lg"
            caps
            glow
            className="ss-explain-cta"
            onClick={() => scrollToEl(tiersRef.current)}
          >
            Take the test
          </Button>

          <hr className="ss-divider" />
        </div>

        <p className="ss-disclaimer">
          This is a mirror, not a diagnosis. Don't fall for the Barnum effect, but take this as an
          invitation to learn more about yourself, about the stories we've told ourselves for
          centuries and about our shared humanity.
        </p>
      </main>
    </Layout>
  );
}
