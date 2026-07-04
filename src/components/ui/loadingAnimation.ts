// Spirit Animal — quiz loading particle animation. Ported verbatim (logic-wise)
// from the design handoff's framework-agnostic `initLoadingAnimation` (plain
// Canvas 2D + requestAnimationFrame). A cloud of particles flies its own
// great-circle orbits around an invisible sphere, then gathers inward and flashes
// a central bloom on a 5s loop. The canvas is fully cleared each frame (trails come
// from per-particle history), so there is never any residue/echo.
//
// Mount when loading begins; call .destroy() when it ends.

export interface LoadingOptions {
  tier: "speed" | "soul" | "deep"; // particle hue
  particleCount: number; // 3–100
  particleSize: number; // 0.3–3 multiplier
  orbitSpeed: number; // 0.2–2.5 (flight speed only)
  trail: number; // 0 = dots, 1 = long comets
  glow: number; // 0.4–2 brightness/size
  autoBloom: boolean; // loop the gather→bloom→reset
  loopSeconds: number; // total loop duration (s)
}

interface HistSample {
  x: number;
  y: number;
  a: number;
  sz: number;
  sp: HTMLCanvasElement;
}

interface Particle {
  vx: number;
  vy: number;
  vz: number;
  kx: number;
  ky: number;
  kz: number;
  w: number;
  ph: number;
  jit: number;
  wob: number;
  wobw: number;
  wobph: number;
  size: number;
  tw: number;
  twph: number;
  base: number;
  hist: HistSample[] | null;
}

const TIER_COLORS: Record<string, [number, number, number]> = {
  speed: [143, 230, 228],
  soul: [60, 200, 220],
  deep: [251, 247, 236],
};
const AURA: [number, number, number] = [169, 238, 242];

