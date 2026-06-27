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
FROM nginx:alpine AS prod
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 appuser
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN chown -R appuser:appuser /usr/share/nginx/html && \
    touch /var/run/nginx.pid && \
    chown appuser:appuser /var/run/nginx.pid /var/log/nginx /var/cache/nginx 2>/dev/null || true
USER appuser
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]