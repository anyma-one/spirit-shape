// Reveal carousel controller (design handoff: reveal_carousel). Ported from the
// prototype's logic class — the source of truth for geometry, timings, and rules.
// Framework-agnostic (Web Animations API + refs); React just renders the static
// DOM and mounts this. Three animal masks share one centered anchor and are placed
// by their signed rank-offset from the focused animal; browsing pans all three the
// same direction (a rotation, not a swap). The primary floats + pulses at rest.
//
// Colour comes from CSS mask-image + background (set in the DOM), so this file only
// drives opacity, blur, drop-shadow glow, transform, and z — never the tint.

export type FocusKey = "primary" | "secondary" | "tertiary";

export interface CarouselPill {
  key: FocusKey;
  open: boolean; // clickable → focuses this animal
  softLock: boolean; // secondary in Speed: filled look but shows the lock, not switchable
  unlockHint: string; // hint shown on hover when locked/soft-locked
}

export interface RevealCarouselOptions {
  tierScope: "speed" | "soul" | "deep";
  order: FocusKey[]; // present animals in rank order (primary, secondary[, tertiary])
  pills: CarouselPill[];
  text: Record<string, { name: string; epithet: string }>;
  baseHint: string;
  onFocus: (key: FocusKey) => void;
  /** Clicking a locked/soft-locked pill routes here (→ the unlock CTA below). */
  onLockedClick?: () => void;
}

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const SEL: Record<FocusKey, string> = {
  primary: ".rc-pill-primary",
  secondary: ".rc-pill-secondary",
  tertiary: ".rc-pill-tertiary",
};

