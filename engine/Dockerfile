# Build stage
FROM golang:1.26.0-alpine AS builder

WORKDIR /build

# Copy go module files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o kouma-engine ./engine

# Runtime stage
FROM alpine:3.19

WORKDIR /usr/src/app
RUN mkdir -p screenshots

COPY --from=builder /build/kouma-engine .

EXPOSE 3002

ENV PORT=3002

CMD ["./kouma-engine"]
