# syntax=docker/dockerfile:1.7
#
# Linkbase image (docs/deployment.md §2). Two targets you build directly:
#   check   the CI gate, in the CI image:   docker build --target check .
#   runner  the production server:          docker build -t linkbase .
#
# Keep NODE_IMAGE identical to every `container.image` in
# .github/workflows/ci-cd.yml — the checks job fails if they differ.
# Debian (glibc), not Alpine: @node-rs/argon2 installs a per-platform binary.
ARG NODE_IMAGE=node:24.22.0-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# The same gate as the `checks` job (deployment.md §3).
FROM deps AS check
COPY . .
RUN npm run format:check \
 && npx next typegen \
 && npm run lint \
 && npm run typecheck \
 && npm test \
 && npm audit --omit=dev --audit-level=high

FROM deps AS builder
COPY . .
# lib/db/connect.ts requires MONGODB_URI at import, but the build never
# connects — an unreachable placeholder satisfies it without putting a
# credential in any layer. Real values arrive at `docker run`.
RUN NEXT_OUTPUT=standalone \
    MONGODB_URI=mongodb://build-placeholder.invalid:27017/linkbase \
    npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Code stays root-owned and read-only to the app; only the Next cache is
# writable by the unprivileged `node` user the server runs as.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
RUN mkdir -p .next/cache && chown node:node .next/cache

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server.js"]
