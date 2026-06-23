# Stage 1: Build
FROM node:22-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN corepack enable && corepack prepare pnpm@11 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/

RUN pnpm install --frozen-lockfile

COPY apps/backend/ apps/backend/

WORKDIR /app/apps/backend
RUN pnpm prisma:generate
RUN pnpm build
RUN pnpm prune --prod

# Stage 2: Production
FROM node:22-alpine AS production

RUN apk add --no-cache tini

WORKDIR /app

COPY --from=build /app/node_modules/.pnpm /app/node_modules/.pnpm
COPY --from=build /app/apps/backend/node_modules /app/apps/backend/node_modules
COPY --from=build /app/apps/backend/dist /app/apps/backend/dist
COPY --from=build /app/apps/backend/package.json /app/apps/backend/package.json
COPY --from=build /app/apps/backend/prisma /app/apps/backend/prisma
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/backend/dist/main.js"]
