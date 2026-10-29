// Konfigurasi PM2 untuk Produksi (Jalur B VPS)
// Panduan lengkap: docs/deploy-produksi.md
module.exports = {
  apps: [
    {
      name: 'lanjut-api',
      script: 'src/index.js',
      instances: 'max', // Memanfaatkan semua core CPU yang tersedia di VPS
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      // Batasi penggunaan memori agar tidak bocor
      max_memory_restart: '300M',
      // Waktu tunggu penutupan halus sebelum proses dipaksa berhenti
      kill_timeout: 10000,
      listen_timeout: 5000,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
};
