// Klien SMTP minimal untuk email teks biasa (LANJUT_083: kode masuk OTP).
// Hanya modul bawaan Node (net, tls, crypto) — tanpa paket baru.
//
// Keamanan:
// - Ke server selain localhost, koneksi WAJIB terenkripsi: TLS langsung
//   (SMTP_SECURE, port 465) atau STARTTLS. Tanpa STARTTLS, pengiriman dibatalkan
//   sebelum AUTH, supaya sandi SMTP tidak pernah lewat teks polos.
// - Sertifikat TLS diperiksa (bawaan Node, rejectUnauthorized).
// - Isi pesan, alamat tujuan, dan sandi tidak pernah dicatat di log, juga tidak
//   ikut di pesan galat yang dilempar.
// - Di bawah `node --test` (NODE_TEST_CONTEXT terisi), pengiriman ke server
//   selain localhost DITOLAK sebelum membuka koneksi: tes tidak pernah bisa
//   mengirim email sungguhan.

const net = require('net');
const tls = require('tls');
const crypto = require('crypto');

const BATAS_WAKTU_MS = 15000;

function hostLokal(host) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

// Pesan galat sengaja tanpa isi pesan/alamat/sandi (lihat atas).
class GalatSurel extends Error {
  constructor(pesan, kodeSmtp) {
    super(pesan);
    this.kodeSmtp = kodeSmtp ?? null;
  }
}

/** Alamat dari "Nama <a@b.c>" atau "a@b.c". */
function alamatDari(nilai) {
  const m = /<([^<>\s]+)>\s*$/.exec(nilai);
  return (m ? m[1] : nilai).trim();
}

function pastikanSatuBaris(nilai, nama) {
  if (typeof nilai !== 'string' || /[\r\n]/.test(nilai)) {
    throw new GalatSurel(`Medan ${nama} tidak boleh memuat baris baru.`);
  }
  return nilai;
}

const ALAMAT_REGEX = /^[^\s@<>()",;:\\]+@[^\s@<>()",;:\\]+\.[^\s@<>()",;:\\]+$/;

/** Subjek ASCII apa adanya; selain itu dikodekan RFC 2047 (base64, UTF-8). */
function kodekanSubjek(subjek) {
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7e]*$/.test(subjek)) return subjek;
  return `=?UTF-8?B?${Buffer.from(subjek, 'utf8').toString('base64')}?=`;
}