export function initLoadingAnimation(
  canvas: HTMLCanvasElement,
  opts: Partial<LoadingOptions> = {},
): { destroy: () => void } {
  const CONFIG: LoadingOptions = {
    tier: opts.tier ?? "soul",
    particleCount: opts.particleCount ?? 60,
    particleSize: opts.particleSize ?? 1,
    orbitSpeed: opts.orbitSpeed ?? 1,
    trail: opts.trail ?? 0.55,
    glow: opts.glow ?? 1,
    autoBloom: opts.autoBloom !== false,
    loopSeconds: opts.loopSeconds ?? 5,
  };

  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy: () => {} };

  const reduced = !!(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  let spriteTier: string | null = null;
  let spriteTierCanvas: HTMLCanvasElement | null = null;
  let spriteAura: HTMLCanvasElement | null = null;
  let particles: Particle[] = [];
  let count = 0;
  let cssW = 0;
  let cssH = 0;
  let t = 0;
  let orbT = 0;
  let angle = 0;
  let last = performance.now();
  let raf = 0;
  let dead = false;

  function makeSprite(rgb: [number, number, number]): HTMLCanvasElement {
    const S = 80;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const g = c.getContext("2d")!;
    const lift = (ch: number) => Math.round(ch + (255 - ch) * 0.7);
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.06, `rgba(${lift(rgb[0])},${lift(rgb[1])},${lift(rgb[2])},0.98)`);
    grad.addColorStop(0.16, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.85)`);
    grad.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.26)`);
    grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    return c;
  }

  function buildSprites() {
    const tc = TIER_COLORS[CONFIG.tier] ?? TIER_COLORS.soul;
    spriteTierCanvas = makeSprite(tc);
    spriteAura = makeSprite(AURA);
    spriteTier = CONFIG.tier;
  }

  function randDir(): [number, number, number] {
    let x: number, y: number, z: number, d: number;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
      d = x * x + y * y + z * z;
    } while (d > 1 || d < 1e-4);
    const l = Math.sqrt(d);
    return [x / l, y / l, z / l];
  }

  function initParticles() {
    const N = Math.round(CONFIG.particleCount || 60);
    const pts: Particle[] = [];
    for (let i = 0; i < N; i++) {
      const v = randDir();
      const k = randDir();
      pts.push({
        vx: v[0], vy: v[1], vz: v[2],
        kx: k[0], ky: k[1], kz: k[2],
        w: (0.35 + Math.random() * 1.25) * (Math.random() < 0.5 ? -1 : 1),
        ph: Math.random() * Math.PI * 2,
        jit: 0.74 + Math.random() * 0.3,
        wob: 0.05 + Math.random() * 0.13,
        wobw: 0.6 + Math.random() * 1.6,
        wobph: Math.random() * Math.PI * 2,
        size: 2.0 + Math.random() * 2.4,
        tw: 0.6 + Math.random() * 1.8,
        twph: Math.random() * Math.PI * 2,
        base: 0.55 + Math.random() * 0.45,
        hist: null,
      });
    }
    particles = pts;
    count = N;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || window.innerWidth || 1280;
    const h = canvas.clientHeight || window.innerHeight || 720;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    cssW = w;
    cssH = h;
  }

  function frame(now: number) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (!cssW || !cssH) resize();

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (spriteTier !== CONFIG.tier) buildSprites();
    if (count !== Math.round(CONFIG.particleCount || 60)) initParticles();

    const glow = CONFIG.glow || 1;
    const speed = (CONFIG.orbitSpeed || 1) * (reduced ? 0.18 : 1);

    // Loop phases. loopSeconds = when the "coming together" peaks (the reveal
    // fires then). orbit fills the lead-in, then gather→bloom culminates exactly
    // at loopSeconds; bloom is centred on it so the flash peaks at the reveal.
    // reset (disperse) lives past loopSeconds and is normally never seen.
    const L = CONFIG.loopSeconds || 5;
    const D = { orbit: Math.max(0.5, L - 1.3), gather: 1.0, bloom: 0.6, reset: 0.7 };
    const cycle = D.orbit + D.gather + D.bloom + D.reset;
    let gather = 1;
    let spin = 1;
    let pAlpha = 1;
    let flash = 0;

    if (CONFIG.autoBloom && !reduced) {
      t += dt;
      if (t > cycle) t -= cycle;
      const ct = t;
      if (ct < D.orbit) {
        spin = 1 + 0.35 * (ct / D.orbit);
      } else if (ct < D.orbit + D.gather) {
        const u = (ct - D.orbit) / D.gather;
        const e = u * u * u;
        gather = 1 - 0.9 * e;
        spin = 1.35 + 3.4 * e;
      } else if (ct < D.orbit + D.gather + D.bloom) {
        const u2 = (ct - D.orbit - D.gather) / D.bloom;
        gather = 0.1;
        spin = 4.8;
        flash = Math.sin(u2 * Math.PI);
        pAlpha = 1 - 0.85 * u2;
      } else {
        const u3 = (ct - D.orbit - D.gather - D.bloom) / D.reset;
        const e3 = 1 - Math.pow(1 - u3, 3);
        gather = 0.1 + 0.9 * e3;
        spin = 1 + (1 - e3);
        pAlpha = 0.15 + 0.85 * e3;
      }
    }

    orbT += dt * speed * spin;
    angle += dt * speed * 0.05;

    const w = cssW;
    const h = cssH;
    const R = Math.min(w, h) * 0.21;
    const focal = R * 3.2;
    const cx = w / 2;
    const cy = h * 0.43;
    const cosG = Math.cos(angle);
    const sinG = Math.sin(angle);
    const tilt = -0.42;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    ctx!.clearRect(0, 0, w, h);
    ctx!.globalCompositeOperation = "lighter";

    const trail = CONFIG.trail == null ? 0.55 : CONFIG.trail;
    const maxLen = Math.max(0, Math.round(trail * 44));
    const sizeMul = CONFIG.particleSize || 1;
    const tierSprite = spriteTierCanvas!;
    const auraSprite = spriteAura!;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const th = orbT * p.w + p.ph;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const one = 1 - c;
      const kdv = p.kx * p.vx + p.ky * p.vy + p.kz * p.vz;
      const dx = p.vx * c + (p.ky * p.vz - p.kz * p.vy) * s + p.kx * kdv * one;
      const dy = p.vy * c + (p.kz * p.vx - p.kx * p.vz) * s + p.ky * kdv * one;
      const dz = p.vz * c + (p.kx * p.vy - p.ky * p.vx) * s + p.kz * kdv * one;
      const gx = dx * cosG + dz * sinG;
      const gz = -dx * sinG + dz * cosG;
      const y2 = dy * cosT - gz * sinT;
      const z2 = dy * sinT + gz * cosT;
      const x2 = gx;
      const wob = 1 + p.wob * Math.sin(now * 0.0012 * p.wobw + p.wobph);
      const rad = R * gather * p.jit * wob;
      const wz = z2 * rad;
      const persp = focal / (focal - wz);
      const sx = cx + x2 * rad * persp;
      const sy = cy + y2 * rad * persp;
      const depth = (z2 + 1) / 2;
      const tw = 0.62 + 0.38 * Math.sin(now * 0.001 * p.tw + p.twph);
      let a = (0.2 + 0.8 * depth) * tw * pAlpha * p.base * 0.6 * glow;
      if (a < 0) a = 0;
      else if (a > 1) a = 1;
      const size = p.size * sizeMul * (0.6 + 0.95 * depth) * persp * (0.7 + 0.5 * glow);
      const sprite = depth > 0.58 ? auraSprite : tierSprite;

      // comet tail from stored history, fading toward the tip
      if (maxLen > 0 && p.hist) {
        const L = p.hist.length;
        for (let hI = 0; hI < L; hI++) {
          const hs = p.hist[hI];
          const age = (hI + 1) / (L + 1);
          const ha = hs.a * age * 0.8;
          if (ha > 0.004) {
            const hsz = hs.sz * (0.34 + 0.66 * age);
            ctx!.globalAlpha = ha;
            ctx!.drawImage(hs.sp, hs.x - hsz, hs.y - hsz, hsz * 2, hsz * 2);
          }
        }
      }
      // bright head
      ctx!.globalAlpha = a;
      ctx!.drawImage(sprite, sx - size, sy - size, size * 2, size * 2);
      // record history
      if (maxLen > 0) {
        if (!p.hist) p.hist = [];
        p.hist.push({ x: sx, y: sy, a, sz: size, sp: sprite });
        while (p.hist.length > maxLen) p.hist.shift();
      } else if (p.hist) {
        p.hist = null;
      }
    }
    ctx!.globalAlpha = 1;

    // central bloom flash (only while flash > 0 — vanishes instantly after)
    if (flash > 0) {
      const ar = AURA;
      const tr = TIER_COLORS[CONFIG.tier] ?? TIER_COLORS.soul;
      const fr = R * (0.35 + 1.8 * flash);
      const g2 = ctx!.createRadialGradient(cx, cy, 0, cx, cy, fr);
      g2.addColorStop(0, `rgba(${ar[0]},${ar[1]},${ar[2]},${0.85 * flash})`);
      g2.addColorStop(0.35, `rgba(${tr[0]},${tr[1]},${tr[2]},${0.45 * flash})`);
      g2.addColorStop(1, `rgba(${tr[0]},${tr[1]},${tr[2]},0)`);
      ctx!.fillStyle = g2;
      ctx!.fillRect(0, 0, w, h);
    }
    ctx!.globalCompositeOperation = "source-over";
  }

  buildSprites();
  initParticles();
  resize();
  const onResize = () => resize();
  window.addEventListener("resize", onResize);
  frame(last);

  return {
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    },
  };
}
