# --- Tahap 1: Build bundel statis Expo Web ---
FROM node:20-alpine AS builder

WORKDIR /app

# Salin manifest dependensi terlebih dahulu untuk optimasi caching layer Docker
COPY package*.json ./
RUN npm ci

# Salin kode sumber aplikasi frontend
COPY . .

# Argumen build-time untuk app.config.ts (wajib bukan placeholder GANTI-DOMAIN saat export)
ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_GOOGLE_CLIENT_ID=
ARG EXPO_PUBLIC_GOOGLE_REDIRECT_URI=
ARG EXPO_PUBLIC_MIKROFON_NGOBROL=0

ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV EXPO_PUBLIC_GOOGLE_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_CLIENT_ID}
ENV EXPO_PUBLIC_GOOGLE_REDIRECT_URI=${EXPO_PUBLIC_GOOGLE_REDIRECT_URI}
ENV EXPO_PUBLIC_MIKROFON_NGOBROL=${EXPO_PUBLIC_MIKROFON_NGOBROL}

# Ekspor bundel statis web ke direktori /app/dist
RUN npx expo export --platform web

# --- Tahap 2: Jalankan web server berbasis Node.js (tanpa Nginx) ---
FROM node:20-alpine AS production

WORKDIR /app

# Pasang `serve` untuk menyajikan bundel SPA (mendukung fallback rute Expo Router dengan flag -s)
RUN npm install -g serve@14

# Salin hasil build statis dari tahap builder
COPY --from=builder /app/dist ./dist

USER node

ENV PORT=3031
EXPOSE 3031

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:${PORT:-3031}/ || exit 1

CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