export function initRevealCarousel(root: HTMLElement, opts: RevealCarouselOptions) {
  const { order, pills, text, baseHint, onFocus, onLockedClick } = opts;
  const reduce = !!(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  let focus: FocusKey = "primary";
  const offOf: Record<string, number> = {};
  order.forEach((k, i) => (offOf[k] = i));
  const anims: Animation[] = [];
  let settleT: number | undefined;
  let hintAnim: Animation | null = null;

  const el = (key: FocusKey) =>
    root.querySelector<HTMLElement>('[data-key="' + key + '"]');

  // carousel slot for a signed rank-offset from focus: focus dead-centre, others fan out.
  const POS = (o: number) => {
    const sign = o < 0 ? -1 : 1;
    const mag = Math.abs(o);
    const x = mag === 0 ? 0 : (mag === 1 ? 205 : 340) * sign;
    const s = mag === 0 ? 1.12 : mag === 1 ? 0.5 : 0.34;
    const z = 6 - mag * 2;
    return { x, y: 0, s, z };
  };

  // opacity + blur/glow for an animal given its offset and tier rules. Blur grows with
  // distance; the tertiary stays a faint, blurry ghost while locked (Speed/Soul), only
  // clearing in Deep, and is always the faintest.
  const styleFor = (key: FocusKey, o: number) => {
    const mag = Math.abs(o);
    let op = mag === 0 ? 1 : mag === 1 ? 0.5 : 0.24;
    let blur = mag === 0 ? 0 : mag === 1 ? 1.0 : 2.2;
    let glow = mag === 0 ? "0 0 16px" : mag === 1 ? "0 0 10px" : "0 0 7px";
    let glowA = mag === 0 ? 0.5 : 0.34;
    if (key === "tertiary") {
      if (opts.tierScope !== "deep") {
        op = 0.2; // also-close ghost: was 0.07 (too faint)
        blur = Math.max(blur, 3.5); // was 10 → 7.5 → 3.5 (still too blurry)
      } else {
        op = mag === 0 ? 0.5 : op * 0.45;
        blur = mag === 0 ? 0.9 : blur + 3;
      }
      op = Math.min(op, 0.5);
      glowA = 0.18;
    }
    return {
      opacity: op,
      filter: "blur(" + blur.toFixed(2) + "px) drop-shadow(" + glow + " rgba(169,238,242," + glowA + "))",
    };
  };

  const T = (slot: { x: number; y: number; s: number }, extraScale?: number) =>
    "translate(-50%,-50%) translate(" + slot.x + "px," + slot.y + "px) scale(" + slot.s * (extraScale || 1) + ")";

  const setText = (f: FocusKey) => {
    const d = text[f];
    if (!d) return;
    const n = root.querySelector(".rc-name");
    const e = root.querySelector(".rc-epithet");
    if (n) n.textContent = d.name;
    if (e) e.textContent = d.epithet;
  };

  const setActive = (f: FocusKey) => {
    order.forEach((k) => {
      const p = root.querySelector(SEL[k]);
      if (p) p.classList.toggle("rc-active", k === f);
    });
  };

  const setHint = (txt: string) => {
    const elh = root.querySelector<HTMLElement>(".rc-hint");
    if (!elh || elh.textContent === txt) return;
    if (hintAnim) {
      try {
        hintAnim.cancel();
      } catch (e) {
        /* noop */
      }
    }
    if (reduce) {
      elh.textContent = txt;
      return;
    }
    const cur = parseFloat(getComputedStyle(elh).opacity) || 1;
    const out = elh.animate([{ opacity: cur }, { opacity: 0 }], {
      duration: 150,
      easing: EASE,
      fill: "forwards",
    });
    hintAnim = out;
    out.onfinish = () => {
      elh.textContent = txt;
      hintAnim = elh.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: EASE, fill: "both" });
    };
  };

  const settleFocus = (delay: number) => {
    window.clearTimeout(settleT);
    root.querySelectorAll(".rc-an").forEach((e) => e.classList.remove("rc-settled"));
    if (focus !== "primary") return;
    settleT = window.setTimeout(() => {
      if (focus !== "primary") return;
      const e = el("primary");
      if (!e) return;
      e.getAnimations().forEach((a) => {
        try {
          a.cancel();
        } catch (x) {
          /* noop */
        }
      });
      e.style.opacity = "1";
      e.style.transform = T(POS(0));
      e.classList.add("rc-settled");
    }, delay);
  };

  const applyFocus = (f: FocusKey, animate: boolean) => {
    const fi = order.indexOf(f);
    root.querySelectorAll(".rc-an").forEach((e) => e.classList.remove("rc-settled"));
    window.clearTimeout(settleT);
    order.forEach((k) => {
      const e = el(k);
      if (!e) return;
      const oldOff = offOf[k];
      const from = POS(oldOff);
      const fromSt = styleFor(k, oldOff);
      const no = order.indexOf(k) - fi; // new signed offset from focus
      const to = POS(no);
      const toSt = styleFor(k, no);
      e.style.zIndex = String(to.z);
      offOf[k] = no;
      if (!animate) {
        e.style.transform = T(to);
        e.style.opacity = String(toSt.opacity);
        e.style.filter = toSt.filter;
        return;
      }
      anims.push(
        e.animate(
          [
            { transform: T(from), opacity: fromSt.opacity, filter: fromSt.filter },
            { transform: T(to), opacity: toSt.opacity, filter: toSt.filter },
          ],
          { duration: 780, easing: EASE, fill: "both" },
        ),
      );
    });

    settleFocus(animate ? 880 : 120);

    const tb = root.querySelector<HTMLElement>(".rc-textblock");
    if (!animate || !tb) {
      setText(f);
      return;
    }
    const out = tb.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE, fill: "forwards" });
    out.onfinish = () => {
      setText(f);
      tb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: EASE, fill: "both" });
    };
  };

  const switchFocus = (f: FocusKey) => {
    if (f === focus) return;
    focus = f;
    setActive(f);
    applyFocus(f, true);
    onFocus(f);
  };

  const setupInteractions = () => {
    const hint = root.querySelector(".rc-hint");
    pills.forEach((g) => {
      const pill = root.querySelector<HTMLElement>(SEL[g.key]);
      if (!pill) return;
      pill.classList.remove("rc-locked", "rc-softlock");
      pill.onclick = null;
      pill.onmouseenter = null;
      pill.onmouseleave = null;
      if (g.open) {
        pill.onclick = () => switchFocus(g.key);
      } else {
        pill.classList.add(g.softLock ? "rc-softlock" : "rc-locked");
        pill.onmouseenter = () => setHint(g.unlockHint);
        pill.onmouseleave = () => setHint(baseHint);
        // a locked pill can't switch focus — it points the user to the unlock CTA below
        pill.onclick = () => onLockedClick?.();
      }
    });
    if (hint) hint.textContent = baseHint;
  };

  const intro = () => {
    // seat each animal in its starting slot (hidden)
    order.forEach((k) => {
      const e = el(k);
      if (!e) return;
      const slot = POS(offOf[k]);
      const st = styleFor(k, offOf[k]);
      e.style.zIndex = String(slot.z);
      e.style.transform = T(slot);
      e.style.filter = st.filter;
      e.style.opacity = "0";
    });
    setText("primary");
    setActive("primary");

    if (reduce) {
      order.forEach((k) => {
        const e = el(k);
        if (!e) return;
        const st = styleFor(k, offOf[k]);
        e.style.opacity = String(st.opacity);
        e.style.filter = st.filter;
      });
      root.querySelectorAll<HTMLElement>(".rc-fade").forEach((x) => (x.style.opacity = "1"));
      const stars = root.querySelector<HTMLElement>(".rc-stars");
      if (stars) stars.style.opacity = "1";
      settleFocus(0);
      return;
    }

    const push = (a: Animation | undefined) => a && anims.push(a);
    const A = (sel: string, kf: Keyframe[], dur: number, delay: number) => {
      const e = root.querySelector<HTMLElement>(sel);
      if (!e) return;
      push(e.animate(kf, { duration: dur, delay: delay || 0, easing: EASE, fill: "both" }));
    };
    A(".rc-stars", [{ opacity: 0 }, { opacity: 1 }], 1500, 0);
    A(".rc-kicker", [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], 700, 300);
    // bloom
    A(
      ".rc-echo",
      [
        { opacity: 0, transform: "translate(-50%,-50%) scale(0.3)" },
        { opacity: 0.8, transform: "translate(-50%,-50%) scale(1.6)", offset: 0.3 },
        { opacity: 0, transform: "translate(-50%,-50%) scale(4.6)" },
      ],
      2400,
      500,
    );
    A(
      ".rc-core",
      [
        { opacity: 0, transform: "translate(-50%,-50%) scale(0.4)" },
        { opacity: 1, transform: "translate(-50%,-50%) scale(1.3)", offset: 0.45 },
        { opacity: 0, transform: "translate(-50%,-50%) scale(4.6)" },
      ],
      1900,
      650,
    );
    // primary zooms into the focus slot with the bloom
    const f = POS(0);
    const sf = styleFor("primary", 0);
    const pe = el("primary");
    if (pe)
      push(
        pe.animate(
          [
            { opacity: 0, transform: T(f, 0.5), filter: "drop-shadow(0 0 46px rgba(169,238,242,0.9)) blur(6px)" },
            { opacity: sf.opacity, transform: T(f), filter: sf.filter },
          ],
          { duration: 1200, delay: 700, easing: EASE, fill: "both" },
        ),
      );
    // runners settle in
    if (order.includes("secondary")) {
      const r = POS(1);
      const sr = styleFor("secondary", 1);
      const se = el("secondary");
      if (se)
        push(
          se.animate(
            [
              { opacity: 0, transform: T(r, 0.72), filter: sr.filter },
              { opacity: sr.opacity, transform: T(r), filter: sr.filter },
            ],
            { duration: 900, delay: 1750, easing: EASE, fill: "both" },
          ),
        );
    }
    if (order.includes("tertiary")) {
      const a2 = POS(2);
      const sa = styleFor("tertiary", 2);
      const te = el("tertiary");
      if (te)
        push(
          te.animate(
            [
              { opacity: 0, transform: T(a2, 0.72), filter: sa.filter },
              { opacity: sa.opacity, transform: T(a2), filter: sa.filter },
            ],
            { duration: 900, delay: 2050, easing: EASE, fill: "both" },
          ),
        );
    }
    // chrome
    A(".rc-textblock", [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], 800, 1200);
    root.querySelectorAll<HTMLElement>(".rc-fade").forEach((x, i) => {
      if (x.classList.contains("rc-kicker") || x.classList.contains("rc-textblock")) return;
      push(
        x.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], {
          duration: 620,
          delay: 2500 + i * 120,
          easing: EASE,
          fill: "both",
        }),
      );
    });
    settleFocus(2100);
  };

  setupInteractions();
  intro();

  return {
    destroy() {
      window.clearTimeout(settleT);
      anims.forEach((a) => {
        try {
          a.cancel();
        } catch (e) {
          /* noop */
        }
      });
      if (hintAnim) {
        try {
          hintAnim.cancel();
        } catch (e) {
          /* noop */
        }
      }
    },
  };
}
