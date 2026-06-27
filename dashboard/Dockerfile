FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY dashboard/package.json dashboard/package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Development stage
FROM deps AS dev
WORKDIR /app
COPY dashboard/ .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage
FROM deps AS build
WORKDIR /app
COPY dashboard/ .
RUN npm run build

# Production stage
FROM node:22-alpine AS prod
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js 2>/dev/null || true
RUN chown -R appuser:nodejs /app/dist
USER appuser
EXPOSE 3001
CMD ["node", "server.js"]