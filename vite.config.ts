import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { devApiPlugin } from "./dev/vite-plugin-dev-api";

// https://vite.dev/config/
export default defineConfig({
  // devApiPlugin runs the Vercel-style api/*.ts handlers under `npm run dev`
  // (they otherwise only run on a deploy). Dev-only; no effect on the build.
  plugins: [react(), devApiPlugin()],
  server: {
    port: 5173,
  },
});
