FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache ca-certificates

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src
COPY scripts ./scripts

RUN mkdir -p uploads && addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app
USER app

ENV PORT=5000
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
