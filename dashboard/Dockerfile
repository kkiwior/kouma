FROM oven/bun:1.3.11-alpine AS builder

WORKDIR /usr/src/app

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build

FROM oven/bun:1.3.11-alpine AS prod-deps

WORKDIR /usr/src/app

COPY package.json ./
RUN bun install --production

FROM node:lts-alpine

WORKDIR /usr/src/app

COPY --from=prod-deps /usr/src/app/node_modules ./node_modules

# The built Vue frontend artifacts are output to public/vue-app
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/backend ./backend
COPY package.json ./

EXPOSE 3001

CMD ["node", "--import", "tsx", "backend/server.ts"]
