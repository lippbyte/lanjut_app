// Titik masuk: baca env → nyalakan port → penutupan halus. docs/SDD-Backend-Foundation.md §9.2.

const env = require('./config/env');
const { alamatDengar, alamatLan, SEMUA_ANTARMUKA } = require('./config/jaringan-lokal');

// LANJUT_027: alamat dengar diperiksa paling awal, sebelum apa pun dimuat atau port dibuka.
let host;
try {
  host = alamatDengar(env);
} catch (galat) {
  console.error(`[server] DIHENTIKAN. ${galat.message}`);
  process.exit(1);
}

const app = require('./app');
const pool = require('./db/koneksi');

const { bersihkanPendaftaranKedaluwarsa } = require('./modul/auth/daftarEmail.layanan');
const { pastikanSiap: pastikanPenyimpananFotoSiap } = require('./modul/butir-bukti/penyimpanan-foto');

// LANJUT_010: saklar portofolio menyala tanpa folder yang sah berarti server menolak berjalan.
try {
  pastikanPenyimpananFotoSiap();
} catch (galat) {
  console.error(`[server] ${galat.message}`);
  process.exit(1);
}

function saatSiap() {
  console.log(`[server] LANJUT API berjalan di port ${env.PORT} (${env.NODE_ENV})`);
  if (host === SEMUA_ANTARMUKA && env.NODE_ENV !== 'production') {
    const alamat = alamatLan().map((ip) => `http://${ip}:${env.PORT}`);
    console.log('[server] ==================================================================');
    console.log(`[server] TERBUKA DI JARINGAN LOKAL (DEV_DENGAN_JARINGAN_LOKAL=1), basis data ${env.DB_NAME}.`);
    console.log(`[server] Bisa dijangkau dari perangkat di Wi-Fi yang sama: ${alamat.join(', ') || '(alamat LAN tidak ditemukan)'}`);
    console.log('[server] Hanya untuk uji HP dengan data dummy. Matikan opsi ini sesudah selesai.');
    console.log('[server] ==================================================================');
  } else if (host) {
    console.log(`[server] Hanya untuk komputer ini (${host}). Untuk uji HP: docs/uji-hp-expo-go.md.`);
  }
}

const server = host ? app.listen(env.PORT, host, saatSiap) : app.listen(env.PORT, saatSiap);

// LANJUT_083c: data daftar sementara dihapus setelah 30 menit, juga bila tidak ada pendaftaran
// baru yang memicu pembersihan. Tiap 5 menit; tidak menahan proses saat ditutup.
const penyapuPendaftaran = setInterval(() => {
  bersihkanPendaftaranKedaluwarsa().catch(() => console.error('[daftar] gagal membersihkan data daftar sementara'));
}, 5 * 60 * 1000);
penyapuPendaftaran.unref();

let sedangMenutup = false;

function tutupHalus(sinyal) {
  if (sedangMenutup) return;
  sedangMenutup = true;
  console.log(`[server] Menerima sinyal ${sinyal}, memulai penutupan halus...`);

  // Batas waktu pemaksaan berhenti (10 detik) jika permintaan menggantung
  const timeoutPaksa = setTimeout(() => {
    console.error('[server] Batas waktu penutupan halus (10 detik) terlampaui, keluar paksa.');
    process.exit(1);
  }, 10000);
  timeoutPaksa.unref();

  server.close(async (err) => {
    if (err) {
      console.error('[server] Galat saat menutup server HTTP:', err.message);
    } else {
      console.log('[server] Koneksi HTTP selesai ditutup.');
    }

    try {
      await pool.end();
      console.log('[server] Pool basis data berhasil ditutup.');
      process.exit(0);
    } catch (dbErr) {
      console.error('[server] Galat saat menutup pool basis data:', dbErr.message);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => tutupHalus('SIGTERM'));
process.on('SIGINT', () => tutupHalus('SIGINT'));

module.exports = server;
