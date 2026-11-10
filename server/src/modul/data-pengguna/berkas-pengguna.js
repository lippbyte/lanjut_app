// Satu pintu untuk menghapus berkas milik satu akun di disk (LANJUT_009 seri v2).
//
// Saat ini daftar penyedianya kosong: Unggah modul tidak pernah menyimpan berkas (multer
// memoryStorage, hanya teksnya masuk basis data), jadi belum ada berkas pengguna di disk.
// Bagian 3 cukup memanggil daftarkanPenyediaBerkas untuk foto, tanpa mengubah rute hapus akun.
//
// Fungsi ini dipanggil SESUDAH transaksi basis data berhasil, jadi penyedia tidak bisa lagi
// membaca baris lampiran. Karena itu berkas harus bisa ditemukan dari penggunaId saja,
// misalnya disimpan di <folder foto>/<penggunaId>/<nama_tersimpan>.
//
// Kegagalan satu penyedia dicatat dan tidak menghentikan penyedia lain atau membatalkan
// penghapusan akun. Jejaknya bisa dicari di log server dengan kata kunci [hapus-berkas-gagal].

const penyedia = [];

/** `hapus(penggunaId)` menghapus semua berkas akun itu. Mengembalikan fungsi pelepas. */
function daftarkanPenyediaBerkas({ nama, hapus }) {
  const entri = { nama, hapus };
  penyedia.push(entri);
  return () => {
    const i = penyedia.indexOf(entri);
    if (i >= 0) penyedia.splice(i, 1);
  };
}

async function hapusBerkasPengguna(penggunaId) {
  const hasil = { berhasil: [], gagal: [] };
  for (const p of [...penyedia]) {
    try {
      await p.hapus(penggunaId);
      hasil.berhasil.push(p.nama);
    } catch (galat) {
      hasil.gagal.push(p.nama);
      console.error(`[hapus-berkas-gagal] pengguna=${penggunaId} penyedia=${p.nama} galat=${galat.message}`);
    }
  }
  return hasil;
}

module.exports = { daftarkanPenyediaBerkas, hapusBerkasPengguna };
