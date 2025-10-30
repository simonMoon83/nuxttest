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

# Create non-root user
RUN groupadd -r nuxtapp && useradd -r -g nuxtapp -s /bin/false nuxtapp

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

# Copy only the Nitro output
COPY --from=builder --chown=nuxtapp:nuxtapp /app/.output ./.output

# Create uploads directory with proper permissions
RUN mkdir -p /uploads && chown -R nuxtapp:nuxtapp /uploads

# Switch to non-root user
USER nuxtapp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]


