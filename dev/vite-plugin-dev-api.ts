import { existsSync } from "node:fs";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";
import { loadEnv } from "vite";

/**
 * Dev-only: run the Vercel-style `api/*.ts` serverless handlers under `npm run dev`.
 *
 * Vercel functions never execute under plain Vite (that's the documented gotcha —
 * `/api/*` only runs on a deploy). This middleware mounts them on `/api/*` locally
 * so the real Deep Dive pipeline (Claude calls, SSE streaming) can be verified on
 * localhost. Production still uses Vercel's own runtime; this file is dev-only
 * (`apply: "serve"`) and is never part of the build.
 *
 * Handlers keep their production `(req, res)` shape: `res.status().json()` for
 * JSON, and raw `res.setHeader/write/end` for streaming — both are adapted here.
 */
export function devApiPlugin(): Plugin {
  let root = process.cwd();
  return {
    name: "anyma-dev-api",
    apply: "serve",
    configResolved(config) {
      root = config.root;
      // Load ALL env vars (no prefix filter) from .env / .env.local into process.env
      // so handlers can read process.env.ANTHROPIC_API_KEY etc. server-side. Existing
      // process.env wins, so a shell-exported key still overrides the file.
      const env = loadEnv(config.mode, config.root, "");
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url ?? "";
        if (!rawUrl.startsWith("/api/")) return next();

        const url = new URL(rawUrl, "http://localhost");
        const name = url.pathname.slice("/api/".length).replace(/\/+$/, "");
        // Only route bare function names (no nested paths / traversal).
        if (!name || !/^[a-z0-9-]+$/i.test(name)) return next();
        // Unknown route -> let Vite handle it (clean 404), don't 500. Only a real
        // handler error below surfaces as 500.
        if (!existsSync(join(root, "api", `${name}.ts`))) return next();

        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const handler = mod.default as
            | ((req: unknown, res: unknown) => unknown)
            | undefined;
          if (typeof handler !== "function") return next();

          const body = await readBody(req);
          const query = Object.fromEntries(url.searchParams);
          const vReq = { method: req.method, headers: req.headers, query, body };
          await handler(vReq, makeRes(res));
        } catch (err) {
          server.ssrFixStacktrace(err as Error);
          const detail = err instanceof Error ? err.message : "Unknown error";
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
          }
          res.end(JSON.stringify({ error: "dev api error", detail }));
        }
      });
    },
  };
}

/** Collect + JSON-parse a request body (mirrors Vercel's auto-parse). */
function readBody(req: IncomingMessage): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD") return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    req.on("error", () => resolve(undefined));
  });
}

/**
 * Adapt a Node ServerResponse to the Vercel handler surface used in this repo:
 * `.status(code).json(obj)` for JSON endpoints, plus passthrough
 * `.setHeader/write/end/flushHeaders` for SSE-streamed endpoints.
 */
function makeRes(raw: ServerResponse) {
  const api = {
    get headersSent() {
      return raw.headersSent;
    },
    status(code: number) {
      raw.statusCode = code;
      return api;
    },
    json(obj: unknown) {
      if (!raw.headersSent) raw.setHeader("content-type", "application/json");
      raw.end(JSON.stringify(obj));
    },
    send(data: string | Buffer) {
      raw.end(data);
    },
    setHeader(key: string, value: string | number | readonly string[]) {
      raw.setHeader(key, value);
      return api;
    },
    getHeader(key: string) {
      return raw.getHeader(key);
    },
    write(chunk: string | Buffer) {
      return raw.write(chunk);
    },
    end(chunk?: string | Buffer) {
      raw.end(chunk);
    },
    flushHeaders() {
      raw.flushHeaders();
    },
  };
  return api;
}
