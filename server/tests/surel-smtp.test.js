// LANJUT_083 — klien SMTP bawaan (src/util/surel.js) diuji terhadap server SMTP
// tiruan di 127.0.0.1. Tidak ada email sungguhan: penjaga di surel.js menolak host
// selain localhost selama `node --test`, sebelum koneksi dibuka.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const net = require('net');

const env = require('../src/config/env');
const { kirimSurel, GalatSurel } = require('../src/util/surel');
const pengirimOtp = require('../src/modul/auth/pengirimOtp');

const SANDI_UJI = 'sandi-smtp-uji-083';

/** Server SMTP tiruan: mencatat perintah dan pesan, tidak meneruskan apa pun. */
function serverTiruan({ auth = 'PLAIN LOGIN', tolakRcpt = false } = {}) {
  const perintah = [];
  const pesan = [];
  const srv = net.createServer((s) => {
    let sisa = '';
    let dalamData = false;
    let data = '';
    let tahapLogin = null;
    s.write('220 tiruan ESMTP\r\n');
    s.on('data', (d) => {
      sisa += d.toString('utf8');
      let i;
      while ((i = sisa.indexOf('\r\n')) !== -1) {
        const baris = sisa.slice(0, i);
        sisa = sisa.slice(i + 2);
        if (dalamData) {
          if (baris === '.') {
            dalamData = false;
            pesan.push(data);
            data = '';
            s.write('250 diterima\r\n');
          } else data += `${baris}\r\n`;
          continue;
        }
        perintah.push(baris);
        const besar = baris.toUpperCase();
        if (tahapLogin === 'user') {
          tahapLogin = 'pass';
          s.write('334 UGFzc3dvcmQ6\r\n');
        } else if (tahapLogin === 'pass') {
          tahapLogin = null;
          s.write('235 ok\r\n');
        } else if (besar.startsWith('EHLO')) s.write(`250-tiruan\r\n250-AUTH ${auth}\r\n250 8BITMIME\r\n`);
        else if (besar.startsWith('AUTH PLAIN ')) s.write('235 ok\r\n');
        else if (besar === 'AUTH LOGIN') {
          tahapLogin = 'user';
          s.write('334 VXNlcm5hbWU6\r\n');
        } else if (besar.startsWith('MAIL FROM:')) s.write('250 ok\r\n');
        else if (besar.startsWith('RCPT TO:')) s.write(tolakRcpt ? '550 tidak dikenal\r\n' : '250 ok\r\n');
        else if (besar === 'DATA') {
          dalamData = true;
          s.write('354 lanjut\r\n');
        } else if (besar === 'QUIT') {
          s.write('221 sampai jumpa\r\n');
          s.end();
        } else s.write('500 tidak dikenal\r\n');
      }
    });
    s.on('error', () => {});
  });
  return new Promise((resolve) => {
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port, perintah, pesan }));
  });
}

function badanTeks(mentah) {
  const [, badan] = mentah.split('\r\n\r\n');
  return Buffer.from(badan.replace(/\r\n/g, ''), 'base64').toString('utf8');
}

let tiruan;
before(async () => {
  tiruan = await serverTiruan();
});
after(() => new Promise((r) => tiruan.srv.close(r)));

test('mengirim lewat SMTP tiruan: EHLO, AUTH PLAIN, MAIL FROM, RCPT TO, DATA, pesan utuh', async () => {
  await kirimSurel(
    { ke: 'siswa@contoh.test', subjek: 'Kode masuk LANJUT', teks: 'Baris satu\n.titik di awal\nBaris tiga' },
    { host: '127.0.0.1', port: tiruan.port, secure: false, user: 'pengirim', password: SANDI_UJI, from: 'LANJUT <noreply@contoh.test>' }
  );
  const terakhir = tiruan.pesan[tiruan.pesan.length - 1];
  assert.ok(tiruan.perintah.some((p) => p.startsWith('EHLO ')));
  const auth = tiruan.perintah.find((p) => p.startsWith('AUTH PLAIN '));
  assert.equal(Buffer.from(auth.slice(11), 'base64').toString(), `\u0000pengirim\u0000${SANDI_UJI}`);
  assert.ok(tiruan.perintah.includes('MAIL FROM:<noreply@contoh.test>'));
  assert.ok(tiruan.perintah.includes('RCPT TO:<siswa@contoh.test>'));
  assert.match(terakhir, /^From: LANJUT <noreply@contoh\.test>\r\n/m);
  assert.match(terakhir, /^To: <siswa@contoh\.test>\r\n/m);
  assert.match(terakhir, /^Subject: Kode masuk LANJUT\r\n/m);
  assert.equal(badanTeks(terakhir), 'Baris satu\r\n.titik di awal\r\nBaris tiga');
});

