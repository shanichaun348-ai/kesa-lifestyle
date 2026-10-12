# syntax=docker/dockerfile:1.7
# Kesa Lifestyle — production image. See deploy/README.md.
#
# Build-time secrets: `next build` prerenders catalogue pages, so it needs the
# same environment as runtime. The env file is mounted as a BuildKit secret
# (never copied into a layer). NEXT_PUBLIC_* values are inlined into the
# client bundle at build time, so rebuild after changing them.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG APP_COMMIT_SHA=unknown
ENV APP_COMMIT_SHA=$APP_COMMIT_SHA NODE_ENV=production
# The secret is exposed only for this step as .env.production.local, which Next loads during the build.
RUN --mount=type=secret,id=app_env,target=/app/.env.production.local pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
ARG APP_COMMIT_SHA=unknown
ENV APP_COMMIT_SHA=$APP_COMMIT_SHA
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs \
  && apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD curl -fsS http://127.0.0.1:3000/api/health/ > /dev/null || exit 1
CMD ["node", "server.js"]
