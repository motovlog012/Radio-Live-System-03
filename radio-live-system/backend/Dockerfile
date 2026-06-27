FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies (postinstall otomatis menjalankan `prisma generate`)
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

# Copy seluruh source code
COPY . .

# Generate Prisma Client (idempotent — sudah jalan juga lewat postinstall,
# dipanggil ulang di sini untuk memastikan client selalu sinkron dengan schema)
RUN npx prisma generate

# Build TypeScript -> dist/
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000

# Saat container start:
# 1. Jalankan migration resmi (prisma migrate deploy) menggunakan migration
#    history yang sudah di-commit di prisma/migrations/
# 2. Jika gagal (misalnya database benar-benar baru tanpa history apapun),
#    fallback ke `prisma db push` agar skema tetap tersinkron tanpa downtime.
# 3. Baru jalankan server.
CMD sh -c "npx prisma migrate deploy || npx prisma db push --accept-data-loss; node dist/index.js"
