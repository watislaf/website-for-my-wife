FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/data/app.db
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
# migrate.mjs runs at startup (see CMD). It needs @libsql/client +
# drizzle-orm/libsql/migrator. Next's standalone trace copies @libsql/client
# and drizzle-orm/libsql (imported by the app) but NOT the /migrator subpath,
# so copy the full drizzle-orm + @libsql packages to guarantee migrate resolves.
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build /app/node_modules/@libsql ./node_modules/@libsql
EXPOSE 3000
# Fly gotcha: release_command runs on a machine with NO volume mounted, so we
# migrate at startup on the real machine (which has /data). Migration is
# idempotent (drizzle tracks applied migrations), so running it every boot is safe.
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