/** Pesan RFC 5322 lengkap; badan base64 (baris ≤76) supaya aman untuk 7-bit dan tanpa baris berawalan titik. */
function susunPesan({ dari, ke, subjek, teks }) {
  const domainDari = alamatDari(dari).split('@')[1] || 'localhost';
  const badan = Buffer.from(teks.replace(/\r?\n/g, '\r\n'), 'utf8')
    .toString('base64')
    .replace(/.{1,76}/g, '$&\r\n');
  return [
    `From: ${dari}`,
    `To: <${ke}>`,
    `Subject: ${kodekanSubjek(subjek)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domainDari}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    badan,
  ].join('\r\n');
}

/**
 * Satu percakapan SMTP. Membaca balasan multi-baris ("250-...", "250 ...")
 * dan bisa pindah soket saat STARTTLS.
 */
class SesiSmtp {
  constructor() {
    this.soket = null;
    this.sisa = '';
    this.baris = [];
    this.menunggu = [];
    this.galat = null;
    this.saatData = (d) => this.terima(d);
    this.saatGalat = () => this.gagal(new GalatSurel('Koneksi SMTP gagal.'));
    this.saatTutup = () => this.gagal(new GalatSurel('Koneksi SMTP tertutup.'));
  }

  /** Lepas pendengar dari soket lama — wajib sebelum STARTTLS, supaya jabat tangan TLS tidak terbaca sebagai balasan. */
  lepas() {
    if (!this.soket) return;
    this.soket.off('data', this.saatData);
    this.soket.off('error', this.saatGalat);
    this.soket.off('close', this.saatTutup);
    this.soket.setTimeout(0);
  }

  pasang(soket) {
    this.lepas();
    this.soket = soket;
    this.sisa = '';
    soket.on('data', this.saatData);
    soket.on('error', this.saatGalat);
    soket.on('close', this.saatTutup);
    soket.setTimeout(BATAS_WAKTU_MS, () => {
      this.gagal(new GalatSurel('Server SMTP tidak menjawab.'));
      soket.destroy();
    });
  }

  terima(data) {
    this.sisa += data.toString('utf8');
    const bagian = this.sisa.split('\r\n');
    this.sisa = bagian.pop();
    this.baris.push(...bagian);
    this.salurkan();
  }

  salurkan() {
    while (this.menunggu.length > 0) {
      const akhir = this.baris.findIndex((b) => /^\d{3}(?: |$)/.test(b));
      if (akhir === -1) return;
      const balasan = this.baris.splice(0, akhir + 1);
      const kode = Number(balasan[akhir].slice(0, 3));
      this.menunggu.shift().resolve({ kode, baris: balasan.map((b) => b.slice(4)) });
    }
  }

  gagal(err) {
    if (!this.galat) this.galat = err;
    while (this.menunggu.length > 0) this.menunggu.shift().reject(this.galat);
  }

  balasan() {
    if (this.galat) return Promise.reject(this.galat);
    return new Promise((resolve, reject) => {
      this.menunggu.push({ resolve, reject });
      this.salurkan();
    });
  }

  /** Kirim satu perintah, tunggu balasan, dan pastikan kodenya termasuk `diharapkan`. */
  async perintah(baris, diharapkan, namaLangkah) {
    this.soket.write(`${baris}\r\n`);
    return this.harap(diharapkan, namaLangkah);
  }

  async harap(diharapkan, namaLangkah) {
    const b = await this.balasan();
    if (!diharapkan.includes(b.kode)) {
      throw new GalatSurel(`Server SMTP menolak langkah ${namaLangkah} (kode ${b.kode}).`, b.kode);
    }
    return b;
  }
}

function sambung(konfig) {
  return new Promise((resolve, reject) => {
    const opsi = { host: konfig.host, port: konfig.port };
    const soket = konfig.secure ? tls.connect({ ...opsi, servername: konfig.host }) : net.connect(opsi);
    const siap = konfig.secure ? 'secureConnect' : 'connect';
    soket.once(siap, () => {
      soket.off('error', galatAwal);
      resolve(soket);
    });
    const galatAwal = () => reject(new GalatSurel('Tidak bisa terhubung ke server SMTP.'));
    soket.once('error', galatAwal);
  });
}

function naikkanKeTls(soket, host) {
  return new Promise((resolve, reject) => {
    const aman = tls.connect({ socket: soket, servername: host }, () => resolve(aman));
    aman.once('error', () => reject(new GalatSurel('STARTTLS gagal.')));
  });
}

function kemampuan(balasanEhlo) {
  return balasanEhlo.baris.map((b) => b.toUpperCase());
}

async function ehlo(sesi, namaKlien) {
  return kemampuan(await sesi.perintah(`EHLO ${namaKlien}`, [250], 'EHLO'));
}

/**
 * Kirim satu email teks biasa.
 * @param {{ ke: string, subjek: string, teks: string }} pesan
 * @param {{ host: string, port: number, secure: boolean, user?: string|null, password?: string|null, from: string }} konfig
 */
async function kirimSurel({ ke, subjek, teks }, konfig) {
  if (!konfig || !konfig.host || !konfig.from) throw new GalatSurel('SMTP belum dikonfigurasi.');
  if (process.env.NODE_TEST_CONTEXT && !hostLokal(konfig.host)) {
    throw new GalatSurel('Pengiriman email sungguhan diblokir saat tes.');
  }
  pastikanSatuBaris(ke, 'tujuan');
  pastikanSatuBaris(subjek, 'subjek');
  pastikanSatuBaris(konfig.from, 'pengirim');
  if (!ALAMAT_REGEX.test(ke)) throw new GalatSurel('Alamat tujuan tidak valid.');
  const dari = konfig.from;
  const alamatPengirim = alamatDari(dari);
  if (!ALAMAT_REGEX.test(alamatPengirim)) throw new GalatSurel('Alamat pengirim tidak valid.');

  const sesi = new SesiSmtp();
  sesi.pasang(await sambung(konfig));
  try {
    await sesi.harap([220], 'sapaan');
    const namaKlien = alamatPengirim.split('@')[1];
    let fitur = await ehlo(sesi, namaKlien);

    if (!konfig.secure) {
      if (fitur.includes('STARTTLS')) {
        await sesi.perintah('STARTTLS', [220], 'STARTTLS');
        const polos = sesi.soket;
        sesi.lepas();
        sesi.pasang(await naikkanKeTls(polos, konfig.host));
        fitur = await ehlo(sesi, namaKlien);
      } else if (!hostLokal(konfig.host)) {
        throw new GalatSurel('Server SMTP tidak mendukung STARTTLS; pengiriman dibatalkan.');
      }
    }

    if (konfig.user) {
      const auth = fitur.find((f) => f.startsWith('AUTH')) || '';
      if (/\bPLAIN\b/.test(auth) || !/\bLOGIN\b/.test(auth)) {
        const kredensial = Buffer.from(`\u0000${konfig.user}\u0000${konfig.password || ''}`, 'utf8').toString('base64');
        await sesi.perintah(`AUTH PLAIN ${kredensial}`, [235], 'AUTH');
      } else {
        await sesi.perintah('AUTH LOGIN', [334], 'AUTH');
        await sesi.perintah(Buffer.from(konfig.user, 'utf8').toString('base64'), [334], 'AUTH');
        await sesi.perintah(Buffer.from(konfig.password || '', 'utf8').toString('base64'), [235], 'AUTH');
      }
    }

    await sesi.perintah(`MAIL FROM:<${alamatPengirim}>`, [250], 'MAIL FROM');
    await sesi.perintah(`RCPT TO:<${ke}>`, [250, 251], 'RCPT TO');
    await sesi.perintah('DATA', [354], 'DATA');
    sesi.soket.write(susunPesan({ dari, ke, subjek, teks }));
    await sesi.perintah('.', [250], 'akhir DATA');
    await sesi.perintah('QUIT', [221], 'QUIT').catch(() => {});
  } finally {
    sesi.soket.destroy();
  }
}

module.exports = { kirimSurel, susunPesan, GalatSurel, hostLokal };
