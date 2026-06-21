# Dockerfile untuk Workbook Generator
# Bikin aplikasi siap deploy ke server manapun

FROM oven/bun:1.1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Build Next.js untuk production
RUN bun run build

# Production image - lebih kecil
FROM oven/bun:1.1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy file yang dibutuhkan saja
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=base /app/assets ./assets
COPY --from=base /app/package.json ./

# Buat folder untuk database SQLite
RUN mkdir -p /app/db

# Expose port
EXPOSE 3000

# Command untuk jalan
CMD ["bun", "server.js"]
