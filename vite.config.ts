import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { devApiPlugin } from "./dev/vite-plugin-dev-api";

// https://vite.dev/config/
export default defineConfig({
  // devApiPlugin runs the Vercel-style api/*.ts handlers under `npm run dev`
  // (they otherwise only run on a deploy). Dev-only; no effect on the build.
  plugins: [react(), devApiPlugin()],
  // Preview tools (#deep-demo and the #deep-preview* screens) exist in `npm run dev`
  // and in Vercel PREVIEW deployments only, so changes can be checked on a private
  // preview link without spending on the API. Production and local `npm run build`
  // get `false`, and the guarded code is dropped from the bundle.
  define: {
    __PREVIEW_TOOLS__: JSON.stringify(process.env.VERCEL_ENV === "preview"),
  },
  server: {
    port: 5173,
  },
});
