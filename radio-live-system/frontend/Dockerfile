FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN chmod +x scripts/inject-env.sh

ENV NODE_ENV=production
EXPOSE 3000

# Saat container start: tulis ulang public/runtime-env.js dari environment
# variable Railway saat ini, lalu jalankan Next.js.
# Ini membuat NEXT_PUBLIC_API_URL & NEXT_PUBLIC_STREAM_URL selalu sinkron
# tanpa perlu rebuild image setiap kali variable berubah di Railway.
ENTRYPOINT ["scripts/inject-env.sh"]
CMD ["npm", "start"]
