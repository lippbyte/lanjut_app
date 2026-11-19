// Alamat dengar server (LANJUT_027 seri v2): uji HP lewat Expo Go di Wi-Fi yang sama.
//
// - Produksi: tetap mendengar di semua antarmuka, seperti sebelumnya (kontainer Docker butuh itu).
//   DEV_DENGAN_JARINGAN_LOKAL di produksi DITOLAK: server tidak mau menyala.
// - Di luar produksi, bawaannya hanya 127.0.0.1: server dev tidak bisa dijangkau dari perangkat lain.
// - DEV_DENGAN_JARINGAN_LOKAL=1 membuka server dev di jaringan lokal (0.0.0.0), hanya bila host
//   basis data lokal dan namanya diawali lanjut_dev (pagar yang sama dengan LANJUT_022/025).
//   Tidak ada terowongan publik, tidak mengubah firewall, dan batas laju tidak berubah.

const os = require('os');
const { hostLokal } = require('../db/pagar-tujuan');

const POLA_DB_DEV = /^lanjut_dev($|_)/i;
const SEMUA_ANTARMUKA = '0.0.0.0';
const HANYA_KOMPUTER_INI = '127.0.0.1';

/** Alasan menolak membuka server di jaringan lokal, atau null bila boleh. */
function alasanTolakJaringanLokal(env) {
  if (env.NODE_ENV === 'production') return 'DEV_DENGAN_JARINGAN_LOKAL tidak boleh dipakai di NODE_ENV=production.';
  if (!hostLokal(env.DB_HOST)) return `DEV_DENGAN_JARINGAN_LOKAL ditolak: host basis data ${env.DB_HOST} bukan lokal.`;
  if (!POLA_DB_DEV.test(String(env.DB_NAME ?? ''))) {
    return `DEV_DENGAN_JARINGAN_LOKAL ditolak: basis data ${env.DB_NAME} bukan basis data dev (harus diawali lanjut_dev).`;
  }
  return null;
}

/**
 * Host untuk `listen`. `undefined` = semua antarmuka (hanya produksi, perilaku lama).
 * Melempar galat bila opsi jaringan lokal dipakai di tempat yang tidak boleh.
 */
function alamatDengar(env) {
  if (env.DEV_DENGAN_JARINGAN_LOKAL) {
    const alasan = alasanTolakJaringanLokal(env);
    if (alasan) throw new Error(alasan);
    return SEMUA_ANTARMUKA;
  }
  return env.NODE_ENV === 'production' ? undefined : HANYA_KOMPUTER_INI;
}

/** Alamat IPv4 jaringan lokal komputer ini, untuk dicetak di log. */
function alamatLan() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => a.address);
}

module.exports = { alasanTolakJaringanLokal, alamatDengar, alamatLan, SEMUA_ANTARMUKA, HANYA_KOMPUTER_INI };
