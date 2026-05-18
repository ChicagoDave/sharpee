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
# Base image is pinned by sha256 digest (ADR-179 AC-8). The digest
# covers both linux/amd64 and linux/arm64 manifests. Update on every
# Node 20 / Debian security release; both FROM lines must move
# together.
FROM node:20-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS deps
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Build tooling for the native better-sqlite3 dep.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
# Root tsconfigs that workspace packages extend (`extends: ../../tsconfig.base.json`).
COPY tsconfig.json tsconfig.base.json tsconfig.base-esm.json tsconfig.package.json ./
COPY turbo.json ts-forge.config.json ./
COPY packages ./packages
COPY tools/zifmia ./tools/zifmia

RUN pnpm install --frozen-lockfile

# ────────────────────────────────────────────────────────────────
# Stage 2 — compile zifmia + every workspace dep it imports
# ────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /workspace

# `...` builds the package and all its workspace dependencies. This
# produces CJS dist/ (used by zifmia's Node server) and an interim
# extensionless ESM dist-esm/ via each package's `tsc -p tsconfig.esm.json`.
RUN pnpm --filter '@sharpee/zifmia...' run build

# Re-emit dist-esm/ via @davidcornelson/tsf so relative imports get the
# `.js` / `/index.js` extensions Node ESM requires. tsf overwrites the
# extensionless output left by `tsc -p tsconfig.esm.json`. Per-package
# `ts-forge.json` files opt out packages outside zifmia's ESM closure.
RUN pnpm exec tsf build --condition esm

# Materialise a self-contained deployable for @sharpee/zifmia.
# `pnpm deploy` rewrites workspace:* deps into real copies and
# resolves the dependency closure into a flat node_modules tree.
RUN pnpm --filter @sharpee/zifmia --prod --legacy deploy /deploy

# ────────────────────────────────────────────────────────────────
# Stage 3 — slim runtime
# ────────────────────────────────────────────────────────────────
# Same digest as the deps stage — keeps the runtime layer's libc /
# OpenSSL / system Node identical to the one the native modules were
# compiled against. Move both pins together (ADR-179 AC-8).
FROM node:20-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS runtime

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
