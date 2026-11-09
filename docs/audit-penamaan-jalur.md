# Audit Penamaan "jalur"

**Task:** LANJUT_001 seri v2 (Bagian 0).
**Dasar audit:** commit `4eeb742`, sebelum perubahan apa pun. Nomor baris merujuk ke commit itu.
**Repo:** audit dibuat di repo induk (`lippbyte/lanjut-app`). Repo ini (`lippbyte/lanjut_app`) adalah folder `LANJUT_App` dari repo induk, jadi buang awalan `LANJUT_App/` untuk mencari lokasinya di sini. Folder `MVP-PWA`, `landing`, dan `diagrams` hanya ada di repo induk. Satu temuan hanya ada di repo ini: `docs/test-results/backend-domain-2026-11-01.md:17`, catatan hasil uji lama, tidak diubah.
**Cara:** `git grep -n -i jalur` pada seluruh berkas yang dilacak git (tidak peka huruf besar-kecil), lalu tiap baris kode dibaca dan digolongkan. Berkas yang tidak dilacak git (`task/`, `LANJUT_App/docs/`) tidak masuk hitungan.

## Ringkasan

| Golongan | Baris | Artinya | Tindakan |
|---|---|---|---|
| A. Pengenal jalur masuk PTN | 141 | Nama kolom, field, parameter, atau variabel berisi SNBP/SNBT/TKA/Mandiri | Diganti ke `jalur_seleksi` |
| B. Migrasi lama | 6 | Definisi awal kolom | Tidak disunting (aturan agen §3.3); kolomnya diganti lewat migrasi 029 |
| C. Kunci berkas konten dan pembacanya | 222 | Kunci di `MVP-PWA/data`, `server/data-konten`, PWA arsip | Sengaja dipertahankan, diterjemahkan saat benih |
| D. Teks tampilan untuk siswa | 13 | Kata "jalur" berarti SNBP/SNBT di layar | Tidak diubah, perlu persetujuan |
| E. Bukan jalur masuk PTN | 372 | Fitur "Jalur Saya", alamat URL, alur kode, topik chatbot, teks konten | Tidak diubah |
| F. Situs landing | 197 | Hampir semua berarti alamat halaman; sisanya teks pemasaran | Tidak diubah |
| G. Dokumen dan mockup | 605 | Catatan sejarah, spesifikasi lama, mockup | Tidak diubah |
| **Total** | **1556** | | |

## Keputusan pendekatan

1. **Kolom database.** Empat kolom diganti nama lewat `029_ganti_nama_jalur_seleksi.sql`: `tahapan_linimasa.jalur`, `cerita_alumni.jalur`, `butir_daftar_periksa.berlaku_untuk_jalur`, `profil_prodi.peminat_jalur`. Dipakai `CHANGE COLUMN` supaya jalan di MySQL dan MariaDB.
2. **Kolom JSON `profil_prodi.kampus`.** Kunci `jalur_masuk` di dalam isi kolom ikut diganti oleh migrasi. Tanpa ini, benih berikutnya melihat isi "berubah" dan menghapus tanda verifikasi profil.
3. **Berkas JSON konten tidak diubah.** `MVP-PWA/data` dibaca langsung oleh PWA arsip, dan `server/data-konten` adalah salinannya. Mengganti kunci berarti ikut menyunting kode PWA, dan salinan berikutnya akan membawa kunci lama kembali. Benih menjadi satu-satunya tempat kunci lama diterjemahkan.
4. **Pilihan yang tersimpan di HP.** `useProfilLokal` menyimpan `{ kelas, jalur }` di perangkat. Kunci lama tetap dibaca, supaya pilihan siswa tidak hilang setelah pembaruan.
5. **API memakai nama baru, nama lama tetap dilayani.** `docs/rilis/lanjut-1.0.0.md` mencatat APK 1.0.0 untuk sekolah, dan APK itu memakai nama lama. Server mengirim nama baru dan nama lama sekaligus, serta menerima `?jalur_seleksi=` dan `?jalur=`. Semuanya ada di `server/src/modul/konten/konten.rute.js` dan boleh dihapus setelah tidak ada lagi pengguna APK 1.0.0.
6. **Topik chatbot `jalur_masuk` dipertahankan.** Isinya pertanyaan soal kuota, UKT, dan pendaftaran, termasuk penerimaan SMA/SMK, bukan pilihan SNBP/SNBT. Namanya sudah tidak ambigu, dan menyentuhnya berarti menyentuh jalur keputusan AI tanpa manfaat.
7. **Nilai `TKA`.** TKA bukan jalur masuk, tetapi berada di kolom yang sama dengan SNBP/SNBT. Nilainya tidak diubah.

## A. Pengenal jalur masuk PTN (diganti)

Semua aman diubah: terlindungi tes atau pemeriksa tipe. Untuk APK yang sudah terpasang, lihat keputusan 5.

