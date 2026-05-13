# syntax=docker/dockerfile:1.7
#
# Zifmia — self-contained multi-user server image.
#
# Owner: tools/zifmia. Built from the monorepo root so workspace deps
# (`@sharpee/*`) resolve correctly. Anyone can build their own image
# from this repo and run a Zifmia instance with `docker run` or
# `docker compose up`.
#
# Multi-stage build:
#   1. deps    — installs pnpm workspace, fetches every dep.
#   2. build   — compiles tools/zifmia and the packages it imports.
#   3. runtime — slim Node 20 image with only the resolved deps + dist.
#
# Build context: the REPO ROOT, not tools/zifmia. From the repo root:
#   docker build -f tools/zifmia/Dockerfile -t sharpee/zifmia:dev .
#
# Or via docker compose (the compose file sets context: ../..):
#   docker compose -f tools/zifmia/docker-compose.yml up --build

# ────────────────────────────────────────────────────────────────
# Stage 1 — install workspace deps
# ────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Build tooling for the native better-sqlite3 dep.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
# Root tsconfigs that workspace packages extend (`extends: ../../tsconfig.base.json`).
COPY tsconfig.json tsconfig.base.json tsconfig.base-esm.json tsconfig.package.json ./
COPY turbo.json ./
COPY packages ./packages
COPY tools/zifmia ./tools/zifmia

RUN pnpm install --frozen-lockfile

# ────────────────────────────────────────────────────────────────
# Stage 2 — compile zifmia + every workspace dep it imports
# ────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /workspace

# `...` builds the package and all its workspace dependencies.
RUN pnpm --filter '@sharpee/zifmia...' run build

# ESM extension fixup. Each package's `tsconfig.esm.json` uses
# `moduleResolution: "bundler"`, so `tsc -p tsconfig.esm.json` emits
# extensionless relative imports — invalid for Node ESM. Host builds
# fix this via the external `tsf` tool; inside Docker we mirror that
# transform by rewriting `from './x'` / `from '../x'` to add `.js` or
# `/index.js` when the target exists.
RUN node -e '\
const fs = require("fs");\
const path = require("path");\
function walk(dir, out) {\
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {\
    const p = path.join(dir, e.name);\
    if (e.isDirectory()) walk(p, out);\
    else if (e.name.endsWith(".js")) out.push(p);\
  }\
}\
function findEsmDirs(root) {\
  const out = [];\
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {\
    if (!e.isDirectory()) continue;\
    const sub = path.join(root, e.name, "dist-esm");\
    if (fs.existsSync(sub)) out.push(sub);\
  }\
  return out;\
}\
const dirs = findEsmDirs("/workspace/packages");\
const re = /(from\s+|import\s*\()\s*(["\x27])(\.\.?\/[^"\x27]+)(["\x27])/g;\
let touched = 0;\
for (const d of dirs) {\
  const files = []; walk(d, files);\
  for (const file of files) {\
    const orig = fs.readFileSync(file, "utf8");\
    const next = orig.replace(re, (m, kw, q1, spec, q2) => {\
      if (/\.(m?js|json)$/i.test(spec)) return m;\
      const base = path.resolve(path.dirname(file), spec);\
      if (fs.existsSync(base + ".js")) return `${kw}${q1}${spec}.js${q2}`;\
      if (fs.existsSync(path.join(base, "index.js"))) return `${kw}${q1}${spec}/index.js${q2}`;\
      return m;\
    });\
    if (next !== orig) { fs.writeFileSync(file, next); touched++; }\
  }\
}\
console.log(`[esm-fix] rewrote ${touched} file(s) across ${dirs.length} dist-esm tree(s)`);\
'

# Materialise a self-contained deployable for @sharpee/zifmia.
# `pnpm deploy` rewrites workspace:* deps into real copies and
# resolves the dependency closure into a flat node_modules tree.
RUN pnpm --filter @sharpee/zifmia --prod --legacy deploy /deploy

# ────────────────────────────────────────────────────────────────
# Stage 3 — slim runtime
# ────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

# ADR-178 §AC-3: every Zifmia image records the Story Runtime Baseline
# version it ships in this label. The default fallback (1) matches the
# v1 baseline; `build.sh -c zifmia` reads the value from
# `@sharpee/story-runtime-baseline` and overrides via --build-arg so
# the manifest stays the single source of truth.
ARG BASELINE_VERSION=1
LABEL org.sharpee.story-runtime-baseline="${BASELINE_VERSION}"

ENV NODE_ENV=production \
    ZIFMIA_PORT=3000 \
    ZIFMIA_HOST=0.0.0.0 \
    ZIFMIA_DB=/data/zifmia.db \
    ZIFMIA_STORIES=/stories \
    ZIFMIA_WEB_ROOT=/app/dist/web

WORKDIR /app

# Drop the deploy bundle in place — it already contains dist/,
# node_modules/, package.json with workspace:* refs rewritten.
COPY --from=build /deploy /app

# Mount points for operator-owned state.
#   /data    — SQLite database file (durable rooms/identities/saves).
#   /stories — drop `*.sharpee` bundles here; SIGHUP rescans.
RUN mkdir -p /data /stories
VOLUME ["/data", "/stories"]

# Drop privileges. Node's slim image ships a `node` user (uid 1000).
RUN chown -R node:node /data /stories /app
USER node

EXPOSE 3000

# Readiness probe — /api/stories is cheap, returns 200 once the
# Fastify listener is up. The e2e harness uses the same probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.ZIFMIA_PORT+'/api/stories').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

WORKDIR /app
CMD ["node", "dist/main.js"]
