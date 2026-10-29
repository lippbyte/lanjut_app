#!/usr/bin/env bash
# ==============================================================================
# Skrip Pemulihan Basis Data LANJUT (mysql restore)
# Memulihkan dump SQL ke basis data yang dikonfigurasi.
# Penggunaan: ./pulihkan-db.sh <path/ke/cadangan.sql>
# ==============================================================================
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Penggunaan: $0 <path/ke/cadangan.sql>"
  exit 1
fi

BERKAS_CADANGAN="$1"

if [[ ! -f "$BERKAS_CADANGAN" ]]; then
  echo "Galat: Berkas '$BERKAS_CADANGAN' tidak ditemukan!"
  exit 1
fi

DIR_SERVER="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR_SERVER"

if [[ -f ".env" ]]; then
  export $(grep -E '^(DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME)=' .env | xargs -d '\n' || true)
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-lanjut_db}"

echo "[pulihkan-db] Memulihkan basis data '$DB_NAME' dari '$BERKAS_CADANGAN'..."

export MYSQL_PWD="$DB_PASSWORD"

mysql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  "$DB_NAME" < "$BERKAS_CADANGAN"

echo "[pulihkan-db] Pemulihan selesai dengan sukses."
