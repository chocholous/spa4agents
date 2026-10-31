# syntax=docker/dockerfile:1
# Gateway SPA4Agents. Build kontext: kořen repa (viz docker-compose.yml);
# catalog/catalog.yaml se mountuje za běhu, není v image.

FROM node:22-alpine AS build
WORKDIR /app
COPY gateway/package.json gateway/package-lock.json ./
RUN npm ci
COPY gateway/tsconfig.json ./
COPY gateway/src ./src
# tsconfig zahrnuje i test/, proto prázdná složka (jen pro tsc include)
RUN mkdir -p test && npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node gateway/package.json ./
# Neroot uživatel (uid 1000), žádné zapisování na disk, žádný VOLUME.
USER node
EXPOSE 8787
# start v package.json používá tsx (devDependency); v image běží přeložený JS.
CMD ["node", "dist/src/index.js"]
