# 1) Build stage
FROM node:20-bookworm-slim AS builder
WORKDIR /app

ENV NODE_ENV=development
ENV CI=true

# Native toolchain for better-sqlite3 (@nuxt/content)
RUN apt-get update && apt-get install -y \
    python3 \
    python-is-python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*
ENV npm_config_build_from_source=true
ENV npm_config_unsafe_perm=true
ENV NODE_OPTIONS=--max-old-space-size=4096

# Install pnpm globally to avoid corepack signature issues
RUN npm i -g pnpm@10.8.0

# Leverage dependency caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch

# Copy source and install/build
COPY . .
RUN pnpm install -r --frozen-lockfile --prod=false \
  && pnpm rebuild better-sqlite3 \
  && pnpm build

# 2) Runtime stage
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

# Copy only the Nitro output
COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]


