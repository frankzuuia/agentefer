FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS toolchain

USER root
RUN npm install --global npm@11.16.0 --ignore-scripts \
  && test "$(npm --version)" = "11.16.0"
WORKDIR /workspace

FROM toolchain AS development-dependencies

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/ai/package.json ./packages/ai/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/domain/package.json ./packages/domain/package.json
COPY packages/observability/package.json ./packages/observability/package.json
RUN npm ci --ignore-scripts

FROM development-dependencies AS build

COPY tsconfig.base.json ./tsconfig.base.json
COPY scripts ./scripts
COPY apps/worker ./apps/worker
COPY packages/ai ./packages/ai
COPY packages/config ./packages/config
COPY packages/observability ./packages/observability
RUN npm run build --workspace @agentefer/worker

FROM toolchain AS production-dependencies

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/ai/package.json ./packages/ai/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/domain/package.json ./packages/domain/package.json
COPY packages/observability/package.json ./packages/observability/package.json
RUN npm ci --omit=dev --ignore-scripts \
  --workspace @agentefer/worker \
  --workspace @agentefer/ai \
  --workspace @agentefer/config \
  --workspace @agentefer/observability

FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=production-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /workspace/apps/worker/package.json ./apps/worker/package.json
COPY --from=production-dependencies --chown=node:node /workspace/packages/ai/package.json ./packages/ai/package.json
COPY --from=production-dependencies --chown=node:node /workspace/packages/config/package.json ./packages/config/package.json
COPY --from=production-dependencies --chown=node:node /workspace/packages/observability/package.json ./packages/observability/package.json
COPY --from=build --chown=node:node /workspace/apps/worker/dist ./apps/worker/dist
COPY --from=build --chown=node:node /workspace/packages/ai/dist ./packages/ai/dist
COPY --from=build --chown=node:node /workspace/packages/config/dist ./packages/config/dist
COPY --from=build --chown=node:node /workspace/packages/observability/dist ./packages/observability/dist

USER node
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.WORKER_HEALTH_PORT + '/health/ready').then((response) => process.exit(response.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "--enable-source-maps", "apps/worker/dist/main.js"]
