// Penyamaran data pribadi sebelum dikirim ke penyedia AI (LANJUT_053).
// Diganti dengan "[disamarkan]": alamat email, deretan 16 angka mirip NIK
// (boleh dipisah spasi/titik/strip), dan nomor telepon Indonesia (+62, 62,
// atau 0 di depan; ponsel maupun telepon rumah). Nomor 10 angka berawalan 0
// (mis. NISN) ikut tersamarkan oleh pola telepon. Sejak LANJUT_078 juga
// tanggal lahir, alamat, dan nama sekolah bernomor. Isi yang disamarkan tidak
// pernah dicatat.

const PENGGANTI = '[disamarkan]';

// LANJUT_078: tanggal lahir, alamat, dan nama sekolah juga disamarkan (ringkasan
// konteks Ngobrol dari modul siswa, juga pesan siswa). Setiap pola butuh kata
// penanda (lahir, alamat, Jl., RT/RW, SD/SMP/SMA/SMK/MTs/MA + nomor + nama), jadi
// angka biasa ("kelas 12", "tahun 2026", "kode pos 40115") tidak tersentuh.
const BULAN = '(?:\\d{1,2}|jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|agu(?:stus)?|agt|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|des(?:ember)?)';
const TANGGAL = `\\d{1,2}[\\s./-]+${BULAN}[\\s./-]+\\d{2,4}`;

const POLA = [
  // email
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
  // 16 angka mirip NIK, boleh dengan pemisah
  /(?<!\d)\d(?:[\s.-]?\d){15}(?!\d)/g,
  // telepon Indonesia: +62 / 62 / 0, lalu 8–12 angka lagi, boleh dengan pemisah atau kurung
  /(?<![\d+(])\(?(?:\+\s?62|62|0)(?:[\s.-]?\(?\d\)?){8,12}(?!\d)/g,
  // tempat, tanggal lahir (TTL) — sisa baris, paling banyak 60 huruf
  /\b(?:tempat(?:,|\s+dan)?\s+tanggal\s+lahir|ttl)\s*[:-]?\s*[^\n]{1,60}/gi,
  // tanggal lahir: "tanggal lahir: 12 Maret 2010", "lahir 12-03-2010", "lahir tahun 2010"
  new RegExp(
    `\\b(?:tanggal|tgl\\.?)\\s+lahir\\w*\\s*[:,-]?\\s*${TANGGAL}|\\blahir(?:ku|nya)?(?:\\s+(?:pada|tanggal|tgl\\.?))?\\s*[:,-]?\\s*${TANGGAL}|\\blahir(?:ku|nya)?\\s+(?:pada\\s+)?tahun\\s+\\d{4}`,
    'gi'
  ),
  // alamat: "alamat: …" / "alamat rumah - …" (sisa baris), jalan bernama ("Jl. Mawar No. 5"), RT/RW
  /\balamat(?:\s+(?:rumah|lengkap|saya|aku))?\s*[:-]\s*[^\n]{3,80}/gi,
  /\b(?:Jl|Jln|JL|JLN)\.?\s+[A-Z][A-Za-z'.-]*(?:\s+(?!(?:No|NO)\b)[A-Z][A-Za-z'.-]*){0,3}(?:\s+(?:No|NO|no)\.?\s*\d+[A-Za-z]?)?/g,
  /\bJalan\s+[A-Z][a-z'.-]+(?:\s+(?!No\b)[A-Z][a-z'.-]+){0,3}\s+(?:No|no)\.?\s*\d+[A-Za-z]?/g,
  /\bRT\s*\.?\s*\d{1,3}\s*\/?\s*RW\s*\.?\s*\d{1,3}/gi,
  // nama sekolah bernomor: "SMP Negeri 5 Bandung", "SMAN 3 Contoh", "SD 12 Kota Baru"
  /\b(?:SD|SMP|SMA|SMK|MTs|MA|MI)N?\s+(?:Negeri\s+|Swasta\s+)?\d{1,3}\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?/g,
];

/** { teks, disamarkan } — `disamarkan` = ada yang diganti. */
function samarkan(teks) {
  let hasil = String(teks);
  for (const pola of POLA) hasil = hasil.replace(pola, PENGGANTI);
  return { teks: hasil, disamarkan: hasil !== String(teks) };
}

module.exports = { samarkan, PENGGANTI };
