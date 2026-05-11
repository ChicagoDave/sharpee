# Zifmia — single-container Docker image (ADR-175 §Decision 3).
#
# Multi-stage build:
#   1. `deps`  — installs the pnpm workspace (workspace deps resolved
#                against the monorepo at /workspace) and builds every
#                package zifmia depends on.
#   2. `build` — compiles tools/zifmia/ to dist/.
#   3. `runtime` — minimal Node 20 image containing only the resolved
#                  production deps and the built dist/ tree.
#
# The image runs `node dist/cli.js` and listens on $ZIFMIA_PORT
# (default 3000). SQLite database lives in /data (mount a volume).

# ────────────────────────────────────────────────────────────────
# Stage 1 — install + build deps
# ────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Copy the entire monorepo so workspace deps resolve correctly.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY tools/zifmia ./tools/zifmia

RUN pnpm install --frozen-lockfile

# ────────────────────────────────────────────────────────────────
# Stage 2 — compile zifmia (and the packages it depends on)
# ────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /workspace

RUN pnpm --filter '@sharpee/zifmia...' run build

# ────────────────────────────────────────────────────────────────
# Stage 3 — slim runtime
# ────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    ZIFMIA_PORT=3000 \
    ZIFMIA_HOST=0.0.0.0 \
    ZIFMIA_SQLITE_PATH=/data/zifmia.db

# better-sqlite3 needs the prebuilt native binary; it's resolved at
# install time. We copy the workspace's node_modules wholesale so the
# resolved dep graph (incl. workspace:* deps) works at runtime.
COPY --from=build /workspace/node_modules /app/node_modules
COPY --from=build /workspace/packages /app/packages
COPY --from=build /workspace/tools/zifmia /app/tools/zifmia

# Volume for the SQLite database file (override with ZIFMIA_SQLITE_PATH).
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

WORKDIR /app/tools/zifmia
CMD ["node", "dist/cli.js"]
