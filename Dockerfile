# --- build frontend ---
FROM node:20-alpine AS web-build
WORKDIR /app/web
COPY web/package.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# --- build server ---
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# --- runtime ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# python3/make/g++ are required to build better-sqlite3's native binding
RUN apk add --no-cache python3 make g++
COPY --from=server-build /app/server/package.json ./
COPY --from=server-build /app/server/dist ./dist
COPY --from=web-build /app/web/dist ./dist/public
RUN npm install --omit=dev
EXPOSE 8787
CMD ["node", "dist/index.js"]