test('server yang hanya menawarkan AUTH LOGIN → memakai AUTH LOGIN', async () => {
  const srvLogin = await serverTiruan({ auth: 'LOGIN' });
  try {
    await kirimSurel(
      { ke: 'siswa@contoh.test', subjek: 'Uji', teks: 'Halo' },
      { host: '127.0.0.1', port: srvLogin.port, secure: false, user: 'pengirim', password: SANDI_UJI, from: 'noreply@contoh.test' }
    );
    assert.ok(srvLogin.perintah.includes('AUTH LOGIN'));
    assert.equal(srvLogin.pesan.length, 1);
  } finally {
    await new Promise((r) => srvLogin.srv.close(r));
  }
});

test('pengirimOtp sungguhan (bukan tiruan) mengirim teks kode lewat SMTP; log tanpa kode & sandi', async () => {
  const simpan = { ...env };
  Object.assign(env, {
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: tiruan.port,
    SMTP_SECURE: false,
    SMTP_USER: 'pengirim',
    SMTP_PASSWORD: SANDI_UJI,
    SMTP_FROM: 'LANJUT <noreply@contoh.test>',
  });
  const tercatat = [];
  const asli = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  for (const n of Object.keys(asli)) console[n] = (...a) => tercatat.push(a.join(' '));
  try {
    assert.equal(pengirimOtp.siap(), true);
    await pengirimOtp.kirim('siswa@contoh.test', '482913');
  } finally {
    Object.assign(console, asli);
    Object.assign(env, simpan);
  }
  const teks = badanTeks(tiruan.pesan[tiruan.pesan.length - 1]);
  assert.ok(teks.includes('482913'));
  assert.ok(teks.includes('berlaku 5 menit'));
  const log = tercatat.join('\n');
  assert.equal(log.includes('482913'), false);
  assert.equal(log.includes(SANDI_UJI), false);
});

test('penjaga tes: host selain localhost ditolak SEBELUM koneksi dibuka (tidak ada email sungguhan)', async () => {
  const connectAsli = net.connect;
  let dipanggil = 0;
  net.connect = (...a) => {
    dipanggil += 1;
    return connectAsli(...a);
  };
  try {
    await assert.rejects(
      kirimSurel(
        { ke: 'siswa@contoh.test', subjek: 'Uji', teks: 'Halo' },
        { host: 'smtp.contoh.invalid', port: 587, secure: false, user: 'x', password: 'y', from: 'noreply@contoh.test' }
      ),
      (err) => err instanceof GalatSurel && /diblokir saat tes/.test(err.message)
    );
  } finally {
    net.connect = connectAsli;
  }
  assert.equal(dipanggil, 0);
  // .env tes tidak berisi SMTP: fitur kode email mati kecuali tes memasang tiruan.
  assert.equal(pengirimOtp.siap(), Boolean(env.SMTP_HOST && env.SMTP_FROM));
});

test('baris baru di alamat/subjek ditolak (tidak bisa menyisipkan header seperti Bcc)', async () => {
  const konfig = { host: '127.0.0.1', port: tiruan.port, secure: false, from: 'noreply@contoh.test' };
  const jumlahSebelum = tiruan.pesan.length;
  await assert.rejects(kirimSurel({ ke: 'a@contoh.test\r\nBcc: b@contoh.test', subjek: 'x', teks: 'y' }, konfig), GalatSurel);
  await assert.rejects(kirimSurel({ ke: 'a@contoh.test', subjek: 'x\r\nBcc: b@contoh.test', teks: 'y' }, konfig), GalatSurel);
  assert.equal(tiruan.pesan.length, jumlahSebelum);
});

test('server menolak penerima → GalatSurel berisi kode SMTP saja, tanpa alamat', async () => {
  const srvTolak = await serverTiruan({ tolakRcpt: true });
  try {
    await assert.rejects(
      kirimSurel(
        { ke: 'rahasia@contoh.test', subjek: 'Uji', teks: 'Halo' },
        { host: '127.0.0.1', port: srvTolak.port, secure: false, from: 'noreply@contoh.test' }
      ),
      (err) => err instanceof GalatSurel && err.kodeSmtp === 550 && !err.message.includes('rahasia')
    );
  } finally {
    await new Promise((r) => srvTolak.srv.close(r));
  }
});
