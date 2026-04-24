# Sharpee Multiuser Server — production image.
#
# BUILD CONTEXT: the repository root. tools/server is a pnpm workspace member
# (pnpm-workspace.yaml lists it), and its @sharpee/* dependencies use
# `workspace:*` — so the Docker build context must include packages/ and the
# workspace lockfile, not just tools/server/.
# Invoke from the repo root:
#   docker build -f tools/server/Dockerfile -t sharpee-server .
#
# Multi-stage build:
#   1. client-builder — builds the React multi-user client → client/dist/.
#   2. node-builder   — pnpm-installs the server's workspace graph, runs tsc,
#                       then `pnpm deploy --prod` materialises a standalone
#                       /deploy folder with all @sharpee/* symlinks resolved
#                       into real files (no pnpm symlink chains survive).
#   3. runtime        — slim Node + Deno, copies /deploy verbatim.
#
# Deno is required at runtime to spawn sandboxes (ADR-153 Decision 1, Phase 4
# remediation). The install-time story bundler invokes esbuild the first time
# each .sharpee is requested and caches the result in $STORIES_COMPILED_DIR.

# ---------- Stage 1: Build the multi-user browser client ----------
FROM node:22-slim AS client-builder
WORKDIR /build/tools/server/client

# Install client deps first so changes to src/ do not bust the install layer.
COPY tools/server/client/package.json tools/server/client/package-lock.json* ./
RUN npm install --no-audit --no-fund

# Source + config files.
COPY tools/server/client/tsconfig.json tools/server/client/vite.config.ts tools/server/client/index.html ./
COPY tools/server/client/src ./src
# The client re-exports wire types from the server's authoritative definitions
# (see client/src/types/wire.ts). Expose only the wire module, not the whole
# server, to preserve single-source-of-truth without leaking server internals.
# src/wire/primitives.ts holds the shared primitives (Tier, TextBlock,
# DomainEvent); the whole wire/ directory is self-contained and Node-free.
COPY tools/server/src/wire /build/tools/server/src/wire

RUN npm run build

# ---------- Stage 2: Build the Node server ----------
FROM node:22-slim AS node-builder
WORKDIR /build

# pnpm via corepack. tools/server's @sharpee/* deps use `workspace:*` — plain
# `npm install` cannot resolve them outside a pnpm workspace context.
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Workspace metadata.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# All @sharpee/* packages (tools/server pulls 9 directly, plus their
# transitive deps). The packages must be pre-built on the host — their
# package.json `exports.import` points at dist-esm/index.js, which is what
# the install-time bundler inlines for each story.
COPY packages ./packages

# Server source, tests, config.
COPY tools/server ./tools/server

# Resolve deps through pnpm (filter confines the install to the server's
# reachable graph — no point materialising every story/tutorial package).
RUN pnpm install --filter sharpee-server... --frozen-lockfile

# Build the server.
WORKDIR /build/tools/server
RUN pnpm exec tsc
# deno-entry.ts is excluded from tsc emit (Deno globals). story-bundler's
# resolveServerPaths() probes for it as a sibling of the compiled
# story-bundler.js — stage it there explicitly.
RUN cp src/sandbox/deno-entry.ts dist/sandbox/deno-entry.ts

# TODO(4-R-3): when the stub apparatus is stripped, add a build-time smoke
# step that runs the acceptance-gate + bundler tests against real Deno
# inside the builder stage. Skipped for now because many stub-backed tests
# break as expected collateral from 4-R-2.

# Materialise a standalone deploy folder. `pnpm deploy --prod` inlines every
# workspace dependency as real files under node_modules/ (no lingering
# symlinks to /build/packages), drops devDeps, and produces a tree that can
# be copied verbatim into the runtime stage.
WORKDIR /build
RUN pnpm --filter sharpee-server deploy --prod --legacy /deploy

# ---------- Stage 3: Runtime ----------
FROM node:22-slim AS runtime
# Install Deno for the sandbox; retain curl for the compose healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl unzip \
  && curl -fsSL https://deno.land/install.sh | sh \
  && mv /root/.deno/bin/deno /usr/local/bin/deno \
  && apt-get purge -y unzip \
  && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# /deploy already contains dist/, node_modules/, package.json, migrations/,
# and every source file from tools/server — everything needed to run.
COPY --from=node-builder --chown=node:node /deploy ./
COPY --from=client-builder --chown=node:node /build/tools/server/client/dist ./client-dist

# Data dirs. /data/stories-compiled is the install-time bundle cache —
# story-cache.getCompiledBundle() writes <slug>.host.js here on first spawn
# and skips esbuild on subsequent spawns for the same mtime.
RUN mkdir -p /data/db /data/stories /data/stories-compiled \
  && chown -R node:node /data /app

# Default data volumes (override with bind mounts / named volumes in compose).
VOLUME ["/data/db", "/data/stories", "/data/stories-compiled"]

USER node

EXPOSE 8080
ENV NODE_ENV=production \
    DB_PATH=/data/db/sharpee.db \
    STORIES_DIR=/data/stories \
    STORIES_COMPILED_DIR=/data/stories-compiled \
    CONFIG_FILE=/etc/sharpee-platform.yaml \
    CLIENT_DIST_DIR=/app/client-dist

CMD ["node", "dist/index.js"]
