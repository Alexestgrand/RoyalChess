# Build monorepo puis image runtime avec node_modules émondés (--prod).
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @royalchess/shared build
RUN pnpm --filter @royalchess/api exec prisma generate --schema src/prisma/schema.prisma
RUN pnpm --filter @royalchess/api build
RUN pnpm prune --prod

FROM node:20-alpine AS production
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -D nestjs
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo /repo
USER nestjs
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
