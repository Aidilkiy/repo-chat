FROM node:20-alpine AS build
WORKDIR /app
# python3/make/g++ are required to build better-sqlite3's native binding
RUN apk add --no-cache python3 make g++
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
RUN npm install --omit=dev
EXPOSE 8788
CMD ["node", "dist/index.js"]
