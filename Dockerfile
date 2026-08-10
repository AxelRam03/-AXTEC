# AXTEC AI backend — production image
# Build:  docker build -t axtec-ai .
# Run:    docker run -p 8080:8080 --env-file .env axtec-ai

FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install prod deps only; include optional pg/ioredis for Postgres/Redis mode.
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:18-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Run as a non-root user (principle of least privilege).
RUN addgroup -S axtec && adduser -S axtec -G axtec

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Never bake secrets into the image — everything sensitive comes from
# environment variables / Secret Manager at deploy time.
RUN rm -f .env

USER axtec
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
