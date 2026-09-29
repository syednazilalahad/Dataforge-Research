FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
FROM base AS dependencies
COPY package.json ./
# Bootstrap build: generate a lockfile. Pin and commit it after the first verified
# install, then change this to COPY the lockfile and use --frozen-lockfile.
RUN pnpm install --no-frozen-lockfile
FROM dependencies AS build
COPY . .
RUN pnpm build
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/migrations ./migrations
COPY --from=build --chown=node:node /app/next.config.ts ./next.config.ts
USER node
EXPOSE 3000
CMD ["node","node_modules/next/dist/bin/next","start","--hostname","0.0.0.0"]
