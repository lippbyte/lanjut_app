#!/usr/bin/env bash
# ==============================================================================
# Skrip Cadangan Harian Basis Data LANJUT (mysqldump)
# Menjalankan pencadangan aman tanpa kata sandi tertulis di skrip atau CLI.
# ==============================================================================
set -euo pipefail

# Pindah ke direktori server
DIR_SERVER="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR_SERVER"

# Muat berkas .env jika ada dan variabel belum disetel
if [[ -f ".env" ]]; then
  # Hanya muat variabel basis data dari .env
  export $(grep -E '^(DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME)=' .env | xargs -d '\n' || true)
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-lanjut_db}"

FOLDER_CADANGAN="${FOLDER_CADANGAN:-$DIR_SERVER/cadangan}"
mkdir -p "$FOLDER_CADANGAN"

WAKTU=$(date +"%Y%m%d_%H%M%S")
BERKAS_KELUARAN="$FOLDER_CADANGAN/cadangan_${DB_NAME}_${WAKTU}.sql"

echo "[cadangan-db] Memulai pencadangan basis data '$DB_NAME'..."

# Gunakan MYSQL_PWD agar kata sandi tidak terlihat di daftar proses sistem (ps/top)
export MYSQL_PWD="$DB_PASSWORD"

mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  "$DB_NAME" > "$BERKAS_KELUARAN"

echo "[cadangan-db] Berhasil disimpan di: $BERKAS_KELUARAN ($(wc -c < "$BERKAS_KELUARAN" | tr -d ' ') bytes)"

# Rotasi sederhana: hapus cadangan yang lebih tua dari 7 hari
echo "[cadangan-db] Menjalankan rotasi cadangan (retensi 7 hari)..."
find "$FOLDER_CADANGAN" -type f -name "cadangan_${DB_NAME}_*.sql*" -mtime +7 -exec rm -f {} \; || true

echo "[cadangan-db] Selesai."
