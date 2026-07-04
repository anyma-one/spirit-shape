import { useState } from "react";
import type { Answers, AnswerValue, Question } from "../engine";
import type { TierId } from "../data/copy";
import { TIERS } from "../tiers";
import { Layout } from "./ui/Layout";
import { Button } from "./ui/Button";
import { PadInput, RankInput, SliderInput } from "./QuizInputs";

interface QuizProps {
  tier: TierId;
  questions: Question[];
  initialAnswers?: Answers;
  initialIndex?: number;
  onProgress?: (answers: Answers, index: number) => void;
  onComplete: (answers: Answers) => void;
  onCancel: () => void;
}

// Quiz (handoff: screens.jsx Quiz). Multiple choice auto-advances (selecting an answer
// moves on after a brief beat). The v0.6 formats (slider / pad / rank) let the user set
// a value, then advance with Continue, so they can adjust before committing. Back (in
// the header) steps a question or returns to landing from Q1. Persistence via onProgress.
export function Quiz({
  tier,
  questions,
  initialAnswers,
  initialIndex,
  onProgress,
  onComplete,
  onCancel,
}: QuizProps) {
  const [index, setIndex] = useState(Math.min(initialIndex ?? 0, questions.length - 1));
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {});

  const question = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;
  const fmt = question.format ?? "mc";
  const current = answers[question.id];

  // Rank shows a working order even before the user touches it (the given order is a
  // valid ranking); slider/pad have no default and gate Continue until touched.
  const rankOrder =
    current && typeof current === "object" && "order" in current
      ? current.order
      : question.options.map((o) => o.id);

  // Commit an answer for the current question and move on (or finish).
  function commitAndAdvance(value: AnswerValue) {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    if (isLast) {
      onProgress?.(next, index);
      onComplete(next);
      return;
    }
    const nextIndex = index + 1;
    onProgress?.(next, nextIndex);
    setIndex(nextIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Store an in-progress value without advancing (so it saves + shows selected state).
  function setAnswer(value: AnswerValue) {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    onProgress?.(next, index);
  }

  function chooseMc(optionId: string) {
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    if (isLast) {
      onProgress?.(next, index);
      onComplete(next);
      return;
    }
    const nextIndex = index + 1;
    onProgress?.(next, nextIndex);
    // Brief beat so the selection registers before advancing.
    window.setTimeout(() => {
      setIndex(nextIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 160);
  }

  function goBack() {
    if (index === 0) onCancel();
    else setIndex((i) => i - 1);
  }

  const sliderNotch =
    current && typeof current === "object" && "notch" in current ? current.notch : null;
  const padValue =
    current && typeof current === "object" && "x" in current
      ? { x: current.x, y: current.y }
      : null;

  return (
    <Layout
      header={{
        tier,
        showBack: true,
        onBack: goBack,
        progress: { current: index + 1, total, label: TIERS[tier].name },
      }}
    >
      <main className="view view--prose">
        {question.category === "depth" && (
          <span className="quiz__tag">Philosophical · counts at half weight</span>
        )}
        <h2 className="quiz__prompt">{question.stem}</h2>

        {fmt === "mc" && (
          <div className="answers" role="radiogroup" aria-label={question.stem}>
            {question.options.map((option, i) => {
              const isSel = current === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSel}
                  className={`answer${isSel ? " answer--selected" : ""}`}
                  onClick={() => chooseMc(option.id)}
                >
                  <span className="answer__letter" aria-hidden="true">
                    {"ABCDE"[i]}
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Slider / pad commit on settle (§7) — no Continue button. */}
        {fmt === "slider" && question.slider && (
          <SliderInput
            key={question.id}
            config={question.slider}
            notch={sliderNotch}
            onChange={(notch) => setAnswer({ notch })}
            onSettle={(notch) => commitAndAdvance({ notch })}
          />
        )}

        {fmt === "pad" && question.pad && (
          <PadInput
            key={question.id}
            config={question.pad}
            value={padValue}
            onChange={(v) => setAnswer(v)}
            onSettle={(v) => commitAndAdvance(v)}
          />
        )}

        {/* Rank has no single final act, so it keeps an explicit Continue. */}
        {fmt === "rank" && (
          <>
            <RankInput
              key={question.id}
              options={question.options}
              order={rankOrder}
              onChange={(order) => setAnswer({ order })}
            />
            <div className="quiz__advance">
              <Button
                variant="luminous"
                size="md"
                caps
                onClick={() => commitAndAdvance({ order: rankOrder })}
              >
                {isLast ? "See my result" : "Continue"}
              </Button>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
