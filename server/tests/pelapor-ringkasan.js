// Pelapor `npm test`: keluaran spec bawaan Node, ditambah ringkasan di akhir yang menampilkan
// jumlah tes yang dilewati beserta alasannya, dan jumlah tes yang gagal karena path luar repo
// hilang (LANJUT_003 seri v2). Tidak mengubah hasil maupun kode keluar tes.

const path = require('path');
const { Transform } = require('stream');
const { spec: Spec } = require('node:test/reporters');
const { PENANDA_HILANG } = require('./luar-repo');

const pesanGalat = (galat) => String(galat?.cause?.message ?? galat?.cause ?? galat?.message ?? '');

function susunRingkasan(dilewati, jumlahPathHilang) {
  const kelompok = new Map();
  for (const t of dilewati) {
    if (!kelompok.has(t.alasan)) kelompok.set(t.alasan, []);
    kelompok.get(t.alasan).push(t);
  }
  const baris = ['', '--- Ringkasan tes dilewati ---', `Dilewati: ${dilewati.length}`];
  for (const [alasan, tes] of kelompok) {
    baris.push(`  ${tes.length} × ${alasan}`);
    for (const t of tes) baris.push(`      ${t.berkas}: ${t.nama}`);
  }
  baris.push(`Gagal karena path luar repo hilang: ${jumlahPathHilang}`, '');
  return baris.join('\n');
}

class PelaporRingkasan extends Transform {
  constructor() {
    super({ writableObjectMode: true });
    this.spec = new Spec();
    this.spec.on('data', (potongan) => this.push(potongan));
    this.dilewati = [];
    this.jumlahPathHilang = 0;
  }

  _transform(peristiwa, _pengodean, selesai) {
    const data = peristiwa.data;
    if (data?.details?.type !== 'suite') {
      if (peristiwa.type === 'test:pass' && data.skip !== undefined) {
        const teks = typeof data.skip === 'string' ? data.skip : 'tanpa alasan tertulis';
        // Tes berbungkus luar-repo.js menyebut berkas aslinya di akhir alasan.
        const [, alasan, berkas] = /^(.*) \[([^\]]+\.test\.js)\]$/.exec(teks) ?? [null, teks, path.basename(data.file ?? '')];
        this.dilewati.push({ berkas, nama: data.name, alasan });
      }
      if (peristiwa.type === 'test:fail' && pesanGalat(data.details?.error).includes(PENANDA_HILANG)) {
        this.jumlahPathHilang += 1;
      }
    }
    this.spec.write(peristiwa, selesai);
  }

  _flush(selesai) {
    this.spec.once('end', () => {
      this.push(susunRingkasan(this.dilewati, this.jumlahPathHilang));
      selesai();
    });
    this.spec.end();
  }
}

module.exports = new PelaporRingkasan();
