FROM node:20-alpine AS builder
WORKDIR /app

# Native module build deps (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache tzdata && addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone bundle
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Schema file read at runtime via fs.readFileSync
COPY --from=builder --chown=nextjs:nodejs /app/lib/schema.sql ./lib/schema.sql

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
