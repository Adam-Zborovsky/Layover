# Stage 1: Build
FROM node:20-slim AS build
WORKDIR /app

# Install build dependencies for sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace root config
COPY package.json package-lock.json tsconfig.base.json ./

# Copy workspace packages
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src/ packages/shared/src/
COPY apps/server/package.json apps/server/tsconfig.json apps/server/
COPY apps/server/prisma/ apps/server/prisma/
COPY apps/server/src/ apps/server/src/

# Install all dependencies
RUN npm ci

# Generate Prisma client (needed for TypeScript compilation)
RUN npm run db:generate -w apps/server

# Build shared package first
RUN npm run build -w packages/shared

# Build server
RUN npm run build -w apps/server


# Stage 2: Production
FROM node:20-slim

# Install runtime deps for sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built artifacts and all node_modules (includes prisma CLI for migrations)
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/packages/shared/dist /app/packages/shared/dist
COPY --from=build /app/packages/shared/package.json /app/packages/shared/package.json
COPY --from=build /app/apps/server/dist /app/apps/server/dist
COPY --from=build /app/apps/server/package.json /app/apps/server/package.json
COPY --from=build /app/apps/server/prisma /app/apps/server/prisma

# Copy entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create data directories
RUN mkdir -p /app/data/uploads /app/data/exports

EXPOSE 8181

ENTRYPOINT ["/app/docker-entrypoint.sh"]
