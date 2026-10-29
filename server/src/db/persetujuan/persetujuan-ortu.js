// Persetujuan orang tua/wali lewat sekolah (LANJUT_047), pola skrip
// verifikasi-konten. Sekolah mengumpulkan surat persetujuan yang
// ditandatangani (docs/surat-persetujuan-ortu-wali-DRAF.md), lalu petugas
// mencatatnya di sini untuk daftar nama pengguna. Tidak ada panel admin web.
//
// - Setiap perubahan WAJIB diakhiri --ya; tanpa itu skrip hanya menampilkan
//   pratinjau lalu berhenti tanpa mengubah apa pun.
// - --catatan wajib (nomor/tanggal surat): jejak siapa-kapan-dasar apa.
// - Riwayat tidak ditimpa: setuju dan --cabut sama-sama menambah baris di
//   tabel `persetujuan` (lewat persetujuan.repo.js, satu jalur tulis).
// - Satu nama pengguna saja yang tidak ditemukan → tidak ada yang diubah.
// - Yang tidak berubah apa-apa (sudah setuju versi yang sama; --cabut untuk
//   akun tanpa persetujuan aktif) dilewati dan disebut di pratinjau.
//
// Pemakaian (dari folder LANJUT_App/server):
//   npm run persetujuan-ortu -- --status --pengguna=budi.smk12,ani.12
//   npm run persetujuan-ortu -- --pengguna=budi.smk12,ani.12 --catatan="Surat 012/SMKN4/X/2026, 3 Okt 2026"          (pratinjau)
//   npm run persetujuan-ortu -- --pengguna=budi.smk12,ani.12 --catatan="Surat 012/SMKN4/X/2026, 3 Okt 2026" --ya     (mencatat)
//   npm run persetujuan-ortu -- --berkas=daftar-kelas-12a.txt --catatan="..." --ya     (satu nama pengguna per baris; # = komentar)
//   npm run persetujuan-ortu -- --pengguna=budi.smk12 --cabut --catatan="Surat pencabutan 3 Okt 2026" --ya
// Pilihan lain: --sumber=surat_sekolah|admin (bawaan surat_sekolah),
//               --versi=N (bawaan: versi kebijakan yang berlaku).

const fs = require('fs');
const pool = require('../koneksi');
const repo = require('../../modul/persetujuan/persetujuan.repo');
const layanan = require('../../modul/persetujuan/persetujuan.layanan');
const { sekarangUntukDb } = require('../../util/waktu');

class GalatPakai extends Error {}

/** Perintahnya sah, tetapi belum dikonfirmasi (--ya). `rencana` = yang AKAN dicatat/dilewati. */
class PerluKonfirmasi extends GalatPakai {
  constructor(pesan, rencana) {
    super(pesan);
    this.rencana = rencana;
  }
}

const SUMBER = ['surat_sekolah', 'admin'];
const OPSI = ['status', 'pengguna', 'berkas', 'catatan', 'sumber', 'versi', 'cabut', 'ya'];

const SQL_KUNCI_PENGGUNA = 'SELECT id, nama_pengguna FROM pengguna WHERE nama_pengguna IN (?) FOR UPDATE';
const SQL_CARI_PENGGUNA = 'SELECT id, nama_pengguna FROM pengguna WHERE nama_pengguna IN (?)';

function bacaArgumen(argv) {
  const arg = {};
  for (const a of argv) {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a);
    if (!m || !OPSI.includes(m[1])) {
      throw new GalatPakai(`Argumen "${a}" tidak dikenal. Pilihan: ${OPSI.map((o) => '--' + o).join(', ')}.`);
    }
    arg[m[1]] = m[2] === undefined ? true : m[2];
  }
  return arg;
}

/** Nama pengguna dari --pengguna (dipisah koma) dan/atau --berkas (satu per baris). Huruf kecil, unik. */
function daftarNama(arg) {
  const nama = [];
  if (typeof arg.pengguna === 'string') nama.push(...arg.pengguna.split(','));
  if (typeof arg.berkas === 'string') {
    let isi;
    try {
      isi = fs.readFileSync(arg.berkas, 'utf8');
    } catch (galat) {
      throw new GalatPakai(`Berkas "${arg.berkas}" tidak bisa dibaca (${galat.code || galat.message}).`);
    }
    nama.push(...isi.split(/\r?\n/).filter((b) => !b.trim().startsWith('#')));
  }
  const hasil = [...new Set(nama.map((n) => n.trim().toLowerCase()).filter(Boolean))];
  if (!hasil.length) throw new GalatPakai('Isi --pengguna=nama1,nama2 atau --berkas=daftar.txt.');
  return hasil;
}

async function cariPengguna(eksekutor, sql, nama) {
  const [baris] = await eksekutor.query(sql, [nama]);
  const ada = new Map(baris.map((b) => [b.nama_pengguna, b.id]));
  const hilang = nama.filter((n) => !ada.has(n));
  if (hilang.length) {
    throw new GalatPakai(`Nama pengguna tidak ditemukan: ${hilang.join(', ')}. Tidak ada yang diubah.`);
  }
  return ada;
}

/** --status: hanya membaca. */
async function lihatStatus(nama) {
  const ada = await cariPengguna(pool, SQL_CARI_PENGGUNA, nama);
  const hasil = [];
  for (const n of nama) hasil.push({ nama: n, ...(await layanan.statusSaya(ada.get(n))) });
  return hasil;
}

