FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY vibra-api/package.json vibra-api/package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY vibra-api/ ./
RUN npm run prisma:generate && npm run build

# Executa migrations versionadas antes de iniciar a API.
FROM build AS migrate
CMD ["npm", "run", "prisma:migrate:deploy"]

FROM node:24-bookworm-slim AS production-dependencies
WORKDIR /app
COPY vibra-api/package.json vibra-api/package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/generated/prisma ./generated/prisma
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node vibra-api/package.json ./package.json
USER node
EXPOSE 3001
CMD ["node", "dist/src/server.js"]
