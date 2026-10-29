// Verifikasi ID token Google (LANJUT_083) dengan modul bawaan `crypto` — tanpa
// paket baru. Langkah: tanda tangan RS256 terhadap kunci publik Google (JWKS),
// lalu klaim iss, aud (Client ID dari .env), exp/iat, nonce, email, email_verified.
//
// `sumberKunci.ambil` satu-satunya bagian yang memanggil layanan luar. Tes
// menggantinya dengan kunci buatan sendiri; di bawah `node --test` versi
// sungguhannya menolak berjalan, jadi tes tidak pernah menghubungi Google.

const crypto = require('crypto');
const env = require('../../config/env');
const { GalatApi } = require('../../util/respons');

const URL_KUNCI = 'https://www.googleapis.com/oauth2/v3/certs';
const PENERBIT = ['accounts.google.com', 'https://accounts.google.com'];
const KELONGGARAN_DETIK = 60;

let simpanan = { kunci: null, sampai: 0 };

const sumberKunci = {
  /** Daftar JWK publik Google, disimpan sesuai Cache-Control (bawaan 1 jam). */
  async ambil({ segarkan = false } = {}) {
    if (process.env.NODE_TEST_CONTEXT) throw new Error('Permintaan kunci Google sungguhan diblokir saat tes.');
    if (!segarkan && simpanan.kunci && Date.now() < simpanan.sampai) return simpanan.kunci;
    const res = await fetch(URL_KUNCI, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Kunci Google tidak bisa diambil (HTTP ${res.status}).`);
    const { keys } = await res.json();
    const umur = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1] || 3600);
    simpanan = { kunci: Array.isArray(keys) ? keys : [], sampai: Date.now() + umur * 1000 };
    return simpanan.kunci;
  },
};

/** Client ID yang diterima sebagai `aud` (GOOGLE_CLIENT_ID, dipisah koma). Dibaca tiap panggilan. */
function clientIdDiizinkan() {
  return String(env.GOOGLE_CLIENT_ID || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function googleAktif() {
  return clientIdDiizinkan().length > 0;
}

function tidakSah() {
  return new GalatApi('GOOGLE_TIDAK_SAH', 'Masuk dengan Google gagal. Coba lagi.');
}

function bacaBagian(b64) {
  return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
}

async function cariKunci(kid) {
  try {
    let kunci = (await sumberKunci.ambil()).find((k) => k.kid === kid);
    // Google memutar kuncinya; kid yang belum dikenal → ambil ulang sekali.
    if (!kunci) kunci = (await sumberKunci.ambil({ segarkan: true })).find((k) => k.kid === kid);
    return kunci || null;
  } catch {
    console.error('[google] kunci publik Google tidak tersedia');
    throw new GalatApi('GOOGLE_TIDAK_TERSEDIA', 'Masuk dengan Google sedang tidak bisa dipakai.');
  }
}

/**
 * @returns {Promise<{ email: string, sub: string }>} email huruf kecil yang sudah diverifikasi Google.
 */
async function verifikasiIdToken(idToken, nonce) {
  const bagian = String(idToken).split('.');
  if (bagian.length !== 3) throw tidakSah();
  let kepala;
  let isi;
  try {
    kepala = bacaBagian(bagian[0]);
    isi = bacaBagian(bagian[1]);
  } catch {
    throw tidakSah();
  }
  if (kepala.alg !== 'RS256' || typeof kepala.kid !== 'string') throw tidakSah();

  const jwk = await cariKunci(kepala.kid);
  if (!jwk) throw tidakSah();
  let sah = false;
  try {
    const kunciPublik = crypto.createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' });
    sah = crypto.verify(
      'RSA-SHA256',
      Buffer.from(`${bagian[0]}.${bagian[1]}`, 'utf8'),
      kunciPublik,
      Buffer.from(bagian[2], 'base64url')
    );
  } catch {
    sah = false;
  }
  if (!sah) throw tidakSah();

  const sekarang = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(isi.aud) ? isi.aud : [isi.aud];
  const diizinkan = clientIdDiizinkan();
  if (!PENERBIT.includes(isi.iss)) throw tidakSah();
  if (!aud.some((a) => diizinkan.includes(a))) throw tidakSah();
  if (typeof isi.exp !== 'number' || isi.exp + KELONGGARAN_DETIK < sekarang) throw tidakSah();
  if (typeof isi.iat === 'number' && isi.iat - KELONGGARAN_DETIK > sekarang) throw tidakSah();
  // Nonce dari app (GET /auth/google/nonce) harus sama: token curian/sisipan ditolak.
  if (typeof nonce !== 'string' || isi.nonce !== nonce) throw tidakSah();
  if (typeof isi.email !== 'string' || !isi.email.includes('@')) throw tidakSah();
  // Email yang belum diverifikasi Google bisa diisi siapa saja — jangan dipakai untuk masuk.
  if (isi.email_verified !== true && isi.email_verified !== 'true') {
    throw new GalatApi('EMAIL_BELUM_TERVERIFIKASI', 'Email akun Google ini belum terverifikasi.');
  }
  return { email: isi.email.trim().toLowerCase(), sub: String(isi.sub || '') };
}

module.exports = { verifikasiIdToken, googleAktif, clientIdDiizinkan, sumberKunci, PENERBIT };
