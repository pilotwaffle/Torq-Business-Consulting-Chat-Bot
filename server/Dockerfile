# TORQ Chat BFF — production image
# Multi-stage: build TypeScript, run compiled JS only.
# Port 8787 (override with PORT env var at runtime).

# ── Stage 1: build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Compile TypeScript → dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production node_modules only (no devDependencies)
RUN npm prune --omit=dev

# ── Stage 2: runtime ────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787

# Non-root user
RUN addgroup -g 1001 -S nodejs \
  && adduser -S -u 1001 -G nodejs bff

# Runtime artifacts only
COPY --from=builder --chown=bff:nodejs /app/package.json ./
COPY --from=builder --chown=bff:nodejs /app/package-lock.json ./
COPY --from=builder --chown=bff:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bff:nodejs /app/dist ./dist

USER bff

EXPOSE 8787

# Healthcheck via Node fetch (no wget dependency)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
