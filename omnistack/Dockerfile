# syntax=docker/dockerfile:1

# ---- base ----
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public site URL must be present at BUILD time so canonical/OG/sitemap URLs
# bake correctly into statically prerendered pages.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone server + assets
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Editable content (mount a volume over this in production to persist edits)
COPY --from=build /app/content ./content

EXPOSE 3000
CMD ["node", "server.js"]
