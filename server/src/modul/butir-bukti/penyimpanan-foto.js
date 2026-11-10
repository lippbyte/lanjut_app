// Penyimpanan berkas foto butir bukti (LANJUT_010 seri v2). Satu-satunya tempat yang menyentuh
// disk untuk foto.
//
// Tata letak: <DIREKTORI_BERKAS>/foto-butir-bukti/<sidik akun>/<nama acak>.<jpg|png|webp>
// - Nama acak dibuat server. Tidak ada masukan pengguna yang menjadi bagian jalur.
// - Folder per akun, supaya hapus akun bisa menemukan semua foto dari penggunaId saja.
// - Sidik akun adalah hash satu arah, jadi jalur berkas tidak memuat ID akun.
//
// Penghapusan yang gagal dicatat di berkas_tertunda_hapus dan diselesaikan
// `npm run bersihkan-berkas`.

const crypto = require('crypto');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const env = require('../../config/env');
const { buatUuid } = require('../../util/id');
const { sekarangUntukDb } = require('../../util/waktu');
const { daftarkanPenyediaBerkas } = require('../data-pengguna/berkas-pengguna');
const tertundaRepo = require('./berkas-tertunda.repo');

const SUBFOLDER = 'foto-butir-bukti';
const POLA_NAMA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const POLA_RELATIF = /^[0-9a-f]{32}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

// Folder yang disajikan sebagai statis. Foto tidak boleh berada di dalamnya.
const AKAR_APP = path.resolve(__dirname, '..', '..', '..', '..');
const FOLDER_STATIS = [path.join(AKAR_APP, 'dist'), path.join(AKAR_APP, 'public')];

const akarFoto = () => path.join(env.DIREKTORI_BERKAS, SUBFOLDER);
const sidikAkun = (penggunaId) => crypto.createHash('sha256').update(String(penggunaId)).digest('hex').slice(0, 32);

function relatifUntuk(penggunaId, namaTersimpan) {
  if (!POLA_NAMA.test(namaTersimpan)) throw new Error('nama_tersimpan tidak sah');
  return `${sidikAkun(penggunaId)}/${namaTersimpan}`;
}

function jalurMutlak(relatif) {
  if (!POLA_RELATIF.test(relatif)) throw new Error('jalur berkas tidak sah');
  return path.join(akarFoto(), ...relatif.split('/'));
}

const diDalam = (anak, induk) => {
  const r = path.relative(induk, anak);
  return r === '' || (!r.startsWith('..') && !path.isAbsolute(r));
};

/** Dipanggil saat server menyala. Saklar menyala tanpa folder yang sah: server menolak berjalan. */
function pastikanSiap() {
  if (!env.PORTOFOLIO_AKTIF) return;
  const folder = env.DIREKTORI_BERKAS;
  if (!folder) throw new Error('PORTOFOLIO_AKTIF menyala, tetapi DIREKTORI_BERKAS kosong. Foto tidak punya tempat penyimpanan.');
  if (!path.isAbsolute(folder)) throw new Error(`DIREKTORI_BERKAS harus berupa jalur lengkap, dapat: "${folder}".`);
  if (FOLDER_STATIS.some((statis) => diDalam(path.resolve(folder), statis))) {
    throw new Error(`DIREKTORI_BERKAS "${folder}" berada di dalam folder yang disajikan sebagai statis.`);
  }
  const uji = path.join(akarFoto(), `.uji-tulis-${process.pid}`);
  try {
    fsSync.mkdirSync(akarFoto(), { recursive: true, mode: 0o700 });
    fsSync.writeFileSync(uji, '');
    fsSync.unlinkSync(uji);
  } catch (galat) {
    throw new Error(`DIREKTORI_BERKAS "${folder}" tidak bisa ditulis: ${galat.message}`);
  }
}

/** Mengembalikan nama_tersimpan. `wx`: tidak pernah menimpa berkas yang sudah ada. */
async function tulis(penggunaId, isi, ekstensi) {
  const namaTersimpan = `${buatUuid()}.${ekstensi}`;
  const jalur = jalurMutlak(relatifUntuk(penggunaId, namaTersimpan));
  await fs.mkdir(path.dirname(jalur), { recursive: true, mode: 0o700 });
  await fs.writeFile(jalur, isi, { flag: 'wx', mode: 0o600 });
  return namaTersimpan;
}