| Lokasi | Isi baris |
|---|---|
| `LANJUT_App/api/types.ts:34` | `jalur: 'TKA' \| 'SNBP' \| 'SNBT';` |
| `LANJUT_App/api/types.ts:70` | `export type KampusProfil = { nama: string; jenis: string; jalur_masuk: string[] };` |
| `LANJUT_App/api/types.ts:77` | `peminat: { jumlah: number; kampus: string \| null; tahun: number \| null; jalur: string \| null; sumber: string \| null ` |
| `LANJUT_App/api/types.ts:128` | `jalur: string;` |
| `LANJUT_App/api/types.ts:141` | `berlaku_untuk_jalur: string[];` |
| `LANJUT_App/components/screens/AkunScreen.tsx:244` | `const { kelas, jalur, isPending: saringMemuat } = saring;` |
| `LANJUT_App/components/screens/AkunScreen.tsx:264` | `Kelas {kelas} · {jalur}` |
| `LANJUT_App/components/screens/CeritaAlumniScreen.tsx:60` | `<Lencana>Jalur {cerita.jalur}</Lencana>` |
| `LANJUT_App/components/screens/DaftarPeriksaScreen.tsx:21` | `const JALUR_OPSI = ['TKA', 'SNBP', 'SNBT'] as const;` |
| `LANJUT_App/components/screens/DaftarPeriksaScreen.tsx:30` | `*  - Butir disaring kelas & jalur (AC F5 di PRD, belum ada di PWA). Kelas` |
| `LANJUT_App/components/screens/DaftarPeriksaScreen.tsx:31` | `*    diisi dari akun kalau ada; jalur disimpan di perangkat karena akun` |
| `LANJUT_App/components/screens/DaftarPeriksaScreen.tsx:32` | `*    belum punya medan jalur. Rumpun target prodi ikut dikirim, jadi butir` |
| `LANJUT_App/components/screens/DaftarPeriksaScreen.tsx:37` | `* ini tidak disaring kelas/jalur, jadi tetap tampil sebelum keduanya dipilih.` |
| `LANJUT_App/components/screens/DaftarPeriksaScreen.tsx:67` | `const { kelas, jalur, pilih, isPending } = saring;` |
| `LANJUT_App/components/screens/DaftarPeriksaScreen.tsx:75` | `<BarisKeping label="Jalur" opsi={JALUR_OPSI} tampil={(j) => j} aktif={jalur} onPilih={(j) => pilih({ jalur: j })} />` |
| `LANJUT_App/components/screens/DaftarPeriksaScreen.tsx:80` | `) : kelas && jalur ? (` |
| `LANJUT_App/components/screens/DaftarPeriksaScreen.tsx:107` | `// Kelas/jalur belum dipilih: butir pribadi tetap tampil (tanpa bilah kemajuan,` |
| `LANJUT_App/components/screens/EksplorasiKampusScreen.tsx:10` | `JALUR_MASUK,` |
| `LANJUT_App/components/screens/EksplorasiKampusScreen.tsx:62` | `jalur: (` |
| `LANJUT_App/components/screens/EksplorasiKampusScreen.tsx:64` | `<KepalaSeksi judul={TEKS_EKSPLORASI.kelas10_11.judulJalur} />` |
| `LANJUT_App/components/screens/EksplorasiKampusScreen.tsx:65` | `{JALUR_MASUK.map((j) => (` |
| `LANJUT_App/components/screens/EksplorasiTujuanScreen.tsx:124` | `? ['Sumber:', p.peminat.sumber, p.peminat.jalur, p.peminat.tahun].filter(Boolean).join(' ') +` |
| `LANJUT_App/components/screens/EksplorasiTujuanScreen.tsx:192` | `{k.jalur_masuk.map((j) => (` |
| `LANJUT_App/hooks/useButirDaftarPeriksa.ts:8` | `jalur?: string;` |
| `LANJUT_App/hooks/useButirDaftarPeriksa.ts:14` | `* F5 — GET /konten/checklist?kelas=&jalur= (konten.rute.js baris 91),` |
| `LANJUT_App/hooks/useButirDaftarPeriksa.ts:19` | `* 'kelas'/'jalur' masuk queryKey supaya React Query menyimpan cache` |
| `LANJUT_App/hooks/useButirDaftarPeriksa.ts:24` | `queryKey: ['butir_daftar_periksa', filter.kelas, filter.jalur, filter.rumpun],` |
| `LANJUT_App/hooks/useButirDaftarPeriksa.ts:27` | `query: { kelas: filter.kelas, jalur: filter.jalur, rumpun: filter.rumpun },` |
| `LANJUT_App/hooks/useProfilLokal.ts:8` | `export type ProfilLokal = { kelas: string \| null; jalur: string \| null };` |
| `LANJUT_App/hooks/useProfilLokal.ts:10` | `const PROFIL_KOSONG: ProfilLokal = { kelas: null, jalur: null };` |
| `LANJUT_App/hooks/useProfilLokal.ts:25` | `// F5 — kelas & jalur untuk menyaring Daftar Periksa. Disimpan di perangkat` |
| `LANJUT_App/hooks/useProfilLokal.ts:26` | `// karena akun belum punya medan jalur; kelas dari akun dipakai sebagai awalan.` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:11` | `jalur: string \| null;` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:18` | `* Kelas, jalur, dan rumpun yang menyaring Daftar Periksa. Kelas pilihan di` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:19` | `* perangkat mengalahkan kelas akun; jalur hanya ada di perangkat; rumpun` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:31` | `const jalur = profilQuery.data?.jalur ?? null;` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:32` | `const pilih = (ubah: { kelas?: string \| null; jalur?: string \| null }) => simpanProfil({ kelas, jalur, ...ubah });` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:42` | `return { kelas, jalur, rumpun, pilih, isPending: profilQuery.isPending \|\| rumpunMemuat };` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:48` | `* (/cek-posisi) menghitung X/Y yang sama. Tanpa kelas/jalur, atau selama saringan masih` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:52` | `export function useProgresDaftarPeriksa({ kelas, jalur, rumpun, isPending: saringMemuat }: SaringanDaftarPeriksa) {` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:53` | `const siap = !!kelas && !!jalur && !saringMemuat;` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:55` | `{ kelas: kelas ?? undefined, jalur: jalur ?? undefined, rumpun: rumpun ?? undefined },` |
| `LANJUT_App/lib/cekPosisi.ts:22` | `/** Progres Daftar Periksa; null kalau kelas/jalur belum dipilih. */` |
| `LANJUT_App/lib/daftarPeriksa.ts:20` | `* kombinasi kelas/jalur apa pun, termasuk saat berkasnya berubah.` |
| `LANJUT_App/lib/daftarPeriksa.ts:61` | `* jalur, atau rumpun: siswa sendiri yang menyimpannya. Masukan tidak diubah.` |
| `LANJUT_App/lib/daftarPeriksa.ts:71` | `berlaku_untuk_jalur: [],` |
| `LANJUT_App/lib/eksplorasiKampus.ts:39` | `export type BagianEksplorasi = 'pengantar' \| 'jalur' \| 'bidang' \| 'simpan' \| 'prodi_nanti' \| 'penutup';` |
| `LANJUT_App/lib/eksplorasiKampus.ts:42` | `* Bagian yang dirender per versi, urut dari atas. SMP TIDAK punya 'jalur'` |
| `LANJUT_App/lib/eksplorasiKampus.ts:48` | `kelas10_11: ['pengantar', 'jalur', 'bidang', 'simpan', 'prodi_nanti'],` |
| `LANJUT_App/lib/eksplorasiKampus.ts:108` | `export const JALUR_MASUK: readonly { nama: string; penjelasan: string }[] = [` |
| `LANJUT_App/lib/eksplorasiKampus.ts:131` | `judulJalur: 'Jalur masuk perguruan tinggi',` |
| `LANJUT_App/lib/kesiapanUjian.ts:48` | `* Ringkasan kategori Persiapan Ujian dari butir yang tampil (sudah tersaring kelas & jalur).` |
| `LANJUT_App/lib/kesiapanUjian.ts:49` | `* 'tryout'/'simulasi' null = jalur ini tidak punya butirnya (mis. SNBP), bukan "belum".` |
| `LANJUT_App/server/README.md:1213` | `curl -s http://localhost:3000/api/v1/konten/checklist?kelas=12&jalur=SNBP` |
| `LANJUT_App/server/README.md:1214` | `curl -s "http://localhost:3000/api/v1/konten/checklist?kelas=12&jalur=SNBP&rumpun=Teknologi%20%26%20Rekayasa"` |
| `LANJUT_App/server/README.md:1224` | `- **Beda dari 'kelas'/'jalur':** tanpa 'rumpun', butir khusus rumpun **tidak**` |
| `LANJUT_App/server/src/db/benih/benih.js:116` | `(id, judul, tanggal_mulai, tanggal_selesai, jalur,` |
| `LANJUT_App/server/src/db/benih/benih.js:121` | `jalur <=> VALUES(jalur) AND sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND` |
| `LANJUT_App/server/src/db/benih/benih.js:125` | `jalur <=> VALUES(jalur) AND sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND` |
| `LANJUT_App/server/src/db/benih/benih.js:129` | `tanggal_selesai=VALUES(tanggal_selesai), jalur=VALUES(jalur),` |
| `LANJUT_App/server/src/db/benih/benih.js:273` | `(id, nama, asal_smk, jurusan_smk, ptn, prodi, jalur, hambatan, yang_dilakukan,` |
| `LANJUT_App/server/src/db/benih/benih.js:278` | `ptn <=> VALUES(ptn) AND prodi <=> VALUES(prodi) AND jalur <=> VALUES(jalur) AND` |
| `LANJUT_App/server/src/db/benih/benih.js:284` | `ptn <=> VALUES(ptn) AND prodi <=> VALUES(prodi) AND jalur <=> VALUES(jalur) AND` |
| `LANJUT_App/server/src/db/benih/benih.js:290` | `ptn=VALUES(ptn), prodi=VALUES(prodi), jalur=VALUES(jalur), hambatan=VALUES(hambatan),` |
| `LANJUT_App/server/src/db/benih/benih.js:367` | `(id, judul, urutan, berlaku_untuk_kelas, berlaku_untuk_jalur, berlaku_untuk_rumpun,` |
| `LANJUT_App/server/src/db/benih/benih.js:372` | `berlaku_untuk_jalur <=> VALUES(berlaku_untuk_jalur) AND berlaku_untuk_rumpun <=> VALUES(berlaku_untuk_rumpun) AND katego` |
| `LANJUT_App/server/src/db/benih/benih.js:377` | `berlaku_untuk_jalur <=> VALUES(berlaku_untuk_jalur) AND berlaku_untuk_rumpun <=> VALUES(berlaku_untuk_rumpun) AND katego` |
| `LANJUT_App/server/src/db/benih/benih.js:383` | `berlaku_untuk_jalur=VALUES(berlaku_untuk_jalur),` |
| `LANJUT_App/server/src/db/benih/benih.js:516` | `peminat_jalur <=> VALUES(peminat_jalur) AND peminat_sumber <=> VALUES(peminat_sumber) AND` |
| `LANJUT_App/server/src/db/benih/benih.js:526` | `peminat_jalur, peminat_sumber, diterima, mata_kuliah, profesi, kampus, status_sumber, catatan_studi,` |
| `LANJUT_App/server/src/db/benih/benih.js:535` | `peminat_jalur=VALUES(peminat_jalur), peminat_sumber=VALUES(peminat_sumber),` |
| `LANJUT_App/server/src/db/verifikasi/lembar-review.js:36` | `pp.peminat_jumlah, pp.peminat_kampus, pp.peminat_tahun, pp.peminat_jalur, pp.peminat_sumber,` |
| `LANJUT_App/server/src/db/verifikasi/lembar-review.js:69` | `checklist: 'SELECT b.id, b.judul, k.nama AS kategori, b.berlaku_untuk_kelas, b.berlaku_untuk_jalur, b.berlaku_untuk_rump` |
| `LANJUT_App/server/src/db/verifikasi/lembar-review.js:74` | `linimasa: 'SELECT id, judul, jalur, DATE_FORMAT(tanggal_mulai, '%Y-%m-%d') AS mulai,` |
| `LANJUT_App/server/src/db/verifikasi/lembar-review.js:79` | `cerita: 'SELECT id, nama, asal_smk, jurusan_smk, ptn, prodi, jalur, hambatan, yang_dilakukan, izin_tayang, tayang,` |
| `LANJUT_App/server/src/db/verifikasi/lembar-review.js:196` | `['Sumber:', p.peminat_sumber, p.peminat_jalur, p.peminat_tahun].filter(Boolean).join(' ') +` |
| `LANJUT_App/server/src/db/verifikasi/lembar-review.js:198` | `const kampus = (json(p.kampus) \|\| []).map((k) => '${aman(k.nama)} (${aman(k.jenis)}; jalur ${(k.jalur_masuk \|\| []).m` |
| `LANJUT_App/server/src/db/verifikasi/lembar-review.js:354` | `'**Berlaku untuk:** kelas ${aman(b.berlaku_untuk_kelas)} · jalur ${aman(b.berlaku_untuk_jalur)} · rumpun ${` |
| `LANJUT_App/server/src/db/verifikasi/lembar-review.js:381` | `'**Judul:** ${aman(t.judul)} · **Jalur:** ${aman(t.jalur)}',` |
| `LANJUT_App/server/src/db/verifikasi/lembar-review.js:407` | `'**Kampus & prodi:** ${aman(c.ptn)}, ${aman(c.prodi)} · **Jalur:** ${aman(c.jalur)}',` |
| `LANJUT_App/server/src/modul/konten/konten.repo.js:10` | `'SELECT id, judul, tanggal_mulai, tanggal_selesai, jalur,` |
| `LANJUT_App/server/src/modul/konten/konten.repo.js:121` | `'SELECT id, nama, asal_smk, jurusan_smk, ptn, prodi, jalur, hambatan, yang_dilakukan,` |
| `LANJUT_App/server/src/modul/konten/konten.repo.js:131` | `* F5 — checklist, dikelompokkan per kategori, dapat disaring ?kelas=&jalur=&rumpun=.` |
| `LANJUT_App/server/src/modul/konten/konten.repo.js:135` | `* Rumpun (LANJUT_007) beda dari kelas/jalur: butir umum (rumpun NULL) selalu` |
| `LANJUT_App/server/src/modul/konten/konten.repo.js:140` | `async function ambilChecklist({ kelas, jalur, rumpun }) {` |
| `LANJUT_App/server/src/modul/konten/konten.repo.js:142` | `'SELECT b.id, b.judul, b.urutan, b.berlaku_untuk_kelas, b.berlaku_untuk_jalur,` |
| `LANJUT_App/server/src/modul/konten/konten.repo.js:149` | `AND (? IS NULL OR FIND_IN_SET(?, b.berlaku_untuk_jalur) > 0)` |
| `LANJUT_App/server/src/modul/konten/konten.repo.js:152` | `[kelas \|\| null, kelas \|\| null, jalur \|\| null, jalur \|\| null, rumpun \|\| null]` |
| `LANJUT_App/server/src/modul/konten/konten.repo.js:167` | `pp.peminat_jumlah, pp.peminat_kampus, pp.peminat_tahun, pp.peminat_jalur, pp.peminat_sumber,` |
| `LANJUT_App/server/src/modul/konten/konten.rute.js:140` | `jalur: b.peminat_jalur,` |
| `LANJUT_App/server/src/modul/konten/konten.rute.js:183` | `jalur: req.query.jalur,` |
| `LANJUT_App/server/src/modul/konten/konten.rute.js:204` | `berlaku_untuk_jalur: b.berlaku_untuk_jalur.split(','),` |
| `LANJUT_App/server/tests/beranda-grid-mulai.test.js:249` | `const butirResp = await panggil('GET', '/konten/checklist?kelas=12&jalur=SNBP');` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:231` | `assert.ok(!b.includes('jalur') && !b.includes('prodi_nanti'));` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:240` | `assert.deepEqual([...eks.BAGIAN_EKSPLORASI.kelas10_11], ['pengantar', 'jalur', 'bidang', 'simpan', 'prodi_nanti']);` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:241` | `assert.deepEqual(eks.JALUR_MASUK.map((j) => j.nama), ['SNBP', 'SNBT', 'Seleksi mandiri']);` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:250` | `...eks.JALUR_MASUK.map((j) => j.penjelasan),` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:349` | `eks.TEKS_EKSPLORASI.kelas10_11.judulJalur,` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:352` | `...eks.JALUR_MASUK.map((j) => j.penjelasan),` |
| `LANJUT_App/server/tests/info-penting-tanggal.test.js:27` | `jalur: 'TKA',` |
| `LANJUT_App/server/tests/info-penting-terverifikasi.test.js:57` | `jalur: 'TKA',` |
| `LANJUT_App/server/tests/info-penting-terverifikasi.test.js:67` | `jalur: 'TKA',` |
| `LANJUT_App/server/tests/info-penting-terverifikasi.test.js:77` | `jalur: 'TKA',` |
| `LANJUT_App/server/tests/info-penting-terverifikasi.test.js:87` | `jalur: 'SNBP',` |
| `LANJUT_App/server/tests/info-penting-terverifikasi.test.js:97` | `jalur: 'SNBT',` |
| `LANJUT_App/server/tests/info-penting-terverifikasi.test.js:107` | `jalur: 'SNBT',` |
| `LANJUT_App/server/tests/info-penting-terverifikasi.test.js:238` | `(id, judul, tanggal_mulai, tanggal_selesai, jalur, pemilik,` |
| `LANJUT_App/server/tests/konten-cerita-alumni.test.js:18` | `'id', 'nama', 'asal_smk', 'jurusan_smk', 'ptn', 'prodi', 'jalur', 'hambatan', 'yang_dilakukan',` |
| `LANJUT_App/server/tests/konten-cerita-alumni.test.js:50` | `(id, nama, asal_smk, jurusan_smk, ptn, prodi, jalur, hambatan, yang_dilakukan,` |
| `LANJUT_App/server/tests/konten-cerita-alumni.test.js:97` | `assert.equal(c.jalur, 'SNBP');` |
| `LANJUT_App/server/tests/konten-checklist-rumpun.test.js:18` | `{ id: 'uji-rumpun-tek', rumpun: TEK, kelas: '12', jalur: 'SNBP,SNBT' },` |
| `LANJUT_App/server/tests/konten-checklist-rumpun.test.js:19` | `{ id: 'uji-rumpun-tek-kes', rumpun: '${TEK},${KES}', kelas: '11,12', jalur: 'SNBP,SNBT' },` |
| `LANJUT_App/server/tests/konten-checklist-rumpun.test.js:20` | `{ id: 'uji-rumpun-eko', rumpun: 'Ekonomi & Bisnis', kelas: '12', jalur: 'SNBP,SNBT' },` |
| `LANJUT_App/server/tests/konten-checklist-rumpun.test.js:24` | `const KUERI_LAMA = ['', '?kelas=12', '?kelas=12&jalur=SNBP', '?kelas=11&jalur=TKA', '?jalur=SNBT'];` |
| `LANJUT_App/server/tests/konten-checklist-rumpun.test.js:54` | `(id, judul, urutan, berlaku_untuk_kelas, berlaku_untuk_jalur, berlaku_untuk_rumpun,` |
| `LANJUT_App/server/tests/konten-checklist-rumpun.test.js:57` | `[f.id, 'Butir uji ${f.id}', 90 + i, f.kelas, f.jalur, f.rumpun]` |
| `LANJUT_App/server/tests/konten-checklist-rumpun.test.js:109` | `const tka = idButir(await ambil('/konten/checklist?jalur=TKA&rumpun=${r}'));` |
| `LANJUT_App/server/tests/konten-eksplorasi-tujuan.test.js:35` | `{ nama: 'Politeknik Uji', jenis: 'PTN Vokasi', jalur_masuk: ['SNBT'] },` |
| `LANJUT_App/server/tests/konten-eksplorasi-tujuan.test.js:36` | `{ nama: 'Universitas Uji', jenis: 'PTN Akademik', jalur_masuk: ['SNBP', 'SNBT'] },` |
| `LANJUT_App/server/tests/konten-eksplorasi-tujuan.test.js:85` | `peminat_jalur, peminat_sumber, diterima, mata_kuliah, profesi, kampus, status_sumber,` |
| `LANJUT_App/server/tests/konten-eksplorasi-tujuan.test.js:127` | `peminat: { jumlah: 5582, kampus: 'Universitas Uji', tahun: 2026, jalur: 'SNBT', sumber: 'SNPMB' },` |
| `LANJUT_App/server/tests/konten-linimasa.test.js:20` | `'id', 'judul', 'tanggal_mulai', 'tanggal_selesai', 'jalur',` |
| `LANJUT_App/server/tests/konten-linimasa.test.js:27` | `tanggal_selesai: '2099-03-09', jalur: 'SNBT', status_verifikasi: 'terverifikasi',` |
| `LANJUT_App/server/tests/konten-linimasa.test.js:32` | `tanggal_selesai: null, jalur: 'SNBP', status_verifikasi: 'belum_diverifikasi',` |
| `LANJUT_App/server/tests/konten-linimasa.test.js:57` | `(id, judul, tanggal_mulai, tanggal_selesai, jalur, pemilik,` |
| `LANJUT_App/server/tests/konten-linimasa.test.js:60` | `[f.id, f.judul, f.tanggal_mulai, f.tanggal_selesai, f.jalur,` |
| `LANJUT_App/server/tests/konten-linimasa.test.js:101` | `jalur: t.jalur, status_verifikasi: t.status_verifikasi, asal: t.asal,` |
| `LANJUT_App/server/tests/konten-linimasa.test.js:106` | `jalur: f.jalur, status_verifikasi: f.status_verifikasi, asal: f.asal,` |
| `LANJUT_App/server/tests/konten-linimasa.test.js:114` | `const { status, json } = await ambil('/konten/linimasa?jalur=TKA&status=terverifikasi&x[]=1');` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:129` | `assert.deepEqual(await ujianDi('?kelas=12&jalur=TKA'), ['tryout-tka', 'simulasi-tka', 'levelin-mapel-tka']);` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:130` | `assert.deepEqual(await ujianDi('?kelas=12&jalur=SNBT'), ['tryout-snbt']);` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:131` | `assert.deepEqual(await ujianDi('?kelas=12&jalur=SNBP'), []);` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:135` | `assert.deepEqual(await ujianDi('?kelas=11&jalur=TKA'), ['levelin-mapel-tka']);` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:136` | `const r = await panggil('GET', '/konten/checklist?kelas=12&jalur=SNBP');` |
| `LANJUT_App/server/tests/progres-beranda.test.js:84` | `const checklist = await panggil('GET', '/konten/checklist?kelas=12&jalur=SNBP');` |
| `LANJUT_App/server/tools/lembar-review-teks.js:861` | `].map(([awal, jalur, klaim]) => ({` |
| `LANJUT_App/server/tools/lembar-review-teks.js:864` | `nama: 'Penjelasan jalur ${jalur}',` |
| `diagrams/class.mmd:22` | `+String jalur` |
| `diagrams/class.mmd:61` | `+String jalur_masuk` |
| `diagrams/erd-b.mmd:24` | `string jalur` |
| `diagrams/erd-b.mmd:45` | `string jalur_masuk` |

## B. Migrasi lama (tidak disunting)

| Lokasi | Isi baris |
|---|---|
| `LANJUT_App/server/src/db/migrasi/002_konten_p0.sql:29` | `jalur ENUM('TKA', 'SNBP', 'SNBT') NOT NULL,` |
| `LANJUT_App/server/src/db/migrasi/002_konten_p0.sql:100` | `jalur VARCHAR(30) NOT NULL,` |
| `LANJUT_App/server/src/db/migrasi/002_konten_p0.sql:120` | `berlaku_untuk_jalur VARCHAR(30) NOT NULL,` |
| `LANJUT_App/server/src/db/migrasi/006_checklist_rumpun.sql:6` | `-- Isinya daftar dipisah koma seperti berlaku_untuk_kelas/_jalur, dengan` |
| `LANJUT_App/server/src/db/migrasi/006_checklist_rumpun.sql:11` | `ADD COLUMN berlaku_untuk_rumpun VARCHAR(255) NULL AFTER berlaku_untuk_jalur;` |
| `LANJUT_App/server/src/db/migrasi/008_profil_prodi.sql:30` | `peminat_jalur VARCHAR(10) NULL,` |

## C. Kunci berkas konten dan pembacanya (sengaja dipertahankan)

Berkas JSON konten, jumlah kunci per berkas:

| Berkas dan kunci | Jumlah |
|---|---|
| `LANJUT_App/server/data-konten/cerita-alumni.json — jalur` | 2 |
| `LANJUT_App/server/data-konten/checklist.json — berlaku_untuk_jalur` | 15 |
| `LANJUT_App/server/data-konten/linimasa.json — jalur` | 6 |
| `LANJUT_App/server/data-konten/profil-prodi.json — jalur` | 18 |
| `LANJUT_App/server/data-konten/profil-prodi.json — jalur_masuk` | 58 |
| `MVP-PWA/data/cerita-alumni.json — jalur` | 2 |
| `MVP-PWA/data/checklist.json — berlaku_untuk_jalur` | 15 |
| `MVP-PWA/data/linimasa.json — jalur` | 6 |
| `MVP-PWA/data/profil-prodi.json — jalur` | 18 |
| `MVP-PWA/data/profil-prodi.json — jalur_masuk` | 58 |

Kode yang membaca kunci itu:

| Lokasi | Isi baris |
|---|---|
| `LANJUT_App/server/README.md:1239` | `"berlaku_untuk_kelas": ["12"], "berlaku_untuk_jalur": ["SNBP", "SNBT"],` |
| `LANJUT_App/server/src/db/benih/benih.js:137` | `item.jalur,` |
| `LANJUT_App/server/src/db/benih/benih.js:301` | `item.jalur,` |
| `LANJUT_App/server/src/db/benih/benih.js:392` | `butir.berlaku_untuk_jalur.join(','),` |
| `LANJUT_App/server/src/db/benih/benih.js:548` | `pm.jalur ?? null,` |
| `LANJUT_App/server/tests/benih-verifikasi.test.js:58` | `jalur: 'TKA',` |
| `LANJUT_App/server/tests/benih-verifikasi.test.js:81` | `berlaku_untuk_jalur: ['SNBP'],` |
| `LANJUT_App/server/tests/contoh/checklist-contoh-rumpun.json:17` | `"berlaku_untuk_jalur": ["SNBP", "SNBT"],` |
| `LANJUT_App/server/tests/contoh/checklist-contoh-rumpun.json:25` | `"berlaku_untuk_jalur": ["SNBP", "SNBT"],` |
| `LANJUT_App/server/tests/konten-eksplorasi-tujuan.test.js:245` | `peminat: { jumlah: 1200, kampus: 'Universitas Uji', tahun: 2026, jalur: 'SNBP', sumber: 'SNPMB' },` |
| `LANJUT_App/server/tests/konten-eksplorasi-tujuan.test.js:249` | `kampus: [{ nama: 'Universitas Uji', jenis: 'PTN Akademik', jalur_masuk: ['SNBP'] }],` |
| `LANJUT_App/server/tests/konten-eksplorasi-tujuan.test.js:328` | `(i) => ({ ...i, kampus: [{ ...i.kampus[0], jalur_masuk: ['SNBP', 'SNBT'] }] }),` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:92` | `KATEGORI.butir.map((b) => [b.id, b.berlaku_untuk_kelas.join(','), b.berlaku_untuk_jalur.join(',')]),` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:140` | `.filter((b) => b.berlaku_untuk_kelas.includes('12') && b.berlaku_untuk_jalur.includes('SNBP'))` |
| `MVP-PWA/alumni.html:83` | `<p><span class="lencana">Jalur <span data-isi="jalur">SNBP</span></span></p>` |
| `MVP-PWA/assets/app.js:273` | `jalur: t.jalur,` |
| `MVP-PWA/assets/app.js:1005` | `/* Baris sumber, SATU slot berisi kalimat utuh: "Sumber: SNPMB <jalur>` |
| `MVP-PWA/assets/app.js:1010` | `var jalurTahun = [prodi.peminat && prodi.peminat.jalur, prodi.peminat && prodi.peminat.tahun]` |
| `MVP-PWA/assets/app.js:1013` | `isiSlot(document, 'sumber-baris', gabung(['Sumber: SNPMB ' + jalurTahun, tanggalDiperiksa ? 'diperiksa ' + tanggalDiperi` |
| `MVP-PWA/assets/app.js:1062` | `dipakai sebagai mini-prototipe untuk jenis+tiap jalur_masuk. Kampus` |
| `MVP-PWA/assets/app.js:1078` | `var jalurMasuk = Array.isArray(k.jalur_masuk) ? k.jalur_masuk : [];` |
| `MVP-PWA/assets/app.js:1482` | `isiSlot(el, 'jalur', c.jalur);` |
| `MVP-PWA/eksplorasi-tujuan.html:110` | `supaya lolos check.js aturan 9 — tanggal & jalur di sini contoh` |
| `MVP-PWA/eksplorasi-tujuan.html:112` | `kepala berkas dan peminat.jalur/tahun saat data hidup. -->` |

## D. Teks tampilan untuk siswa (perlu persetujuan, tidak diubah)

Baris A yang memuat label tampilan (`DaftarPeriksaScreen.tsx:75`, `CeritaAlumniScreen.tsx:60`, `eksplorasiKampus.ts:131`) hanya berubah pengenalnya; teksnya tetap.

| Lokasi | Isi baris |
|---|---|
| `LANJUT_App/components/screens/AkunScreen.tsx:252` | `isi = <Text style={gaya.teksKecil}>Pilih kelas dan jalurmu di Daftar Periksa untuk melihat kemajuanmu.</Text>;` |
| `LANJUT_App/components/screens/DaftarPeriksaScreen.tsx:84` | `<Kosong judul="Pilih kelas dan jalurmu dulu." teks="Supaya butir yang tampil memang yang perlu kamu siapkan." />` |
| `LANJUT_App/lib/cekPosisi.ts:133` | `ringkas: 'Kamu sudah punya target prodi. Ini bisa jadi saat yang pas untuk mulai mengenal jalurnya.',` |
| `LANJUT_App/lib/cekPosisi.ts:135` | `'Mulai riset PTN dan jalur masuk untuk prodi incaranmu.',` |
| `LANJUT_App/lib/cekPosisi.ts:138` | `: 'Memilih kelas dan jalur di Daftar Periksa bisa bantu melihat langkah yang relevan buat kamu.',` |
| `LANJUT_App/lib/cekPosisi.ts:154` | `'Pastikan dokumen dan jalur yang kamu pilih sudah siap.',` |
| `LANJUT_App/lib/eksplorasiKampus.ts:31` | `kelas10_11: 'Jalur dan Bidangmu',` |
| `LANJUT_App/lib/jenjangSaya.ts:90` | `teks: 'Kelas 10 dan 11 adalah waktu yang tepat untuk mulai memilih mata pelajaran dan memahami jalur masuk perguruan tin` |
| `LANJUT_App/lib/kebijakan-privasi.json:38` | `"Kelas dan jalur yang kamu pilih di Daftar Periksa.",` |
| `LANJUT_App/lib/kebijakan-privasi.json:113` | `"Obrolan biasa dan pertanyaan tentang jalur masuk kuliah tidak memakai modul maupun pencarian web."` |
| `LANJUT_App/server/config/panduan-fitur.json:85` | `"letak": "Beranda, kartu Eksplorasi Kampus (judul layarnya \"Jalur dan Bidangmu\")",` |
| `landing/src/data/kebijakan-privasi.json:37` | `"Kelas dan jalur yang kamu pilih di Daftar Periksa.",` |
| `landing/src/data/kebijakan-privasi.json:112` | `"Obrolan biasa dan pertanyaan tentang jalur masuk kuliah tidak memakai modul maupun pencarian web."` |

## E. Bukan jalur masuk PTN (tidak diubah)

| Lokasi | Arti | Isi baris |
|---|---|---|
| `LANJUT_App/README.md:3` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `**Status:** jalur pengembangan utama LANJUT sejak 18 Sep 2026. Expo dipilih menggantikan rencana Flutter, dan aplikasi i` |
| `LANJUT_App/README.md:9` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `- **Kelas SMP 7–9** (LANJUT_035): kelas 7–12 ditanyakan wajib di form Daftar dan bisa diubah di Data Akun. Linimasa (ten` |
| `LANJUT_App/README.md:16` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `- **Data Akun** (v1.1, di layar Akun '/akun'; sebelum LANJUT_074 bernama Jalur Saya): nama tampilan, kelas, target prodi` |
| `LANJUT_App/README.md:17` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `- **Jalur Saya** (v1.1, '/cek-posisi'; nama ini dipakai sejak LANJUT_074, rute tetap; pintu dari Beranda, Jenjang Saya, ` |
| `LANJUT_App/README.md:80` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `- **Navigasi:** app bar (maskot, wordmark, ikon profil), tab bar bawah lima tab (LANJUT_074: Beranda, Jenjang Saya, **Ng` |
| `LANJUT_App/README.md:92` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `\| Daftar Periksa \| Ada keping Kelas & Jalur untuk menyaring butir. Centang disimpan ke akun. \| AC F5 di PRD (PWA belu` |
| `LANJUT_App/README.md:139` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `- **Ringkasan kemajuan di Data Akun memakai 'hooks/useProgresDaftarPeriksa', hook yang sama dengan layar Daftar Periksa*` |
| `LANJUT_App/README.md:140` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `- **Pilihan kelas/jalur di perangkat disimpan per akun** ('lanjut.profil.lokal.v1:<id pengguna>') — HP yang dipakai berg` |
| `LANJUT_App/README.md:148` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `- Pilihan jalur di Daftar Periksa masih tersimpan per perangkat ('useProfilLokal'), karena akun belum punya medan jalur.` |
| `LANJUT_App/api/client.ts:115` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `* tempat (SDD Bagian 12: klien bicara ke "LAPISAN API" lewat satu jalur).` |
| `LANJUT_App/api/types.ts:104` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// F3 — jalur "belum tahu prodi". 'GET /konten/mapel/agregasi-lintas-prodi'` |
| `LANJUT_App/components/layout/AppShell.tsx:19` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// LANJUT_074: /cek-posisi bernama "Jalur Saya"; halaman akun jadi "Data Akun" (DRAF).` |
| `LANJUT_App/components/layout/AppShell.tsx:24` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `'/cek-posisi': 'Jalur Saya',` |
| `LANJUT_App/components/screens/AkunScreen.tsx:23` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `import { tampilPintuJalurSaya, teksKemajuanDataAkun } from '../../lib/jenjangSaya';` |
| `LANJUT_App/components/screens/AkunScreen.tsx:30` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// "Data Akun" (v1.1 LANJUT_004 menamainya Jalur Saya; nama itu dipindah ke` |
| `LANJUT_App/components/screens/AkunScreen.tsx:52` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `<KartuJalur key={pengguna.id} pengguna={pengguna} />` |
| `LANJUT_App/components/screens/AkunScreen.tsx:54` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `{tampilPintuJalurSaya(pengguna.kelas) ? (` |
| `LANJUT_App/components/screens/AkunScreen.tsx:57` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `judul="Jalur Saya"` |
| `LANJUT_App/components/screens/AkunScreen.tsx:58` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `keterangan="Tahap kamu sekarang, dihitung dari jalur dan kemajuanmu."` |
| `LANJUT_App/components/screens/AkunScreen.tsx:86` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `function KartuJalur({ pengguna }: { pengguna: Pengguna }) {` |
| `LANJUT_App/components/screens/AkunScreen.tsx:93` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `if (ubah) return <FormJalur pengguna={pengguna} onSelesai={() => setUbah(false)} />;` |
| `LANJUT_App/components/screens/AkunScreen.tsx:108` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `label={namaProdi && pengguna.kelas ? 'Ubah' : 'Lengkapi jalurmu'}` |
| `LANJUT_App/components/screens/AkunScreen.tsx:120` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `function FormJalur({ pengguna, onSelesai }: { pengguna: Pengguna; onSelesai: () => void }) {` |
| `LANJUT_App/components/screens/CekPosisiScreen.tsx:25` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* Jalur Saya (v1.1, LANJUT_005; nama baru sejak LANJUT_074): Posisi Kamu → Fokus Sekarang →` |
| `LANJUT_App/components/screens/EksplorasiKampusScreen.tsx:42` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `* prodi, tanpa tanggal; SMP juga tanpa jalur masuk (BAGIAN_EKSPLORASI). Isi yang` |
| `LANJUT_App/components/screens/KesiapanUjian.tsx:15` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* Seksi Kesiapan Ujian (layar Jalur Saya /cek-posisi, kelas 12; lib/kesiapanUjian.ts). Satu ketukan langsung` |
| `LANJUT_App/components/screens/KhususKelas12.tsx:17` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* Gerbang LANJUT_035 untuk Linimasa, Daftar Periksa, dan Jalur Saya (/cek-posisi): kelas 12` |
| `LANJUT_App/components/screens/MapelPilihan.tsx:116` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* Dipakai di layar /cek-posisi (Jalur Saya) dan di Pilih Mapel. Hanya nama rumpun (dari data` |
| `LANJUT_App/components/screens/auth/RegisterScreen.tsx:46` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `'Kami menyimpan nama pengguna, nama tampilan, email (kalau kamu isi), kelas, prodi impian, dan centang Daftar Periksamu ` |
| `LANJUT_App/components/screens/auth/RegisterScreen.tsx:68` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// Periksa, dan Jalur Saya (/cek-posisi) tampil (kelas 12) atau placeholder (7–11).` |
| `LANJUT_App/components/ui/Ikon.tsx:48` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// Pin peta untuk Jalur Saya, layar /cek-posisi (tidak ada di PWA, gaya garis yang sama).` |
| `LANJUT_App/hooks/useAgregasiMapelLintasProdi.ts:7` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// F3 — jalur "belum tahu prodi": berapa prodi yang membutuhkan tiap mapel,` |
| `LANJUT_App/hooks/usePosisi.ts:11` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* Jalur Saya (/cek-posisi, LANJUT_074) — menggabungkan sinyal yang app sudah punya: prodi impian` |
| `LANJUT_App/hooks/useProdiMapel.ts:14` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `* prodi (F3 juga punya jalur "belum tahu prodi" — lihat PRD Bagian 6 F3).` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:21` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* seperti Pilih Mapel). Dipakai Daftar Periksa, Data Akun, dan Jalur Saya` |
| `LANJUT_App/hooks/useProgresDaftarPeriksa.ts:47` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* semuanya digabung, jadi Daftar Periksa, Data Akun, dan Jalur Saya` |
| `LANJUT_App/lib/beranda.ts:53` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// LANJUT_074: fitur /cek-posisi kini bernama "Jalur Saya" (DRAF). id & rute tetap.` |
| `LANJUT_App/lib/beranda.ts:56` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `judul: 'Jalur Saya',` |
| `LANJUT_App/lib/beranda.ts:57` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `labelPendek: 'Jalur Saya',` |
| `LANJUT_App/lib/beranda.ts:116` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* - SMP (kelas 7–9): TIDAK menampilkan "Jalur Saya" (/cek-posisi). Digantikan dengan kartu` |
| `LANJUT_App/lib/beranda.ts:121` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* - Kelas 12: Jalur Saya, Eksplorasi Kampus (LANJUT_075), Arsip Belajar,` |
| `LANJUT_App/lib/beranda.ts:208` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `labelTombol: 'Jalur Saya',` |
| `LANJUT_App/lib/cekPosisi.ts:2` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* Jalur Saya (v1.1, LANJUT_005; nama baru sejak LANJUT_074, rute tetap /cek-posisi) — tahap siswa dihitung dari data yan` |
| `LANJUT_App/lib/eksplorasiKampus.ts:9` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `*   - Kelas 10–11      → "Jalur dan Bidangmu": jalur masuk umum + bidang minat.` |
| `LANJUT_App/lib/eksplorasiKampus.ts:43` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `* (jalur masuk) dan tidak ada bagian bertanggal di versi mana pun: tanggal` |
| `LANJUT_App/lib/eksplorasiKampus.ts:107` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `/** Jalur masuk umum untuk kelas 10–11 — tanpa tanggal, tanpa angka. DRAF, belum dicek ke SNPMB. */` |
| `LANJUT_App/lib/jenjang.ts:10` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* Linimasa, Daftar Periksa, dan Jalur Saya (/cek-posisi) berisi SNBP/SNBT/TKA — murni untuk` |
| `LANJUT_App/lib/jenjangSaya.ts:34` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// LANJUT_074: halaman akun bernama "Data Akun" (dulu disebut Jalur Saya).` |
| `LANJUT_App/lib/jenjangSaya.ts:159` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// LANJUT_074: judul pintu /cek-posisi menjadi "Jalur Saya"; keterangan tetap.` |
| `LANJUT_App/lib/jenjangSaya.ts:160` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `{ id: 'cek-posisi', ikon: 'posisi', judul: 'Jalur Saya', keterangan: 'Lihat kamu lagi di tahap mana dan langkah berikutn` |
| `LANJUT_App/lib/jenjangSaya.ts:194` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* Pintu "Jalur Saya" (/cek-posisi) di Data Akun. LANJUT_077b §B: TIDAK untuk SMP` |
| `LANJUT_App/lib/jenjangSaya.ts:197` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* yang sudah menyembunyikan Jalur Saya sejak LANJUT_064. Kelas 10–12 dan akun` |
| `LANJUT_App/lib/jenjangSaya.ts:200` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `export function tampilPintuJalurSaya(kelas: Kelas \| null \| undefined): boolean {` |
| `LANJUT_App/lib/kebijakan-privasi.json:23` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `"Jalur belajarmu: kelas, jenis sekolah (SMP, SMA, SMK, atau MA), prodi impian, dan gaya belajar yang kamu pilih.",` |
| `LANJUT_App/lib/kebijakan-privasi.json:147` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `"Orang tua atau wali memberi persetujuan lewat surat yang dibagikan sekolah. Setelah surat dikumpulkan, persetujuan itu ` |
| `LANJUT_App/lib/kebijakan-privasi.json:157` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `"Membetulkan data yang salah. Nama tampilan, kelas, jenis sekolah, prodi impian, dan gaya belajar bisa kamu ubah sendiri` |
| `LANJUT_App/lib/kesiapanUjian.ts:4` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* Seksi Kesiapan Ujian (layar Jalur Saya /cek-posisi, kelas 12) + kategori "Persiapan Ujian" di Daftar Periksa` |
| `LANJUT_App/lib/kesiapanUjian.ts:11` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `*    menentukan tahap Jalur Saya;` |
| `LANJUT_App/lib/kesiapanUjian.ts:14` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* Bahasanya menawarkan, tidak menyuruh (sama dengan Jalur Saya).` |
| `LANJUT_App/lib/linimasa.ts:40` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `* kartu tenggat, Info Penting, dan Jalur Saya /cek-posisi (lewat turunkanLinimasa).` |
| `LANJUT_App/lib/mapelPilihan.ts:92` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// Membuka pilihan rumpun di layar yang sama (pilihan yang sama juga ada di layar Jalur Saya).` |
| `LANJUT_App/lib/pilihMapel.ts:47` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `* Jalur "belum tahu prodi" — AC F3: "tunjukkan mapel yang paling sering` |
| `LANJUT_App/lib/pilihMapel.ts:50` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `* TIDAK LAGI dipakai jalur produksi — 'useAgregasiMapelLintasProdi' sekarang` |
| `LANJUT_App/plugins/withKeystoreRilis.js:3` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// di repo). android/app/build.gradle membaca keystore.properties dari jalur di variabel` |
| `LANJUT_App/plugins/withKeystoreRilis.js:12` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `def lanjutKeystorePropsJalur = System.getenv('LANJUT_KEYSTORE_PROPS')` |
| `LANJUT_App/plugins/withKeystoreRilis.js:14` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `def lanjutKeystoreAda = lanjutKeystorePropsJalur != null && new File(lanjutKeystorePropsJalur).isFile()` |
| `LANJUT_App/plugins/withKeystoreRilis.js:16` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `new File(lanjutKeystorePropsJalur).withInputStream { lanjutKeystoreProps.load(it) }` |
| `LANJUT_App/server/.env.example:41` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `# Pada server mandiri atau kontainer Docker, salin folder data lalu isi jalurnya di sini.` |
| `LANJUT_App/server/README.md:302` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `\| Metode \| Jalur \| Isi \|` |
| `LANJUT_App/server/README.md:380` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `\| Metode \| Jalur \| Isi \|` |
| `LANJUT_App/server/README.md:558` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `- log akses hanya mencatat metode dan jalur;` |
| `LANJUT_App/server/README.md:702` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `aturan di 'config/materi.json'). Obrolan biasa, pertanyaan jalur masuk, dan` |
| `LANJUT_App/server/config/materi.json:3` | Topik pesan chatbot (kuota, UKT, tanggal), bukan pilihan jalur | `"cara_kerja": "Pesan dinormalisasi (huruf kecil, tanpa tanda baca). Urutan: ada kata jalur masuk → jalur_masuk (tanpa mo` |
| `LANJUT_App/server/config/materi.json:10` | Topik pesan chatbot (kuota, UKT, tanggal), bukan pilihan jalur | `"kata_jalur_masuk": [` |
| `LANJUT_App/server/config/materi.json:11` | Topik pesan chatbot (kuota, UKT, tanggal), bukan pilihan jalur | `"snbp", "snbt", "utbk", "kuota", "ukt", "daya tampung", "pendaftaran", "jalur masuk", "jalur",` |
| `LANJUT_App/server/config/nginx.conf.example:2` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `# Contoh Konfigurasi Nginx Reverse Proxy untuk API LANJUT (Jalur B VPS)` |
| `LANJUT_App/server/config/panduan-fitur.json:86` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `"guna": "gambaran umum jalur masuk kuliah (berlabel Perkiraan, belum dicek ke sumber resmi) dan memilih sampai 3 bidang ` |
| `LANJUT_App/server/config/panduan-fitur.json:96` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `"nama": "Jalur Saya",` |
| `LANJUT_App/server/config/panduan-fitur.json:97` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `"letak": "Beranda, kartu Jalur Saya (juga tombol \"Mulai dari Sini\")",` |
| `LANJUT_App/server/config/panduan-fitur.json:104` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `"guna": "daftar langkah persiapan masuk kuliah (SNBP, SNBT, TKA) yang bisa dicentang satu per satu; persentasenya ikut t` |
| `LANJUT_App/server/ecosystem.config.js:1` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Konfigurasi PM2 untuk Produksi (Jalur B VPS)` |
| `LANJUT_App/server/src/app.js:73` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Log akses minimal: metode, jalur, status, durasi — TANPA badan permintaan` |
| `LANJUT_App/server/src/app.js:116` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `galat(res, 'TIDAK_DITEMUKAN', 'Jalur tidak ditemukan.');` |
| `LANJUT_App/server/src/db/migrasi/018_pemakaian_ai.sql:37` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `-- jalur jawaban.` |
| `LANJUT_App/server/src/db/migrasi/023_kesiapan_ujian.sql:3` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `-- siswa sendiri atas "Seberapa siap kamu menghadapi ujian?" di Jalur Saya (kelas 12).` |
| `LANJUT_App/server/src/db/migrasi/023_kesiapan_ujian.sql:4` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `-- Bukan hasil tes. Hanya dipakai untuk menyesuaikan saran di Jalur Saya; TIDAK ikut` |
| `LANJUT_App/server/src/db/persetujuan/persetujuan-ortu.js:10` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `//   tabel 'persetujuan' (lewat persetujuan.repo.js, satu jalur tulis).` |
| `LANJUT_App/server/src/db/verifikasi/lembar-review.js:13` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `// kampus + jalur masuk, status data per kelompok) dan tidak terbaca di satu` |
| `LANJUT_App/server/src/middleware/penangananGalat.js:22` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Log server: metode, jalur, status, durasi (ditangani logger akses di` |
| `LANJUT_App/server/src/modul/auth/auth.layanan.js:25` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// supaya semua jalur tulis (daftar, ubah profil, klaim sinkron) memakai` |
| `LANJUT_App/server/src/modul/event-sekolah/event-sekolah.layanan.js:13` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// mencatat apa pun, dan log akses hanya memuat metode, jalur (id event), status.` |
| `LANJUT_App/server/src/modul/konten/konten.repo.js:61` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `* F3 — jalur "belum tahu prodi": per mapel, berapa banyak prodi yang` |
| `LANJUT_App/server/src/modul/konten/konten.rute.js:79` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// F3 — jalur "belum tahu prodi": agregasi lintas SEMUA prodi dihitung di` |
| `LANJUT_App/server/src/modul/konten/konten.rute.js:168` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// ada, supaya isi yang belum dicek tidak bocor lewat jalur mana pun.` |
| `LANJUT_App/server/src/modul/levelin/konfigurasi.js:11` | Alamat kunci di objek konfigurasi | `// kunci baris -> [jalur di objek konfigurasi, pengubah tipe]` |
| `LANJUT_App/server/src/modul/levelin/konfigurasi.js:26` | Alamat kunci di objek konfigurasi | `function ambilJalur(obj, jalur) {` |
| `LANJUT_App/server/src/modul/levelin/konfigurasi.js:27` | Alamat kunci di objek konfigurasi | `return jalur.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);` |
| `LANJUT_App/server/src/modul/levelin/konfigurasi.js:30` | Alamat kunci di objek konfigurasi | `function aturJalur(obj, jalur, nilai) {` |
| `LANJUT_App/server/src/modul/levelin/konfigurasi.js:31` | Alamat kunci di objek konfigurasi | `const bagian = jalur.split('.');` |
| `LANJUT_App/server/src/modul/levelin/konfigurasi.js:54` | Alamat kunci di objek konfigurasi | `const [jalur, ubah] = peta;` |
| `LANJUT_App/server/src/modul/levelin/konfigurasi.js:57` | Alamat kunci di objek konfigurasi | `aturJalur(cfg, jalur, nilai);` |
| `LANJUT_App/server/src/modul/levelin/konfigurasi.js:68` | Alamat kunci di objek konfigurasi | `for (const [kunci, [jalur]] of Object.entries(KUNCI_KONFIG)) {` |
| `LANJUT_App/server/src/modul/levelin/konfigurasi.js:69` | Alamat kunci di objek konfigurasi | `const nilai = ambilJalur(berkas, jalur);` |
| `LANJUT_App/server/src/modul/ngobrol/materi.js:15` | Topik pesan chatbot (kuota, UKT, tanggal), bukan pilihan jalur | `for (const k of ['kata_tanya', 'kata_jalur_masuk', 'kata_rencana', 'kata_obrolan', 'kata_henti']) {` |
| `LANJUT_App/server/src/modul/ngobrol/materi.js:33` | Topik pesan chatbot (kuota, UKT, tanggal), bukan pilihan jalur | `const FRASA_JALUR = KONFIG.kata_jalur_masuk.map(rapikan);` |
| `LANJUT_App/server/src/modul/ngobrol/materi.js:100` | Topik pesan chatbot (kuota, UKT, tanggal), bukan pilihan jalur | `* Jenis pesan: { jenis: 'materi' \| 'jalur_masuk' \| 'obrolan', mapelId, kata }.` |
| `LANJUT_App/server/src/modul/ngobrol/materi.js:101` | Topik pesan chatbot (kuota, UKT, tanggal), bukan pilihan jalur | `* jalur_masuk dan obrolan: tanpa modul dan tanpa web.` |
| `LANJUT_App/server/src/modul/ngobrol/materi.js:106` | Topik pesan chatbot (kuota, UKT, tanggal), bukan pilihan jalur | `if (FRASA_JALUR.some((f) => memuatFrasa(t, f))) return { jenis: 'jalur_masuk', mapelId: null, kata };` |
| `LANJUT_App/server/src/modul/ngobrol/ngobrol.layanan.js:75` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `- Sesuaikan saran dengan profil siswa di bawah, tanpa mengulang-ulang isi profilnya. Untuk siswa SMP, bantu juga menimba` |
| `LANJUT_App/server/src/modul/ngobrol/ngobrol.layanan.js:96` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `- Hasil web tidak menggantikan DATA TERVERIFIKASI untuk angka jalur masuk.` |
| `LANJUT_App/server/src/modul/ngobrol/ngobrol.layanan.js:103` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `- Angka jalur masuk (kuota, tanggal, persentase, nilai minimum, biaya) hanya boleh kamu sebut kalau ada di bagian DATA T` |
| `LANJUT_App/server/src/modul/ngobrol/ngobrol.layanan.js:139` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `* memakainya untuk skenario fakta jalur masuk.` |
| `LANJUT_App/server/src/modul/ngobrol/ngobrol.layanan.js:241` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `* lapis 2 (LANJUT_054) supaya keduanya lewat jalur yang sama.` |
| `LANJUT_App/server/src/modul/ngobrol/panduan-fitur.js:6` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// chatbot tidak menyebut menu yang tidak ada (mis. Jalur Saya untuk SMP). Bukan data akun:` |
| `LANJUT_App/server/src/modul/pengguna/pengguna.layanan.js:80` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// C-2b: validasi keberadaan prodi juga di jalur PATCH /pengguna/saya,` |
| `LANJUT_App/server/src/modul/persetujuan/persetujuan.layanan.js:8` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `//     menyetujui untuk dirinya). Dua jalur: skrip admin 'npm run persetujuan-ortu'` |
| `LANJUT_App/server/src/modul/persetujuan/persetujuan.layanan.js:131` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `/** Catatan yang tersimpan untuk jalur konfirmasi di app; tidak dari klien. */` |
| `LANJUT_App/server/src/modul/persetujuan/persetujuan.layanan.js:137` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `* jalur surat: kebijakan dulu). Sudah aktif → tidak menambah baris. Sumber dan catatan` |
| `LANJUT_App/server/src/util/beranda.js:43` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `judul: 'Jalur Saya',` |
| `LANJUT_App/server/src/util/beranda.js:44` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `labelPendek: 'Jalur Saya',` |
| `LANJUT_App/server/src/util/beranda.js:163` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `labelTombol: 'Jalur Saya',` |
| `LANJUT_App/server/tests/ambil-alih-email.test.js:54` | Alamat URL atau berkas | `const kirim = (jalur, body, token) => kirimJson(baseUrl, jalur, body, token);` |
| `LANJUT_App/server/tests/bantuan.js:28` | Alamat URL atau berkas | `async function kirimJson(baseUrl, jalur, body, token) {` |
| `LANJUT_App/server/tests/bantuan.js:29` | Alamat URL atau berkas | `const res = await fetch('${baseUrl}/api/v1${jalur}', {` |
| `LANJUT_App/server/tests/beranda-grid-mulai.test.js:130` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// Kelas 12 -> Jalur Saya (/cek-posisi; label baru LANJUT_074)` |
| `LANJUT_App/server/tests/beranda-grid-mulai.test.js:134` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.equal(info12.labelTombol, 'Jalur Saya');` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:3` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// lima tab dengan tab tengah Ngobrol, nama "Jalur Saya" / "Data Akun", dan` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:252` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `describe('LANJUT_074 §E: "Jalur Saya" dan "Data Akun"', () => {` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:253` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('Fitur /cek-posisi berlabel "Jalur Saya" di grid, Mulai dari Sini, Jenjang Saya, Data Akun, page bar, dan cermin se` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:255` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.equal(k.judul, 'Jalur Saya');` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:256` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.equal(k.labelPendek, 'Jalur Saya');` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:259` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.equal(beranda.daftarKartuBeranda('12')[0].labelPendek, 'Jalur Saya');` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:260` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.equal(beranda.infoMulaiDariSini('12').labelTombol, 'Jalur Saya');` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:261` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.equal(cermin.infoMulaiDariSini('12').labelTombol, 'Jalur Saya');` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:262` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.equal(jenjangSaya.isiJenjangSaya('12').pintu.find((p) => p.href === '/cek-posisi').judul, 'Jalur Saya');` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:263` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(baca('components', 'layout', 'AppShell.tsx').includes("'/cek-posisi': 'Jalur Saya'"));` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:264` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(baca('components', 'screens', 'AkunScreen.tsx').includes('judul="Jalur Saya"'));` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:313` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('Tidak ada lagi teks app yang menyebut halaman akun "Jalur Saya" (kecuali kebijakan privasi, menunggu review hukum)` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:315` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `const pola = /\b(di\|Buka\|Ubah\|dari) Jalur Saya/;` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:431` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `'**Nama fitur '/cek-posisi':** Jalur Saya',` |
| `LANJUT_App/server/tests/beranda-hero-navigasi.test.js:445` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(!/\b(di\|Buka\|Ubah) Jalur Saya\b\|\*\*Jalur Saya[ ,:—]/.test(sumber), 'masih ada teks yang menyebut halaman a` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:41` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('SMP (kelas 7–9): Jalur Saya disembunyikan, diganti kartu Jenjang Saya (Eksplorasi Kampus, Gaya Belajar) + kartu um` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:55` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(!judul.includes('Jalur Saya'), 'kelas ${k} tidak boleh melihat Jalur Saya');` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:82` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// Verifikasi eksplisit: Jalur Saya TIDAK boleh muncul` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:83` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(!judul.includes('Jalur Saya'), 'kelas ${k} tidak boleh melihat Jalur Saya');` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:93` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// LANJUT_074: kartu /cek-posisi kini berlabel "Jalur Saya". LANJUT_075: Eksplorasi` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:95` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('Kelas 12: Jalur Saya, Eksplorasi Kampus, Arsip, Level-In, Cerita Alumni netral', () => {` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:100` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `'Jalur Saya',` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:107` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// Verifikasi Jalur Saya ADA untuk kelas 12, dan tetap menuju /cek-posisi` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:108` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(judul.includes('Jalur Saya'));` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:109` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.equal(kartu.find((x) => x.judul === 'Jalur Saya').href, '/cek-posisi');` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:165` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(!judulA.includes('Jalur Saya'), 'Akun A kelas 7 TIDAK boleh memiliki kartu Jalur Saya');` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:171` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(judulB.includes('Jalur Saya'), 'Akun B kelas 12 memiliki kartu Jalur Saya');` |
| `LANJUT_App/server/tests/beranda-jenjang.test.js:184` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(!kartuASetelah.map((x) => x.judul).includes('Jalur Saya'));` |
| `LANJUT_App/server/tests/cabut-sesi-tenggat.test.js:25` | Alamat URL atau berkas | `const kirim = (jalur, body) => kirimJson(baseUrl, jalur, body);` |
| `LANJUT_App/server/tests/daftar-email.test.js:41` | Alamat URL atau berkas | `const kirim = (jalur, body, token) => kirimJson(baseUrl, jalur, body, token);` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:52` | Alamat URL atau berkas | `async function panggil(metode, jalur, token, body) {` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:53` | Alamat URL atau berkas | `const res = await fetch('${baseUrl}/api/v1${jalur}', {` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:219` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `test('Versi & judul per jenjang: SMP Kenali Minatmu, 10–11 Jalur dan Bidangmu, 12/tanpa kelas F10', () => {` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:224` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `assert.equal(eks.judulEksplorasi('11'), 'Jalur dan Bidangmu');` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:228` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `test('SMP: tanpa jalur masuk dan tanpa tanggal; ada bidang, tombol Simpan minatku, dan kalimat penutup', () => {` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:236` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `assert.ok(!/SNBP\|SNBT\|mandiri\|jalur/i.test(teksSmp));` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:239` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `test('Kelas 10–11: jalur umum (SNBP, SNBT, mandiri), bidang maks. 3, tombol Simpan bidangku, kalimat pengganti daftar pr` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:247` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `test('Tidak ada tanggal, angka, biaya, daya tampung, atau peluang di teks jalur dan bidang', () => {` |
| `LANJUT_App/server/tests/eksplorasi-kampus.test.js:341` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `'Jalur dan Bidangmu',` |
| `LANJUT_App/server/tests/event-sekolah-smp.test.js:108` | Alamat URL atau berkas | `async function panggil(metode, jalur, token, body) {` |
| `LANJUT_App/server/tests/event-sekolah-smp.test.js:109` | Alamat URL atau berkas | `const res = await fetch('${baseUrl}/api/v1${jalur}', {` |
| `LANJUT_App/server/tests/event-sekolah-smp.test.js:149` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `for (const [metode, jalur, body] of SEMUA_METODE) {` |
| `LANJUT_App/server/tests/event-sekolah-smp.test.js:150` | Alamat URL atau berkas | `const r = await panggil(metode, jalur, a.token, body);` |
| `LANJUT_App/server/tests/event-sekolah-smp.test.js:151` | Alamat URL atau berkas | `assert.equal(r.status, 403, 'kelas ${kelas} ${metode} ${jalur}');` |
| `LANJUT_App/server/tests/event-sekolah-smp.test.js:152` | Alamat URL atau berkas | `assert.equal(r.json.galat.kode, 'KELAS_TIDAK_DIDUKUNG', 'kelas ${kelas} ${metode} ${jalur}');` |
| `LANJUT_App/server/tests/event-sekolah-smp.test.js:190` | Alamat URL atau berkas | `for (const [metode, jalur, body] of [` |
| `LANJUT_App/server/tests/event-sekolah-smp.test.js:195` | Alamat URL atau berkas | `const r = await panggil(metode, jalur, a.token, body);` |
| `LANJUT_App/server/tests/event-sekolah-smp.test.js:196` | Alamat URL atau berkas | `assert.equal(r.json.galat?.kode, 'KELAS_TIDAK_DIDUKUNG', '${metode} ${jalur}');` |
| `LANJUT_App/server/tests/event-sekolah-smp.test.js:449` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Satu-satunya panggilan jaringan app = API LANJUT sendiri lewat apiFetch dengan jalur relatif.` |
| `LANJUT_App/server/tests/event-sekolah.test.js:70` | Alamat URL atau berkas | `async function panggil(metode, jalur, token, body) {` |
| `LANJUT_App/server/tests/event-sekolah.test.js:71` | Alamat URL atau berkas | `const res = await fetch('${baseUrl}/api/v1${jalur}', {` |
| `LANJUT_App/server/tests/event-sekolah.test.js:186` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `for (const [metode, jalur, body] of SEMUA_METODE) {` |
| `LANJUT_App/server/tests/event-sekolah.test.js:187` | Alamat URL atau berkas | `const r = await panggil(metode, jalur, a.token, body);` |
| `LANJUT_App/server/tests/event-sekolah.test.js:188` | Alamat URL atau berkas | `assert.equal(r.status, 403, '${metode} ${jalur}');` |
| `LANJUT_App/server/tests/event-sekolah.test.js:189` | Alamat URL atau berkas | `assert.equal(r.json.galat.kode, 'FITUR_BELUM_AKTIF', '${metode} ${jalur}');` |
| `LANJUT_App/server/tests/event-sekolah.test.js:196` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `for (const [metode, jalur, body] of SEMUA_METODE) {` |
| `LANJUT_App/server/tests/event-sekolah.test.js:197` | Alamat URL atau berkas | `const r = await panggil(metode, jalur, a.token, body);` |
| `LANJUT_App/server/tests/event-sekolah.test.js:198` | Alamat URL atau berkas | `assert.equal(r.json.galat.kode, 'FITUR_BELUM_AKTIF', '${metode} ${jalur}');` |
| `LANJUT_App/server/tests/event-sekolah.test.js:239` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `for (const [metode, jalur, body] of SEMUA_METODE) {` |
| `LANJUT_App/server/tests/event-sekolah.test.js:240` | Alamat URL atau berkas | `const r = await panggil(metode, jalur, a.token, body);` |
| `LANJUT_App/server/tests/event-sekolah.test.js:241` | Alamat URL atau berkas | `assert.equal(r.status, 403, '${metode} ${jalur}');` |
| `LANJUT_App/server/tests/event-sekolah.test.js:242` | Alamat URL atau berkas | `assert.equal(r.json.galat.kode, 'AI_BELUM_DIIZINKAN', '${metode} ${jalur}');` |
| `LANJUT_App/server/tests/event-sekolah.test.js:440` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `assert.ok(log.includes('/pengguna/event'), 'log akses tetap tercatat (metode, jalur, status)');` |
| `LANJUT_App/server/tests/event-sekolah.test.js:462` | Alamat URL atau berkas | `for (const jalur of ['/konten/checklist', '/kemajuan', '/butir-pribadi']) {` |
| `LANJUT_App/server/tests/event-sekolah.test.js:463` | Alamat URL atau berkas | `const r = await panggil('GET', jalur, a.token);` |
| `LANJUT_App/server/tests/event-sekolah.test.js:464` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `assert.equal(r.status, 200, jalur);` |
| `LANJUT_App/server/tests/event-sekolah.test.js:465` | Alamat kunci di objek konfigurasi | `hasil[jalur] = r.json;` |
| `LANJUT_App/server/tests/grid-tab-075b.test.js:34` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `kelas12: ['Jalur Saya', 'Eksplorasi Kampus', 'Arsip Belajar', 'Level-In', 'Cerita Alumni'],` |
| `LANJUT_App/server/tests/info-penting-tanggal.test.js:147` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('Kartu tenggat (hero), Info Penting, dan Jalur Saya (/cek-posisi) memakai "hari ini" yang sama (default = hariIniWi` |
| `LANJUT_App/server/tests/jenjang-saya.test.js:99` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// LANJUT_074 hanya mengganti dua nama: pintu /cek-posisi → "Jalur Saya", dan` |
| `LANJUT_App/server/tests/jenjang-saya.test.js:109` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['Jalur Saya', 'Lihat kamu lagi di tahap mana dan langkah berikutnya.', '/cek-posisi'],` |
| `LANJUT_App/server/tests/konten-agregasi.test.js:1` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Uji 'GET /konten/mapel/agregasi-lintas-prodi' (F3, jalur "belum tahu` |
| `LANJUT_App/server/tests/konten-checklist-rumpun.test.js:103` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `test('checklist dengan rumpun: filter kelas & jalur tetap berlaku', async () => {` |
| `LANJUT_App/server/tests/konten-eksplorasi-tujuan.test.js:280` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// LANJUT_044: jalur berkas → tabel untuk penanda "Perkiraan" (jalur tabel →` |
| `LANJUT_App/server/tests/latihan-berikutnya.test.js:52` | Alamat URL atau berkas | `async function panggil(metode, jalur, token, body) {` |
| `LANJUT_App/server/tests/latihan-berikutnya.test.js:53` | Alamat URL atau berkas | `const res = await fetch('${baseUrl}/api/v1${jalur}', {` |
| `LANJUT_App/server/tests/latihan-berikutnya.test.js:67` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `/** Jawab 'n' kartu di satu mapel dengan keyakinan 5 dan jawaban salah (pola "terlalu yakin"), lewat jalur Latihan. */` |
| `LANJUT_App/server/tests/latihan-berikutnya.test.js:244` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Kelas 12 tetap melihat ringkasan X dari Y (jalur kode tidak berubah).` |
| `LANJUT_App/server/tests/levelin-kalibrasi.test.js:5` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Data dibuat lewat jalur F7 (kartu sendiri → sesi → riwayat). Butuh benih` |
| `LANJUT_App/server/tests/levelin-kalibrasi.test.js:49` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `/** Jawab 'benar' + 'salah' kartu di satu mapel lewat jalur F7. 'keyakinan' opsional per jawaban. */` |
| `LANJUT_App/server/tests/mapel-pilihan.test.js:76` | Alamat URL atau berkas | `async function panggil(metode, jalur, token, body) {` |
| `LANJUT_App/server/tests/mapel-pilihan.test.js:77` | Alamat URL atau berkas | `const res = await fetch('${baseUrl}/api/v1${jalur}', {` |
| `LANJUT_App/server/tests/mapel-pilihan.test.js:473` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(baca('components', 'screens', 'CekPosisiScreen.tsx').includes('<PilihRumpunFavorit />'), 'Jalur Saya memakai k` |
| `LANJUT_App/server/tests/ngobrol-materi-murni.test.js:13` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `test('jenis pesan: materi, jalur masuk, dan obrolan', () => {` |
| `LANJUT_App/server/tests/ngobrol-materi-murni.test.js:20` | Topik pesan chatbot (kuota, UKT, tanggal), bukan pilihan jalur | `'Berapa kuota SNBP fisika?': ['jalur_masuk', null],` |
| `LANJUT_App/server/tests/ngobrol-materi-murni.test.js:21` | Topik pesan chatbot (kuota, UKT, tanggal), bukan pilihan jalur | `'kapan pendaftaran snbt?': ['jalur_masuk', null],` |
| `LANJUT_App/server/tests/ngobrol-materi.test.js:249` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `test('batas potongan dari konfigurasi; ai_modul_aktif=0 → tidak ada potongan; obrolan biasa & jalur masuk tidak memicu p` |
| `LANJUT_App/server/tests/ngobrol-materi.test.js:391` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `test('web tidak dipakai untuk tanda bahaya (akut maupun ringan), jalur masuk, dan obrolan biasa', async (t) => {` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:47` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('SMP: fitur SMP saja — tanpa Jalur Saya, Daftar Periksa, Pilih Mapel prodi, Info Penting, atau SNBP', () => {` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:52` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `for (const tidak of ['Jalur Saya', 'Daftar Periksa', 'Pilih Mapel', 'Info Penting']) assert.ok(!n.includes(tidak), 'SMP ` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:54` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(!/SNBP\|SNBT\|TKA\|Penolong Pilih Mapel\|Jalur Saya/.test(teks), teks);` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:58` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('Kelas 10–11: Pilih Mapel (Mapel Saya + Penolong) dan Daftar Periksa; tanpa Jalur Saya dan Info Penting', () => {` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:62` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `for (const tidak of ['Jalur Saya', 'Info Penting', 'Mapel Saya']) assert.ok(!n.includes(tidak), '${k} mendapat ${tidak}'` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:63` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `assert.ok(panduan.bagianPanduan(k).includes('Jalur dan Bidangmu'));` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:67` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('Kelas 12: Jalur Saya, Daftar Periksa, Pilih Mapel, Eksplorasi Kampus, Info Penting', () => {` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:69` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `for (const ada of ['Jalur Saya', 'Daftar Periksa', 'Pilih Mapel', 'Eksplorasi Kampus', 'Info Penting', 'Arsip Belajar', ` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:113` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('Memuat PANDUAN FITUR jenjang siswa; SMP tidak pernah mendapat Jalur Saya', () => {` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:117` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(!smp.includes('Jalur Saya'), 'SMP tidak boleh diarahkan ke Jalur Saya');` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:120` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(k12.includes('Jalur Saya'));` |
| `LANJUT_App/server/tests/ngobrol-optimasi.test.js:139` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `assert.equal(layanan.rapikanTerpotong('Nggak ada kampus yang paling gampang, karena tiap prodi pun jalur'), 'Nggak ada k` |
| `LANJUT_App/server/tests/ngobrol.test.js:496` | Alamat URL atau berkas | `for (const jalur of ['/ngobrol', '/auth/masuk']) {` |
| `LANJUT_App/server/tests/ngobrol.test.js:499` | Alamat URL atau berkas | `const res = await fetch('${baseUrl}/api/v1${jalur}', { method: 'POST', headers: { 'Content-Type': 'application/json' }, ` |
| `LANJUT_App/server/tests/ngobrol.test.js:502` | Alamat URL atau berkas | `assert.equal(hasil.status, 400, '${jalur}: ${b}');` |
| `LANJUT_App/server/tests/ngobrol.test.js:599` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `test('jalur keluar hanya penyedia-ai.js (AI), surel.js & tokenGoogle.js (LANJUT_083); penyedia-ai hanya dipakai ngobrol.` |
| `LANJUT_App/server/tests/ngobrol.test.js:616` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Daftar PERSIS. LANJUT_083 menambah dua jalur keluar yang bukan AI: email kode masuk` |
| `LANJUT_App/server/tests/ngobrol.test.js:617` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// (SMTP) dan kunci publik Google. Jalur keluar lain apa pun membuat tes ini gagal.` |
| `LANJUT_App/server/tests/otp-email.test.js:52` | Alamat URL atau berkas | `async function kirim(jalur, body) {` |
| `LANJUT_App/server/tests/otp-email.test.js:53` | Alamat URL atau berkas | `const res = await fetch('${baseUrl}/api/v1/auth/${jalur}', {` |
| `LANJUT_App/server/tests/pengerasan-produksi.test.js:116` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Panggil jalur tak terduga dengan memicu rute pengujian internal atau handler langsung` |
| `LANJUT_App/server/tests/persetujuan-ortu-app.test.js:4` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// - butuh kebijakan versi berlaku sudah diterima (urutan sama dengan jalur surat);` |
| `LANJUT_App/server/tests/persetujuan-ortu-app.test.js:7` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// - POST /persetujuan jenis ortu_wali tetap 403 (jalur lama tidak dilonggarkan).` |
| `LANJUT_App/server/tests/persetujuan-ortu-app.test.js:121` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `test('jalur lama tidak dilonggarkan: POST /persetujuan jenis ortu_wali tetap 403', async () => {` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:2` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// Persiapan Ujian di Daftar Periksa + Kesiapan Ujian di Jalur Saya` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:6` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// - GET /konten/checklist: butirnya tersaring kelas & jalur seperti butir lain` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:10` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `//   seksi di Jalur Saya yang tidak mengubah tahap` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:58` | Alamat URL atau berkas | `async function panggil(metode, jalur, token, body) {` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:59` | Alamat URL atau berkas | `const res = await fetch('${baseUrl}/api/v1${jalur}', {` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:127` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `describe('Persiapan Ujian: GET /konten/checklist tersaring kelas & jalur', () => {` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:134` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `test('Kelas 11 jalur TKA: hanya cek Level-In; butir lama tetap tampil seperti sebelumnya', async () => {` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:252` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `test('ringkasPersiapanUjian: hitungan dari kategori Persiapan Ujian saja; null bila jalur tanpa butirnya', () => {` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:279` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Jalur tanpa butir ujian (SNBP): tidak menawarkan tryout/simulasi yang tidak ada di daftarnya.` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:311` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('Daftar Periksa menampilkan catatan kategori; Jalur Saya memasang seksi Kesiapan Ujian', () => {` |
| `LANJUT_App/server/tests/persiapan-ujian.test.js:321` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('Tahap Jalur Saya tidak membaca jawaban kesiapan (hanya data Daftar Periksa)', () => {` |
| `LANJUT_App/server/tests/progres-beranda.test.js:54` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// /sesi-latihan. Tes di berkas ini memakai jalur PUT /kemajuan (kelas 12);` |
| `LANJUT_App/server/tests/progres-beranda.test.js:55` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// jalur butir pribadi ada di progres-butir-pribadi.test.js.` |
| `LANJUT_App/server/tests/progres-butir-pribadi.test.js:7` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// - Jalur butir pribadi lewat /butir-pribadi/:id/selesai, TANPA PUT /kemajuan` |
| `LANJUT_App/server/tests/progres-butir-pribadi.test.js:8` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `//   (jalur yang dipakai siswa kelas 7–11 di app)` |
| `LANJUT_App/server/tests/progres-butir-pribadi.test.js:11` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Tes 068 (progres-beranda.test.js) hanya membuktikan jalur API /kemajuan,` |
| `LANJUT_App/server/tests/progres-butir-pribadi.test.js:117` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `test('Hanya kemajuan (jalur kelas 12): tetap dihitung', () => {` |
| `LANJUT_App/server/tests/progres-butir-pribadi.test.js:121` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `test('Hanya butir pribadi (jalur kelas 7–11): dihitung', () => {` |
| `LANJUT_App/server/tests/progres-butir-pribadi.test.js:191` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `describe('LANJUT_070 §B: jalur butir pribadi lewat server (tanpa PUT /kemajuan)', () => {` |
| `LANJUT_App/server/tests/progres-butir-pribadi.test.js:217` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `assert.equal(s2.centangKemajuan, 0, '/kemajuan tidak boleh tersentuh di jalur ini');` |
| `LANJUT_App/server/tests/saklar-bawaan-dan-smp.test.js:7` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `//   (pintu Jalur Saya /cek-posisi disembunyikan untuk kelas 7–9; kelas 10–12 tetap)` |
| `LANJUT_App/server/tests/saklar-bawaan-dan-smp.test.js:106` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `/** Rute yang bisa dibuka dari Data Akun untuk kelas 'k' (pintu Jalur Saya hanya bila tampilPintuJalurSaya). */` |
| `LANJUT_App/server/tests/saklar-bawaan-dan-smp.test.js:109` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `return semua.filter((r) => r !== '/cek-posisi' \|\| jenjangSaya.tampilPintuJalurSaya(k));` |
| `LANJUT_App/server/tests/saklar-bawaan-dan-smp.test.js:122` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `test('Pintu Jalur Saya tidak tampil untuk kelas 7–9; tampil untuk kelas 10–12 dan akun tanpa kelas (tidak berubah)', () ` |
| `LANJUT_App/server/tests/saklar-bawaan-dan-smp.test.js:123` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `for (const k of ['7', '8', '9']) assert.equal(jenjangSaya.tampilPintuJalurSaya(k), false, 'kelas ${k}');` |
| `LANJUT_App/server/tests/saklar-bawaan-dan-smp.test.js:124` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `for (const k of ['10', '11', '12', null, undefined]) assert.equal(jenjangSaya.tampilPintuJalurSaya(k), true, 'kelas ${k}` |
| `LANJUT_App/server/tests/saklar-bawaan-dan-smp.test.js:126` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `assert.ok(layarAkun.includes("{tampilPintuJalurSaya(pengguna.kelas) ? (\n        <KartuPintu\n          ikon=\"posisi\"\` |
| `LANJUT_App/server/tests/saklar-bawaan-dan-smp.test.js:127` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `assert.ok(layarAkun.includes('keterangan="Tahap kamu sekarang, dihitung dari jalur dan kemajuanmu."'));` |
| `LANJUT_App/server/tests/skenario-ai.test.js:363` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `test('lapis 2 mode kering: tanpa izin, tanpa panggilan, tanpa basis data; rencana memakai jalur produksi', () => {` |
| `LANJUT_App/server/tests/skenario-ai/skenario.json:290` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `"harus": ["Menanggapi rasa takutnya", "Mengingatkan ada jalur lain selain SNBP tanpa menyebut tanggal pasti"],` |
| `LANJUT_App/server/tests/skenario-ai/skenario.json:652` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `"kategori": "G. Fakta jalur masuk",` |
| `LANJUT_App/server/tests/skenario-ai/skenario.json:664` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `"kategori": "G. Fakta jalur masuk",` |
| `LANJUT_App/server/tests/skenario-ai/skenario.json:673` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `"kategori": "G. Fakta jalur masuk",` |
| `LANJUT_App/server/tests/skenario-ai/skenario.json:682` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `"kategori": "G. Fakta jalur masuk",` |
| `LANJUT_App/server/tests/skenario-ai/skenario.json:691` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `"kategori": "G. Fakta jalur masuk",` |
| `LANJUT_App/server/tests/skenario-ai/skenario.json:701` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `"kategori": "G. Fakta jalur masuk",` |
| `LANJUT_App/server/tests/skenario-ai/skenario.json:970` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `"judul": "Pertanyaan jalur masuk: tanpa modul, tanpa web",` |
| `LANJUT_App/server/tests/skenario-ai/skenario.json:981` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `"instruksi_sistem_memuat": ["Hasil web tidak menggantikan DATA TERVERIFIKASI untuk angka jalur masuk."]` |
| `LANJUT_App/server/tests/smoke.test.js:66` | Alamat URL atau berkas | `const jalurSmoke = path.join(__dirname, '..', 'tools', 'smoke.js');` |
| `LANJUT_App/server/tests/smoke.test.js:67` | Alamat kunci di objek konfigurasi | `const hasil = spawnSync(process.execPath, [jalurSmoke, '--url=http://api.lanjut.test:${port}'], {` |
| `LANJUT_App/server/tests/tenggat-verifikasi.test.js:61` | Alamat URL atau berkas | `const kirim = (jalur, body, token) => kirimJson(baseUrl, jalur, body, token);` |
| `LANJUT_App/server/tools/cadangan-db.js:20` | Alamat URL atau berkas | `const jalurBerkas = path.join(FOLDER_CADANGAN, namaBerkas);` |
| `LANJUT_App/server/tools/cadangan-db.js:57` | Alamat URL atau berkas | `fs.writeFileSync(jalurBerkas, hasil.stdout, 'utf-8');` |
| `LANJUT_App/server/tools/cadangan-db.js:58` | Alamat URL atau berkas | `const stats = fs.statSync(jalurBerkas);` |
| `LANJUT_App/server/tools/cadangan-db.js:68` | Alamat URL atau berkas | `jalur: path.join(FOLDER_CADANGAN, f),` |
| `LANJUT_App/server/tools/cadangan-db.js:76` | Alamat URL atau berkas | `fs.unlinkSync(berkasSemua[i].jalur);` |
| `LANJUT_App/server/tools/evaluasi-ai.js:12` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `// Jalur sama dengan produksi: susunPermintaan (instruksi sistem, penyamaran,` |
| `LANJUT_App/server/tools/lembar-review-teks.js:136` | Isi lembar review internal, bukan pengenal | `'Daftar data yang disimpan (akun, jalur, Daftar Periksa, kartu, latihan) dan tujuannya.',` |
| `LANJUT_App/server/tools/lembar-review-teks.js:242` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `nama: 'Nama "Jalur Saya" untuk /cek-posisi',` |
| `LANJUT_App/server/tools/lembar-review-teks.js:246` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `{ task: 'LANJUT_074', awal: '**Nama halaman akun '/akun':**', nama: 'Nama "Data Akun" untuk halaman akun', di: 'Judul bi` |
| `LANJUT_App/server/tools/lembar-review-teks.js:247` | Isi lembar review internal, bukan pengenal | `{ task: 'LANJUT_074', awal: '**Data Akun — judul form ubah:**', nama: 'Judul form ubah', di: 'Data Akun, sesudah menekan` |
| `LANJUT_App/server/tools/lembar-review-teks.js:251` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `kelompok: 'Data Akun (halaman akun; sebelum LANJUT_074 bernama Jalur Saya)',` |
| `LANJUT_App/server/tools/lembar-review-teks.js:512` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `{ task: 'LANJUT_037', awal: 'Jalur Saya', nama: 'Pintu Jalur Saya (/cek-posisi; nama sejak LANJUT_074)', di: 'Jenjang Sa` |
| `LANJUT_App/server/tools/lembar-review-teks.js:574` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `// untuk kelas 7–11 di Jalur Saya /cek-posisi, jadi masih dipakai di SMP.` |
| `LANJUT_App/server/tools/lembar-review-teks.js:575` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `kelompok: 'Bagian khusus kelas 12 (Jalur Saya /cek-posisi, Daftar Periksa) — pengganti untuk kelas lain',` |
| `LANJUT_App/server/tools/lembar-review-teks.js:581` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `di: 'Jalur Saya /cek-posisi (kelas 7–11), menggantikan isinya. Tidak lagi di Daftar Periksa: kelas 10–11 sejak LANJUT_06` |
| `LANJUT_App/server/tools/lembar-review-teks.js:582` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `oleh: 'Kelas 10–11, hanya di layar /cek-posisi (Jalur Saya); kelas 7–9 tidak bisa membuka layar itu dari app sejak LANJU` |
| `LANJUT_App/server/tools/lembar-review-teks.js:592` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `di: 'Sama dengan butir judul di atasnya: hanya Jalur Saya /cek-posisi (kelas 7–11); sejak LANJUT_076b tidak lagi di Daft` |
| `LANJUT_App/server/tools/lembar-review-teks.js:593` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `oleh: 'Kelas 10–11, hanya di layar /cek-posisi (Jalur Saya); kelas 7–9 tidak bisa membuka layar itu dari app sejak LANJU` |
| `LANJUT_App/server/tools/lembar-review-teks.js:599` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `{ task: 'LANJUT_035', awal: '**Kelas 7–11 — tombol:**', nama: 'Pengganti kelas 7–11 — tombol', di: 'Sama dengan butir ju` |
| `LANJUT_App/server/tools/lembar-review-teks.js:600` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `{ task: 'LANJUT_035', awal: '**Kelas kosong — judul:**', nama: 'Pengganti tanpa kelas — judul', di: 'Jalur Saya /cek-pos` |
| `LANJUT_App/server/tools/lembar-review-teks.js:724` | Isi lembar review internal, bukan pengenal | `klaim: 'Angka pendaftar berasal dari SNPMB untuk jalur, tahun, dan kampus yang disebut.',` |
| `LANJUT_App/server/tools/lembar-review-teks.js:794` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `{ task: 'LANJUT_079', awal: '**Rumpun favorit (Jalur Saya', nama: 'Pilihan rumpun favorit (1–3)', di: 'Jalur Saya /cek-p` |
| `LANJUT_App/server/tools/lembar-review-teks.js:801` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `di: 'Pilihan rumpun favorit (Pilih Mapel, terbuka sendiri; dan Jalur Saya) selama pilihan masih lebih dari 3.',` |
| `LANJUT_App/server/tools/lembar-review-teks.js:810` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `kelompok: 'Persiapan Ujian (Daftar Periksa) & Kesiapan Ujian (Jalur Saya)',` |
| `LANJUT_App/server/tools/lembar-review-teks.js:813` | Isi lembar review internal, bukan pengenal | `['**Kategori Daftar Periksa:**', 'Judul kategori "Persiapan Ujian"', 'Daftar Periksa, kategori keempat sesudah Jalur Pem` |
| `LANJUT_App/server/tools/lembar-review-teks.js:814` | Isi lembar review internal, bukan pengenal | `['**Catatan di bawah judul kategori:**', 'Catatan: saran, bukan syarat resmi', 'Daftar Periksa, di bawah judul kategori ` |
| `LANJUT_App/server/tools/lembar-review-teks.js:815` | Isi lembar review internal, bukan pengenal | `['**Butir tryout TKA', 'Butir "Ikut minimal satu tryout TKA"', 'Daftar Periksa, kategori Persiapan Ujian.', 'Kelas 12, j` |
| `LANJUT_App/server/tools/lembar-review-teks.js:816` | Isi lembar review internal, bukan pengenal | `['**Butir Level-In', 'Butir "Cek Level-In untuk mapel pilihan TKA-mu"', 'Daftar Periksa, kategori Persiapan Ujian.', 'Ke` |
| `LANJUT_App/server/tools/lembar-review-teks.js:817` | Isi lembar review internal, bukan pengenal | `['**Butir tryout SNBT', 'Butir "Ikut minimal satu tryout UTBK-SNBT"', 'Daftar Periksa, kategori Persiapan Ujian.', 'Kela` |
| `LANJUT_App/server/tools/lembar-review-teks.js:824` | Isi lembar review internal, bukan pengenal | `oleh: 'Kelas 12, jalur TKA.',` |
| `LANJUT_App/server/tools/lembar-review-teks.js:831` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Kesiapan Ujian — judul seksi & pertanyaan:**', 'Judul & pertanyaan Kesiapan Ujian', 'Jalur Saya /cek-posisi, sesudah` |
| `LANJUT_App/server/tools/lembar-review-teks.js:832` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Kesiapan Ujian — petunjuk:**', 'Petunjuk Kesiapan Ujian', 'Jalur Saya, di bawah pertanyaan.'],` |
| `LANJUT_App/server/tools/lembar-review-teks.js:833` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Kesiapan Ujian — pilihan:**', 'Empat pilihan kesiapan', 'Jalur Saya, pilihan berbentuk pil; ketukan langsung menyimp` |
| `LANJUT_App/server/tools/lembar-review-teks.js:834` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Kesiapan Ujian — saat menyimpan:**', 'Status "Menyimpan…"', 'Jalur Saya, di bawah pilihan selama menyimpan.'],` |
| `LANJUT_App/server/tools/lembar-review-teks.js:835` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Kesiapan Ujian — ringkasan:**', 'Ringkasan langkah Persiapan Ujian', 'Jalur Saya, kartu saran; hanya bila jalurnya p` |
| `LANJUT_App/server/tools/lembar-review-teks.js:836` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Saran — belum siap:**', 'Saran: belum siap', 'Jalur Saya, kartu saran.'],` |
| `LANJUT_App/server/tools/lembar-review-teks.js:837` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Saran — mulai siap:**', 'Saran: mulai siap', 'Jalur Saya, kartu saran.'],` |
| `LANJUT_App/server/tools/lembar-review-teks.js:838` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Saran — hampir/sudah siap, belum tryout:**', 'Saran: belum tryout', 'Jalur Saya, kartu saran.'],` |
| `LANJUT_App/server/tools/lembar-review-teks.js:839` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Saran — hampir/sudah siap, sudah tryout', 'Saran: belum simulasi/gladi', 'Jalur Saya, kartu saran (jalur TKA).'],` |
| `LANJUT_App/server/tools/lembar-review-teks.js:840` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Saran — hampir siap, langkah ujian beres:**', 'Saran: hampir siap, langkah beres', 'Jalur Saya, kartu saran.'],` |
| `LANJUT_App/server/tools/lembar-review-teks.js:841` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Saran — sudah siap, langkah ujian beres:**', 'Saran: sudah siap, langkah beres', 'Jalur Saya, kartu saran (tanpa tom` |
| `LANJUT_App/server/tools/lembar-review-teks.js:842` | Nama fitur "Jalur Saya" (layar /cek-posisi), bukan SNBP/SNBT | `['**Penafian Jalur Saya (diubah):**', 'Penafian Jalur Saya (diubah)', 'Jalur Saya, paling bawah.'],` |
| `LANJUT_App/server/tools/lembar-review-teks.js:855` | Isi lembar review internal, bukan pengenal | `{ task: 'LANJUT_075', awal: '**Kelas 10–11 — pengantar:**', nama: 'Pengantar kelas 10–11', di: 'Jalur dan Bidangmu, pali` |
| `LANJUT_App/server/tools/lembar-review-teks.js:856` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `{ task: 'LANJUT_075', awal: '**Kelas 10–11 — judul seksi jalur:**', nama: 'Judul seksi jalur masuk', di: 'Jalur dan Bida` |
| `LANJUT_App/server/tools/lembar-review-teks.js:858` | Isi lembar review internal, bukan pengenal | `['**Jalur SNBP:**', 'SNBP', 'Dinilai dari nilai rapor dan prestasi, tanpa tes tertulis; sekolah menentukan siapa yang bi` |
| `LANJUT_App/server/tools/lembar-review-teks.js:859` | Isi lembar review internal, bukan pengenal | `['**Jalur SNBT:**', 'SNBT', 'Dinilai dari hasil tes tertulis berbasis komputer.'],` |
| `LANJUT_App/server/tools/lembar-review-teks.js:860` | Isi lembar review internal, bukan pengenal | `['**Jalur seleksi mandiri:**', 'seleksi mandiri', 'Diadakan sendiri oleh tiap perguruan tinggi negeri; caranya berbeda d` |
| `LANJUT_App/server/tools/lembar-review-teks.js:865` | Frasa bahasa Indonesia di komentar atau instruksi AI, bukan pengenal | `di: 'Jalur dan Bidangmu, kartu jalur masuk (tanpa tanggal).',` |
| `LANJUT_App/server/tools/lembar-review-teks.js:869` | Isi lembar review internal, bukan pengenal | `{ task: 'LANJUT_075', awal: '**Judul seksi bidang:**', nama: 'Judul seksi bidang minat', di: 'Kenali Minatmu dan Jalur d` |
| `LANJUT_App/server/tools/lembar-review-teks.js:894` | Isi lembar review internal, bukan pengenal | `{ task: 'LANJUT_075', awal: '**Kelas 10–11 — pengganti daftar prodi:**', nama: 'Pengganti daftar prodi', di: 'Jalur dan ` |
| `LANJUT_App/server/tools/pulihkan-db.js:18` | Alamat URL atau berkas | `const jalurPenuh = path.resolve(process.cwd(), berkasCadangan);` |
| `LANJUT_App/server/tools/pulihkan-db.js:20` | Alamat URL atau berkas | `if (!fs.existsSync(jalurPenuh)) {` |
| `LANJUT_App/server/tools/pulihkan-db.js:21` | Alamat URL atau berkas | `console.error('[pulihkan-db] Galat: berkas '${jalurPenuh}' tidak ditemukan.');` |
| `LANJUT_App/server/tools/pulihkan-db.js:25` | Alamat URL atau berkas | `console.log('[pulihkan-db] Memulihkan basis data '${env.DB_NAME}' dari '${jalurPenuh}'...');` |
| `LANJUT_App/server/tools/pulihkan-db.js:39` | Alamat URL atau berkas | `const kontenSql = fs.readFileSync(jalurPenuh, 'utf-8');` |
| `MVP-PWA/alumni.html:115` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `<p><span class="lencana">Jalur SNBT (UTBK)</span></p>` |
| `MVP-PWA/assets/api.js:30` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `1. Jalur & nama medan. Ringkasan tugas menyebut '/api/daftar',` |
| `MVP-PWA/assets/api.js:142` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `function request(jalur, opsi) {` |
| `MVP-PWA/assets/api.js:154` | Alamat URL atau berkas | `return global.fetch(alamatDasar() + jalur, init).then(` |
| `MVP-PWA/assets/app.js:1079` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `var nilaiPil = [k.jenis].concat(jalurMasuk);` |
| `MVP-PWA/assets/levelin.js:896` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `pasangSaranBeranda() supaya bisa dipanggil baik dari jalur data lengkap` |
| `MVP-PWA/assets/levelin.js:897` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `(arsip+mapel berhasil dimuat) maupun jalur cadangan (data gagal dimuat). */` |
| `MVP-PWA/beranda.html:136` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `<p class="linimasa__judul" data-isi="judul">Sosialisasi jalur TKA/SNBP/SNBT di sekolah</p>` |
| `MVP-PWA/checklist.html:111` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `<!-- Kategori Jalur Pembiayaan: KIP Kuliah, beasiswa, keringanan UKT.` |
| `MVP-PWA/checklist.html:114` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `<h2 class="seksi__judul">Jalur Pembiayaan</h2>` |
| `MVP-PWA/index.html:7` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `<meta name="description" content="Navigasi jalur kuliah untuk anak SMK.">` |
| `MVP-PWA/khusus-smk.html:110` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `<p>Lampirkan sertifikat UKK dan PKL sebagai nilai tambah di jalur seleksi mandiri kampus.</p>` |
| `MVP-PWA/khusus-smk.html:140` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `<span class="baris__judul">Jalur vokasi Politeknik (D3/D4)</span>` |
| `MVP-PWA/khusus-smk.html:148` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `<p>Lulusan SMK punya opsi tambahan lewat jalur vokasi yang menghitung nilai mapel produktif kejuruan secara langsung.</p` |
| `MVP-PWA/manifest.webmanifest:2` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `"name": "LANJUT — Navigasi jalur kuliah untuk anak SMK",` |
| `MVP-PWA/pilih-mapel.html:72` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `jalur "belum tahu" tetap berguna, dan data hari ini baru` |
| `MVP-PWA/tools/test-app.js:40` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `jalur profil, jadi dikembalikan kosong. */` |
| `MVP-PWA/tools/test-levelin.js:314` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `jalur cadangan (prefiks + Date.now() + acak) yang SDD §3.4 memang` |
| `MVP-PWA/tools/test-levelin.js:501` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `Kalibrasi.catat()/.pangkas() — jalur PENYIMPANAN sungguhan yang` |
| `diagrams/activity.mmd:16` | Arti umum (alur kode, alamat, atau teks) bukan jalur masuk PTN | `A2["Pilih jalur eksplorasi minat"]` |

Teks konten di berkas data (bukan kunci), tidak diubah:

| Lokasi | Isi baris |
|---|---|
| `LANJUT_App/server/data-konten/checklist.json:2` | `"_catatan": "Entitas 'butir_daftar_periksa' (PRD/SDD §13): id, judul, urutan, berlaku_untuk_kelas, berlaku_untuk_jalur. ` |
| `LANJUT_App/server/data-konten/checklist.json:119` | `"nama": "Jalur Pembiayaan",` |
| `LANJUT_App/server/data-konten/khusus-smk.json:20` | `"apa_yang_bisa_dilakukan": "Lampirkan sertifikat UKK dan PKL sebagai nilai tambah di jalur seleksi mandiri kampus.",` |
| `LANJUT_App/server/data-konten/khusus-smk.json:33` | `"id": "jalur-vokasi",` |
| `LANJUT_App/server/data-konten/khusus-smk.json:34` | `"judul": "Jalur vokasi Politeknik (D3/D4)",` |
| `LANJUT_App/server/data-konten/khusus-smk.json:35` | `"apa_yang_beda": "Lulusan SMK punya opsi tambahan lewat jalur vokasi yang menghitung nilai mapel produktif kejuruan seca` |
| `LANJUT_App/server/data-konten/linimasa.json:2` | `"_catatan": "Entitas 'tahapan_linimasa' (PRD/SDD §13): id, judul, tanggal_mulai, tanggal_selesai, jalur, url_sumber, dip` |
| `LANJUT_App/server/data-konten/linimasa.json:14` | `"judul": "Sosialisasi jalur TKA/SNBP/SNBT di sekolah",` |
| `LANJUT_App/server/data-konten/profil-prodi.json:396` | `"_catatan_data": "Peminat nomor satu nasional SNBP 2026 juga (2.022 pendaftar, 95 diterima, keketatan sekitar 4,7%). Ang` |
| `MVP-PWA/data/checklist.json:2` | `"_catatan": "Entitas 'butir_daftar_periksa' (PRD/SDD §13): id, judul, urutan, berlaku_untuk_kelas, berlaku_untuk_jalur. ` |
| `MVP-PWA/data/checklist.json:119` | `"nama": "Jalur Pembiayaan",` |
| `MVP-PWA/data/khusus-smk.json:20` | `"apa_yang_bisa_dilakukan": "Lampirkan sertifikat UKK dan PKL sebagai nilai tambah di jalur seleksi mandiri kampus.",` |
| `MVP-PWA/data/khusus-smk.json:33` | `"id": "jalur-vokasi",` |
| `MVP-PWA/data/khusus-smk.json:34` | `"judul": "Jalur vokasi Politeknik (D3/D4)",` |
| `MVP-PWA/data/khusus-smk.json:35` | `"apa_yang_beda": "Lulusan SMK punya opsi tambahan lewat jalur vokasi yang menghitung nilai mapel produktif kejuruan seca` |
| `MVP-PWA/data/linimasa.json:2` | `"_catatan": "Entitas 'tahapan_linimasa' (PRD/SDD §13): id, judul, tanggal_mulai, tanggal_selesai, jalur, url_sumber, dip` |
| `MVP-PWA/data/linimasa.json:14` | `"judul": "Sosialisasi jalur TKA/SNBP/SNBT di sekolah",` |
| `MVP-PWA/data/profil-prodi.json:396` | `"_catatan_data": "Peminat nomor satu nasional SNBP 2026 juga (2.022 pendaftar, 95 diterima, keketatan sekitar 4,7%). Ang` |

## F. Situs landing (per berkas, tidak diubah)

Di kode situs, `jalur` berarti alamat halaman. Di `src/konten/` kata ini muncul sebagai teks pemasaran dan glosarium.

| Berkas | Baris |
|---|---|
| `landing/README.md` | 4 |
| `landing/index.html` | 1 |
| `landing/scripts/bangun.mjs` | 9 |
| `landing/scripts/hitung-apk.mjs` | 1 |
| `landing/src/data/kebijakan-privasi.json` | 3 |
| `landing/src/entri/klien.tsx` | 3 |
| `landing/src/entri/server.tsx` | 4 |
| `landing/src/halaman/Ai.tsx` | 2 |
| `landing/src/halaman/Artikel.tsx` | 6 |
| `landing/src/halaman/Beranda.tsx` | 2 |
| `landing/src/halaman/DetailRilis.tsx` | 3 |
| `landing/src/halaman/Docs.tsx` | 4 |
| `landing/src/halaman/Glosarium.tsx` | 2 |
| `landing/src/halaman/KebijakanPrivasi.tsx` | 2 |
| `landing/src/halaman/Privasi.tsx` | 2 |
| `landing/src/halaman/TidakDitemukan.tsx` | 3 |
| `landing/src/halaman/Unduh.tsx` | 2 |
| `landing/src/halaman/beranda/Fitur.tsx` | 1 |
| `landing/src/halaman/jenis.ts` | 2 |
| `landing/src/komponen/Ikon.tsx` | 3 |
| `landing/src/komponen/Kerangka.tsx` | 3 |
| `landing/src/komponen/NavDocs.tsx` | 5 |
| `landing/src/komponen/NavUtama.tsx` | 6 |
| `landing/src/komponen/Situs.tsx` | 4 |
| `landing/src/komponen/TeksKaya.tsx` | 1 |
| `landing/src/konten/beranda.ts` | 7 |
| `landing/src/konten/docs.ts` | 21 |
| `landing/src/konten/fitur.ts` | 10 |
| `landing/src/konten/glosarium.ts` | 6 |
| `landing/src/lib/rilis.ts` | 1 |
| `landing/src/lib/situs.ts` | 12 |
| `landing/src/rute.ts` | 14 |
| `landing/tests/landing.test.mjs` | 38 |
| `landing/vite.config.ts` | 10 |

## G. Dokumen dan mockup (per berkas, tidak diubah)

Dokumen ini catatan sejarah atau spesifikasi yang sudah lewat. Sebagian menyebut nama lama seperti `berlaku_untuk_jalur`; itu benar untuk waktu ditulisnya.

| Berkas | Baris |
|---|---|
| `LANJUT UI mockups/LANJUT App Mockup.dc.html` | 7 |
| `LANJUT UI mockups/_ds/lanjut-design-system-e1bf291f-8320-43d9-bc01-3623cd429142/_ds_bundle.js` | 15 |
| `LANJUT UI mockups/_ds/lanjut-design-system-e1bf291f-8320-43d9-bc01-3623cd429142/_ds_manifest.json` | 1 |
| `LANJUT UI mockups/uploads/uploads-1787113237885-ecu9.md` | 7 |
| `LandingPage/index.html` | 3 |
| `LandingPage/lanjut-landing-page-mockup/project/LANJUT Landing.dc.html` | 4 |
| `LandingPage/lanjut-landing-page-mockup/project/_ds/lanjut-design-system-e1bf291f-8320-43d9-bc01-3623cd429142/_ds_bundle.js` | 15 |
| `LandingPage/lanjut-landing-page-mockup/project/_ds/lanjut-design-system-e1bf291f-8320-43d9-bc01-3623cd429142/_ds_manifest.json` | 1 |
| `LandingPage/prd-sdd-lanjut.md` | 7 |
| `LandingPage/salinan-teks-lanjut.md` | 7 |
| `MVP-PWA/README.md` | 1 |
| `docs/DESIGN-landpage.md` | 13 |
| `docs/DRAF-Konten-Jenjang-Saya-SMP-dan-10-11.md` | 1 |
| `docs/F10-data-struktur-ringkas.md` | 5 |
| `docs/INSTRUKSI-QA-E2E-TESTING.md` | 1 |
| `docs/LANJUT_001_Expo-Login-Register.md` | 1 |
| `docs/LANJUT_003_Samakan-Tampilan-Isi-MVP.md` | 1 |
| `docs/LANJUT_004_Jalur-Saya-Profil.md` | 6 |
| `docs/LANJUT_005_Cek-Posisi-Gue.md` | 5 |
| `docs/LANJUT_006_Checklist-Personal-Prodi.md` | 8 |
| `docs/LANJUT_007_Backend-Filter-Rumpun-Checklist.md` | 3 |
| `docs/LANJUT_009_Audit-Pilih-Mapel-Decision-Support.md` | 1 |
| `docs/LANJUT_012_Spek-AI-Navigator-V2.md` | 1 |
| `docs/LANJUT_012a_Usulan-Keputusan-AI.md` | 2 |
| `docs/LANJUT_013_Cek-Posisi-Tenggat-Rumpun.md` | 2 |
| `docs/LANJUT_025_Kalimat-Data-Pribadi-Form-Daftar.md` | 1 |
| `docs/LANJUT_028_Kerangka-Studi-Kasus-Portofolio.md` | 4 |
| `docs/LANJUT_029_Audit-Kesenjangan-Fitur.md` | 5 |
| `docs/LANJUT_032_UI-Chat-Explorer-Stub.md` | 1 |
| `docs/LANJUT_035_Dukungan-Jenjang-SMP.md` | 1 |
| `docs/LANJUT_036_Wajib-Isi-Kelas.md` | 4 |
| `docs/LANJUT_037_Redesign-Khusus-SMK.md` | 1 |
| `docs/LANJUT_044_Cek-Label-Perkiraan-F10.md` | 2 |
| `docs/LANJUT_047_Kerangka-Persetujuan-dan-Kebijakan-Privasi.md` | 2 |
| `docs/LANJUT_048_Layar-Terima-Kebijakan-Akun-Lama.md` | 3 |
| `docs/LANJUT_050_Perbaiki-Kerentanan-npm-audit.md` | 2 |
| `docs/LANJUT_052_Audit-LANJUT_051-terhadap-Spek-AI.md` | 2 |
| `docs/LANJUT_053_Pengamanan-AI-Keselamatan-dan-Privasi.md` | 1 |
| `docs/LANJUT_054_Skenario-Uji-AI.md` | 3 |
| `docs/LANJUT_055_AI-Arsip-Web-dan-Sitasi.md` | 3 |
| `docs/LANJUT_058_Layar-Level-In-dan-Keyakinan-F7.md` | 1 |
| `docs/LANJUT_060_Celah-Keselamatan-Sisa-dan-Pemantauan-Pilot.md` | 1 |
| `docs/LANJUT_061_Persiapan-Deploy-Produksi.md` | 3 |
| `docs/LANJUT_062_Build-Web-Produksi-dan-Perbaikan-Pasca-061.md` | 2 |
| `docs/LANJUT_070_Perbaikan-Progres-Butir-Pribadi.md` | 5 |
| `docs/LANJUT_074_Beranda-Hero-Navigasi-Ngobrol.md` | 6 |
| `docs/LANJUT_075_Eksplorasi-Kampus-Semua-Jenjang.md` | 9 |
| `docs/LANJUT_077b_Saklar-AI-dan-Sisa-Teks-Kelas-12.md` | 6 |
| `docs/LANJUT_079_Pilih-Mapel-Prodi-dan-Mapel-Saya.md` | 1 |
| `docs/LANJUT_079b_Perbaikan-Mapel-Pilihan.md` | 1 |
| `docs/LANJUT_080_Persiapan-Uji-Rilis.md` | 1 |
| `docs/LANJUT_081_APK-Demo-Lokal-dan-Uji-HP.md` | 1 |
| `docs/LANJUT_083f_Perbaikan-Landing.md` | 1 |
| `docs/PRD-landpage.md` | 9 |
| `docs/SDD-Backend-Foundation.md` | 12 |
| `docs/SDD-F10-eksplorasi-tujuan.md` | 86 |
| `docs/SDD-LevelIn.md` | 10 |
| `docs/alur-data-ai-materi.md` | 2 |
| `docs/audit-051-vs-spek.md` | 3 |
| `docs/briefing-antigravity-tester.md` | 1 |
| `docs/deploy-produksi.md` | 9 |
| `docs/deploy-web.md` | 2 |
| `docs/design.md` | 2 |
| `docs/eksplorasi-tujuan-instruksi.md` | 5 |
| `docs/instruksi-levelin-js.md` | 1 |
| `docs/kebijakan-privasi-DRAF.md` | 10 |
| `docs/kebijakan-v2-klaim-vs-kode.md` | 4 |
| `docs/kesiapan-rilis-uji.md` | 6 |
| `docs/lembar-review-draf-teks.md` | 91 |
| `docs/pengujian-backend-sistem-lanjut.md` | 2 |
| `docs/peta-kelengkapan-2026-10-09.md` | 3 |
| `docs/prd-sdd-lanjut.md` | 8 |
| `docs/rancangan-arsip-latihan-banksoal.md` | 4 |
| `docs/riset-top-prodi-lengkap.md` | 6 |
| `docs/salinan-teks-lanjut.md` | 44 |
| `docs/skenario-ai.md` | 10 |
| `docs/surat-persetujuan-ortu-wali-DRAF.md` | 1 |
| `docs/todo-verifikasi-v1.md` | 2 |
| `docs/uji-rilis/inventaris-080.md` | 2 |
| `docs/uji-rilis/rencana-uji-rilis.md` | 8 |
| `docs/uji-rilis/skenario-demo.md` | 10 |
| `docs/uji-rilis/uji-chatbot-ai-2026-10-15.md` | 5 |
| `docs/verifikasi/laporan-status-verifikasi.md` | 8 |
| `docs/verifikasi/lembar-review-konten.md` | 48 |
