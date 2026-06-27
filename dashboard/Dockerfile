FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Development stage
FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS prod
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
RUN npm install -g serve
COPY --from=build /app/dist ./dist
RUN chown -R appuser:nodejs /app/dist
USER appuser
EXPOSE 3001
CMD ["serve", "dist", "-l", "3001", "--no-clipboard"]
CMD ["node", "server.js"]