// Worker ekstraksi teks PDF (LANJUT_049). Dijalankan oleh ekstrak.js di
// worker_thread TERPISAH dengan batas waktu dan batas memori, supaya PDF yang
// berat atau jahat tidak menahan server; worker dihentikan paksa bila lewat
// waktu.
//
// Pustaka: pdfjs-dist 4.10.38 (Mozilla, Apache-2.0), dijalankan lokal.
// - Data PDF diberikan sebagai byte, bukan URL: pdf.js tidak mengambil apa
//   pun dari luar. Font/cmap eksternal tidak dipakai (standardFontDataUrl &
//   cMapUrl tidak diisi); teks yang butuh cmap luar (mis. CJK) bisa hilang.
// - isEvalSupported: false — tidak ada eval/Function dari isi PDF
//   (pengaman CVE-2024-4367, sudah diperbaiki di 4.2.67).
// - JARING PENGAMAN: modul jaringan Node dimatikan di worker ini sebelum
//   pdf.js dimuat. Kalau suatu saat ada kode yang mencoba membuka koneksi,
//   ekstraksi gagal, bukan diam-diam mengirim data keluar.
// - @napi-rs/canvas (modul native, dependensi opsional pdf.js untuk
//   menggambar halaman) DILARANG dimuat di sini. Ekstraksi teks tidak
//   membutuhkannya, dan memuatnya di worker_thread membuat seluruh proses
//   server kadang crash (segfault, exit 139) saat worker dihentikan.
//
// Pesan ke induk: { ok: true, teks, halaman } atau { ok: false, kode, pesan }
// dengan kode TERENKRIPSI | TERLALU_PANJANG | RUSAK.

import { parentPort, workerData } from 'node:worker_threads';
import Module from 'node:module';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';

const muatAsli = Module._load;
Module._load = function muat(permintaan, ...sisa) {
  if (String(permintaan).startsWith('@napi-rs/canvas')) throw new Error('Modul native kanvas tidak dipakai di worker ekstraksi PDF.');
  return muatAsli.call(this, permintaan, ...sisa);
};

const tolak = () => {
  throw new Error('Akses jaringan dilarang di worker ekstraksi PDF.');
};
net.connect = tolak;
net.createConnection = tolak;
tls.connect = tolak;
http.request = tolak;
http.get = tolak;
https.request = tolak;
https.get = tolak;
dns.lookup = tolak;
globalThis.fetch = async () => tolak();

const { data, batasKarakter } = workerData;

function teksHalaman(isi) {
  let hasil = '';
  for (const item of isi.items) {
    if (typeof item.str !== 'string') continue;
    hasil += item.str;
    if (item.hasEOL) hasil += '\n';
  }
  return hasil;
}

try {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const dok = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    useWorkerFetch: false,
    stopAtErrors: false,
    verbosity: 0,
  }).promise;

  let teks = '';
  for (let i = 1; i <= dok.numPages; i++) {
    const halaman = await dok.getPage(i);
    teks += teksHalaman(await halaman.getTextContent()) + '\n\n';
    halaman.cleanup();
    if (teks.length > batasKarakter * 2) break; // cukup untuk tahu sudah lewat batas
  }
  await dok.destroy();
  parentPort.postMessage({ ok: true, teks, halaman: dok.numPages });
} catch (galat) {
  const kode = galat && galat.name === 'PasswordException' ? 'TERENKRIPSI' : 'RUSAK';
  parentPort.postMessage({ ok: false, kode, pesan: String((galat && galat.message) || galat) });
}
