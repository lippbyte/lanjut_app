# Gunakan base image resmi Node.js 20 LTS berbasis Alpine yang ringan
FROM node:20-alpine AS base

# Pasang dependensi sistem jika diperlukan
RUN apk add --no-cache tzdata curl

WORKDIR /app

# Salin manifest dependensi terlebih dahulu untuk optimasi caching lapisan Docker
COPY package*.json ./

# Pasang hanya dependensi produksi
RUN npm ci --omit=dev

# Salin kode sumber aplikasi
COPY src/ ./src/
COPY config/ ./config/
COPY tools/ ./tools/

# Buat pengguna non-root demi keamanan kontainer
USER node

# Port bawaan API
EXPOSE 4000

# Pemeriksaan kesehatan kontainer via GET /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Jalankan server
CMD ["node", "src/index.js"]
