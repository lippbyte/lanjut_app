# Gunakan base image resmi Node.js 20 LTS berbasis Alpine yang ringan
FROM node:20-alpine AS base

# Pasang dependensi sistem jika diperlukan
RUN apk add --no-cache tzdata curl

WORKDIR /app

# Salin manifest dependensi terlebih dahulu untuk optimasi caching lapisan Docker
COPY package*.json ./

# Pasang hanya dependensi produksi
RUN npm ci --omit=dev

# Salin kode sumber aplikasi dan data benih
COPY src/ ./src/
COPY config/ ./config/
COPY tools/ ./tools/
COPY data-konten/ ./data-konten/

# Buat pengguna non-root demi keamanan kontainer
USER node

# Port bawaan API
ENV PORT=4000
EXPOSE 4000

# Pemeriksaan kesehatan kontainer via GET /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD sh -c "curl -f http://localhost:${PORT:-4000}/health || exit 1"

# Jalankan server
CMD ["node", "src/index.js"]
