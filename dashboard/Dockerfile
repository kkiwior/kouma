FROM oven/bun:1.3.10-alpine AS builder

WORKDIR /usr/src/app

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build

FROM oven/bun:1.3.10-alpine

WORKDIR /usr/src/app

COPY package.json ./
RUN bun install --production

# The built Vue frontend artifacts are output to public/vue-app
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/backend ./backend

EXPOSE 3001

CMD ["bun", "backend/server.ts"]
