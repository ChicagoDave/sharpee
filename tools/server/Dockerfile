# Sharpee Multiuser Server — production image.
#
# BUILD CONTEXT: the repository root (because we need access to ../../packages/core).
# Invoke from the repo root:
#   docker build -f tools/server/Dockerfile -t sharpee-server .
# Or via the reference compose, which sets the context explicitly.
#
# Multi-stage build:
#   1. node-builder — installs deps, compiles TypeScript → tools/server/dist/.
#   2. runtime      — slim Node image + Deno binary, copies built server + sandbox entry.
#
# The Deno binary is required at runtime for spawning --allow-none sandboxes
# (ADR-153 Decision 1).

# ---------- Stage 1: Build the Node server ----------
FROM node:22-slim AS node-builder
WORKDIR /build

# Sharpee packages the server imports (relative file: deps resolved at install time).
COPY packages/core ./packages/core

# The server itself — tests + vitest config come along for the build-time smoke test.
COPY tools/server/package.json tools/server/tsconfig.json tools/server/vitest.config.ts ./tools/server/
COPY tools/server/src ./tools/server/src
COPY tools/server/tests ./tools/server/tests
COPY tools/server/migrations ./tools/server/migrations

WORKDIR /build/tools/server
RUN npm install
# Fail-fast: if any unit/integration test fails, the image build fails.
RUN npm test
RUN npx tsc
# deno-entry.ts is excluded from tsc (Deno reads .ts directly), so tsc never
# emits it. sandbox-process.ts spawns Deno against dist/sandbox/deno-entry.ts
# at runtime — copy the source into place so the runtime stage picks it up
# via the existing dist COPY.
RUN cp src/sandbox/deno-entry.ts dist/sandbox/deno-entry.ts

# ---------- Stage 2: Runtime ----------
FROM node:22-slim AS runtime
# Install Deno for the sandbox; retain curl for the compose healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl unzip \
  && curl -fsSL https://deno.land/install.sh | sh \
  && mv /root/.deno/bin/deno /usr/local/bin/deno \
  && apt-get purge -y unzip \
  && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=node-builder --chown=node:node /build/tools/server/dist ./dist
COPY --from=node-builder --chown=node:node /build/tools/server/node_modules ./node_modules
COPY --from=node-builder --chown=node:node /build/tools/server/package.json ./package.json
COPY --from=node-builder --chown=node:node /build/tools/server/migrations ./migrations
COPY --chown=node:node tools/server/deno.json ./deno.json

# Create data dirs owned by node so named volumes inherit writable perms on first up.
RUN mkdir -p /data/db /data/stories && chown -R node:node /data

# Default data volumes (override with bind mounts / named volumes in compose).
VOLUME ["/data/db", "/data/stories"]

USER node

EXPOSE 8080
ENV NODE_ENV=production \
    DB_PATH=/data/db/sharpee.db \
    STORIES_DIR=/data/stories \
    CONFIG_FILE=/etc/sharpee-platform.yaml

CMD ["node", "dist/index.js"]