/** Isi berkas, atau null bila berkasnya tidak ada. */
async function baca(penggunaId, namaTersimpan) {
  try {
    return await fs.readFile(jalurMutlak(relatifUntuk(penggunaId, namaTersimpan)));
  } catch (galat) {
    if (galat.code === 'ENOENT') return null;
    throw galat;
  }
}

async function catatGagal(relatif, alasan, galat) {
  console.error(`[hapus-berkas-gagal] berkas=${relatif} alasan=${alasan} galat=${galat.code || galat.message}`);
  try {
    await tertundaRepo.catat({
      id: buatUuid(),
      namaTersimpan: relatif,
      alasan: `${alasan}: ${galat.code || galat.message}`.slice(0, 255),
      waktu: sekarangUntukDb(),
    });
  } catch (galatCatat) {
    console.error(`[hapus-berkas-gagal] berkas=${relatif} tidak tercatat: ${galatCatat.message}`);
  }
}

/** Berkas yang sudah tidak ada dianggap berhasil. */
async function hapusRelatif(relatif) {
  try {
    await fs.unlink(jalurMutlak(relatif));
  } catch (galat) {
    if (galat.code !== 'ENOENT') throw galat;
  }
}

/** Tidak melempar: kegagalan dicatat dan permintaan siswa tetap selesai. */
async function hapus(penggunaId, namaTersimpan, alasan) {
  const relatif = relatifUntuk(penggunaId, namaTersimpan);
  try {
    await hapusRelatif(relatif);
  } catch (galat) {
    await catatGagal(relatif, alasan, galat);
  }
}

/** Penyedia untuk hapusBerkasPengguna: semua foto satu akun. */
async function hapusSemuaMilik(penggunaId) {
  const sidik = sidikAkun(penggunaId);
  const folder = path.join(akarFoto(), sidik);
  let nama;
  try {
    nama = await fs.readdir(folder);
  } catch (galat) {
    if (galat.code === 'ENOENT') return;
    throw galat;
  }
  let gagal = 0;
  for (const n of nama) {
    const relatif = `${sidik}/${n}`;
    try {
      await hapusRelatif(relatif);
    } catch (galat) {
      gagal += 1;
      await catatGagal(relatif, 'hapus_akun', galat);
    }
  }
  if (gagal > 0) throw new Error(`${gagal} foto gagal dihapus dan sudah dicatat`);
  await fs.rmdir(folder).catch(() => {});
}

/** Mencoba ulang yang tertunda. Mode `cek` hanya menghitung. */
async function bersihkanTertunda({ cek = false } = {}) {
  const baris = await tertundaRepo.daftar();
  const hasil = { tertunda: baris.length, berhasil: 0, gagal: 0 };
  if (cek) return hasil;
  for (const b of baris) {
    try {
      await hapusRelatif(b.nama_tersimpan);
      await tertundaRepo.hapus(b.id);
      await fs.rmdir(path.dirname(jalurMutlak(b.nama_tersimpan))).catch(() => {});
      hasil.berhasil += 1;
    } catch (galat) {
      await tertundaRepo.tambahPercobaan(b.id);
      hasil.gagal += 1;
    }
  }
  return hasil;
}

/** Berkas di disk yang tidak ada di basis data. Hanya dilaporkan, tidak pernah dihapus otomatis. */
async function daftarBerkasYatim(namaTerdaftar) {
  const tertunda = new Set((await tertundaRepo.daftar()).map((b) => b.nama_tersimpan));
  const yatim = [];
  let folderAkun;
  try {
    folderAkun = await fs.readdir(akarFoto());
  } catch (galat) {
    if (galat.code === 'ENOENT') return yatim;
    throw galat;
  }
  for (const sidik of folderAkun) {
    const folder = path.join(akarFoto(), sidik);
    if (!(await fs.stat(folder)).isDirectory()) continue;
    for (const n of await fs.readdir(folder)) {
      const relatif = `${sidik}/${n}`;
      if (!namaTerdaftar.has(n) && !tertunda.has(relatif)) yatim.push(relatif);
    }
  }
  return yatim;
}

// Terdaftar selama foldernya diisi, juga saat saklar mati: foto yang sudah tersimpan tetap
// harus ikut terhapus bersama akunnya.
if (env.DIREKTORI_BERKAS) daftarkanPenyediaBerkas({ nama: SUBFOLDER, hapus: hapusSemuaMilik });

module.exports = { pastikanSiap, tulis, baca, hapus, hapusSemuaMilik, bersihkanTertunda, daftarBerkasYatim, sidikAkun, SUBFOLDER };
