/// <reference types="vite/client" />
// Standard Vite ambient types (this project was scaffolded without the file).
// Provides `import.meta.env`, which the DEV-only result-screen preview in
// DeepDive.tsx guards on so Rollup can drop it from production builds.

/** True only in Vercel preview builds (vite.config.ts); pairs with import.meta.env.DEV. */
declare const __PREVIEW_TOOLS__: boolean;