/**
 * Catat (atau --cabut) persetujuan orang tua/wali. Semua nama diperiksa dulu
 * dalam satu transaksi; tanpa `konfirmasi: true` tidak ada yang ditulis dan
 * dilempar PerluKonfirmasi berisi rencana.
 */
async function ubahPersetujuan({ nama, cabut, catatan, sumber, versi, konfirmasi }) {
  const teksCatatan = typeof catatan === 'string' ? catatan.trim() : '';
  if (!teksCatatan) throw new GalatPakai('Isi --catatan dengan nomor/tanggal surat, mis. --catatan="Surat 012/SMKN4/X/2026, 3 Okt 2026".');
  if (teksCatatan.length > 500) throw new GalatPakai('--catatan terlalu panjang (maks. 500 karakter).');
  const sumberCatat = sumber ?? 'surat_sekolah';
  if (!SUMBER.includes(sumberCatat)) throw new GalatPakai(`--sumber harus salah satu dari: ${SUMBER.join(', ')}.`);

  const cfg = await layanan.ambilKonfigurasi();
  if (!cfg) throw new GalatPakai('Konfigurasi persetujuan belum lengkap. Jalankan npm run migrasi.');
  const versiSetuju = versi === undefined ? cfg.versiKebijakan : Number(versi);
  if (!Number.isInteger(versiSetuju) || versiSetuju < 1) throw new GalatPakai(`--versi harus bilangan bulat ≥ 1, dapat "${versi}".`);

  const koneksi = await pool.getConnection();
  try {
    await koneksi.beginTransaction();
    const ada = await cariPengguna(koneksi, SQL_KUNCI_PENGGUNA, nama);
    const rencana = [];
    for (const n of nama) {
      const id = ada.get(n);
      const { ortu_wali: o } = layanan.terakhirPerJenis(await repo.catatanAkun(id, koneksi));
      if (cabut) {
        rencana.push(
          o && o.status === 'setuju'
            ? { nama: n, id, aksi: 'cabut', versi: o.versi }
            : { nama: n, id, aksi: null, alasan: 'tidak ada persetujuan aktif untuk dicabut' }
        );
      } else {
        rencana.push(
          o && o.status === 'setuju' && o.versi === versiSetuju
            ? { nama: n, id, aksi: null, alasan: `sudah setuju v${versiSetuju}` }
            : {
                nama: n,
                id,
                aksi: 'setuju',
                versi: versiSetuju,
                peringatan: versiSetuju < cfg.versiMinOrtu ? `di bawah versi minimum ${cfg.versiMinOrtu}, fitur AI tetap tertutup` : null,
              }
        );
      }
    }
    if (konfirmasi !== true) {
      throw new PerluKonfirmasi(
        'Belum ada yang dicatat. Periksa daftar di atas, lalu ulangi perintah yang sama dengan --ya.',
        rencana
      );
    }
    const waktu = sekarangUntukDb();
    for (const r of rencana) {
      if (!r.aksi) continue;
      await repo.tambah(
        { penggunaId: r.id, jenis: 'ortu_wali', versi: r.versi, status: r.aksi, sumber: sumberCatat, catatan: teksCatatan, dicatatPada: waktu },
        koneksi
      );
    }
    await koneksi.commit();
    return rencana;
  } catch (galat) {
    await koneksi.rollback();
    throw galat;
  } finally {
    koneksi.release();
  }
}

const teksAksi = (r) =>
  r.aksi === 'cabut'
    ? `DICABUT (persetujuan v${r.versi})`
    : r.aksi === 'setuju'
      ? `SETUJU v${r.versi}${r.peringatan ? ` — ${r.peringatan}` : ''}`
      : `dilewati: ${r.alasan}`;

async function jalankan(argv) {
  const arg = bacaArgumen(argv);
  const nama = daftarNama(arg);

  if (arg.status) {
    const hasil = await lihatStatus(nama);
    for (const h of hasil) {
      const o = h.ortu_wali ? `${h.ortu_wali.status} v${h.ortu_wali.versi} (${h.ortu_wali.sumber}, ${h.ortu_wali.dicatat_pada.slice(0, 10)})` : 'belum ada';
      const k = h.kebijakan_privasi ? `${h.kebijakan_privasi.status} v${h.kebijakan_privasi.versi}` : 'belum ada';
      console.log(`[status] ${h.nama.padEnd(24)} ortu/wali: ${o} · kebijakan: ${k} · boleh AI: ${h.boleh_pakai_ai ? 'ya' : 'tidak'}`);
    }
    return hasil;
  }

  const perintah = { nama, cabut: arg.cabut === true, catatan: arg.catatan, sumber: arg.sumber, versi: arg.versi, konfirmasi: arg.ya === true };
  let rencana;
  try {
    rencana = await ubahPersetujuan(perintah);
  } catch (galat) {
    if (galat instanceof PerluKonfirmasi) {
      for (const r of galat.rencana) console.log(`[pratinjau] ${r.nama} → ${r.aksi ? 'akan ' : ''}${teksAksi(r)}`);
    }
    throw galat;
  }
  for (const r of rencana) console.log(`[persetujuan] ${r.nama} → ${teksAksi(r)}`);
  return rencana;
}

if (require.main === module) {
  jalankan(process.argv.slice(2))
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(async (galat) => {
      console.error(galat instanceof GalatPakai ? `[persetujuan] ${galat.message}` : `[persetujuan] GAGAL: ${galat.message}`);
      await pool.end().catch(() => {});
      process.exit(1);
    });
}

module.exports = { ubahPersetujuan, lihatStatus, jalankan, GalatPakai, PerluKonfirmasi };
