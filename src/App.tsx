import { useState } from "react";
import { track } from "@vercel/analytics";
import type { Answers, MatchResult } from "./engine";
import type { TierId } from "./data/copy";
import { TIERS } from "./tiers";
import { Home } from "./components/Home";
import { Quiz } from "./components/Quiz";
import { Loading } from "./components/Loading";
import { Results } from "./components/Results";
import { clearProgress, loadProgress, saveProgress } from "./persistence/sessions";
import type { InProgressSession } from "./persistence/sessions";
import { logResult } from "./persistence/remoteLog";

type Screen =
  | { name: "home" }
  | { name: "quiz"; tier: TierId; resume?: InProgressSession }
  | { name: "loading"; tier: TierId; result: MatchResult }
  | { name: "reveal"; tier: TierId; result: MatchResult };

// Each screen renders its own night Shell/Header (handoff pattern), so App is
// just the screen state machine: landing → quiz → loading → reveal.
export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  const goHome = () => setScreen({ name: "home" });

  function startTier(tier: TierId) {
    clearProgress(tier);
    track("quiz_start", { tier, resumed: false });
    setScreen({ name: "quiz", tier });
  }

  function resumeTier(tier: TierId, session: InProgressSession) {
    track("quiz_start", { tier, resumed: true });
    setScreen({ name: "quiz", tier, resume: session });
  }

  function completeTier(tier: TierId, answers: Answers) {
    clearProgress(tier);
    const result = TIERS[tier].run(answers);
    track("quiz_complete", {
      tier,
      primary: result.primary.archetype.id,
      secondary: result.secondary.archetype.id,
      splitPrimary: result.split.primary,
      muddy: result.muddy,
    });
    logResult(tier, result); // anonymous result -> Supabase (no-op if backend unconfigured)
    setScreen({ name: "loading", tier, result });
  }

  // Start (or resume) a specific tier — used by the result page's nudge and the
  // locked-content "Unlock at …" placeholders.
  function goToTier(tier: TierId) {
    const session = loadProgress(tier);
    if (session) resumeTier(tier, session);
    else startTier(tier);
  }

  switch (screen.name) {
    case "home":
      return <Home onStart={startTier} onResume={resumeTier} onHome={goHome} />;

    case "quiz":
      return (
        <Quiz
          key={screen.tier + (screen.resume ? "-resume" : "-fresh")}
          tier={screen.tier}
          questions={TIERS[screen.tier].questions}
          initialAnswers={screen.resume?.answers}
          initialIndex={screen.resume?.index}
          onProgress={(answers, index) =>
            saveProgress(screen.tier, answers, index, TIERS[screen.tier].questions.length)
          }
          onComplete={(answers) => completeTier(screen.tier, answers)}
          onCancel={goHome}
        />
      );

    case "loading":
      return (
        <Loading
          tier={screen.tier}
          onDone={() => setScreen({ name: "reveal", tier: screen.tier, result: screen.result })}
        />
      );

    case "reveal":
      return (
        <Results
          tier={TIERS[screen.tier]}
          result={screen.result}
          onRetake={() => startTier(screen.tier)}
          onUnlock={goToTier}
          onHome={goHome}
        />
      );
  }
}
