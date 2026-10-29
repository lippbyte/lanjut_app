import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as authApi from '../../../api/auth';
import type { DataDaftar } from '../../../api/auth';
import { ApiError } from '../../../api/client';
import { useAuth } from '../../../hooks/useAuth';
import { Tombol } from '../../ui';
import { RINGKASAN_KEBIJAKAN, VERSI_KEBIJAKAN } from '../../../lib/kebijakanPrivasi';
import { color, font, radius, spacing, teks } from '../../../theme/tokens';
import { IsiKebijakan } from '../KebijakanPrivasiScreen';
import {
  JENIS_SEKOLAH_MENENGAH,
  KELAS_OPSI,
  LABEL_JENIS_SEKOLAH,
  tanyaJenisSekolah,
  type JenisSekolahMenengah,
  type Kelas,
} from '../../../lib/jenjang';
import {
  AuthLayout,
  BELUM,
  DaftarOpsi,
  Field,
  Input,
  Keterangan,
  KotakCentang,
  OpsiPil,
  PesanGalat,
  PilihProdi,
  TautanBawah,
  TombolUtama,
  authStyles,
} from './AuthUI';

// Aturan disalin dari server/src/modul/auth/auth.skema.js supaya kesalahan
// umum tertangkap sebelum dikirim; server tetap sumber kebenaran.
const NAMA_PENGGUNA_REGEX = /^[a-z0-9._]{3,32}$/;

// Disetujui Khalifa 28 Sep 2026 (salinan-teks-lanjut.md §4.10). Pakai persis —
// jangan menambah janji ("tidak dibagikan", "aman") atau klaim hukum. Tinjau
// ulang bila ada fitur AI, analitik, atau perubahan penyimpanan data.
const KALIMAT_DATA_PRIBADI =
  'Kami menyimpan nama pengguna, nama tampilan, email (kalau kamu isi), kelas, prodi impian, dan centang Daftar Periksamu untuk menjalankan LANJUT, yaitu menampilkan jalur dan kemajuanmu.';

// Salinan teks §4.13 (LANJUT_047) — DRAF belum disetujui Khalifa. Isi ringkasan
// & kebijakan lengkap dari lib/kebijakan-privasi.json.
const JUDUL_KEBIJAKAN = 'Kebijakan privasi (ringkas)';
const TAUTAN_KEBIJAKAN = 'Baca kebijakan privasi lengkap';
const LABEL_SUDAH_BACA = 'Saya sudah membaca kebijakan privasi LANJUT.';
const PETUNJUK_BELUM_CENTANG = 'Centang kotak kebijakan privasi di atas dulu supaya bisa mendaftar.';

// LANJUT_083c — daftar dengan email dalam dua langkah. DRAF (salinan teks, blok LANJUT_083c),
// belum disetujui PM.
const PETUNJUK_EMAIL = 'Kalau diisi, kami kirim kode ke email itu untuk memastikan email itu milikmu.';
const DAFTAR_EMAIL_TIDAK_TERSEDIA = 'Daftar dengan email belum bisa dipakai sekarang. Kosongkan email untuk daftar tanpa email.';
const KODE_BARU_TERKIRIM = 'Kode baru sudah dikirim. Kode sebelumnya tidak berlaku lagi.';

function pesanKirimKode(err: unknown): string {
  return err instanceof ApiError && err.kode === 'OTP_TIDAK_TERSEDIA' ? DAFTAR_EMAIL_TIDAK_TERSEDIA : authApi.pesanUntuk(err);
}

// Medan & salinan teks mengikuti MVP-PWA/daftar.html: nama pengguna, email
// (opsional), kata sandi, prodi impian (wajib, "belum" jawaban sah).
// Kelas (LANJUT_035) wajib di form ini: menentukan apakah Linimasa, Daftar
// Periksa, dan Jalur Saya (/cek-posisi) tampil (kelas 12) atau placeholder (7–11).
export function RegisterScreen() {
  const router = useRouter();
  const { register, registerKode, loading, error, medan } = useAuth();
  // LANJUT_083c: dengan email → 'kode' (akun dibuat setelah kode benar); tanpa email → langsung.
  const [tahap, setTahap] = useState<'isi' | 'kode'>('isi');
  const [dataTertunda, setDataTertunda] = useState<(DataDaftar & { email: string }) | null>(null);
  const [kode, setKode] = useState('');
  const [mengirimKode, setMengirimKode] = useState(false);
  const [galatKirim, setGalatKirim] = useState<string | null>(null);
  const [medanKirim, setMedanKirim] = useState<Record<string, string>>({});
  const [infoKode, setInfoKode] = useState<string | null>(null);
  const [galatKode, setGalatKode] = useState<string | null>(null);

  const [namaPengguna, setNamaPengguna] = useState('');
  const [email, setEmail] = useState('');
  const [kataSandi, setKataSandi] = useState('');
  const [kelas, setKelas] = useState<Kelas | null>(null);
  // LANJUT_038: hanya ditanya & dikirim untuk kelas 10–12; kelas 7–9 → SMP di server.
  const [jenis, setJenis] = useState<JenisSekolahMenengah | null>(null);
  const tanyaJenis = tanyaJenisSekolah(kelas);
  const [prodi, setProdi] = useState<string | null>(null);
  const [galatLokal, setGalatLokal] = useState<Record<string, string>>({});
  // LANJUT_047: Daftar baru aktif setelah kebijakan privasi dicentang.
  const [sudahBaca, setSudahBaca] = useState(false);
  const [bukaKebijakan, setBukaKebijakan] = useState(false);

  const kirim = () => {
    if (!sudahBaca) return;
    const nama = namaPengguna.trim().toLowerCase();
    const cek: Record<string, string> = {};
    if (!NAMA_PENGGUNA_REGEX.test(nama)) {
      cek.nama_pengguna = '3–32 karakter, hanya huruf kecil, angka, titik, dan garis bawah.';
    }
    if (kataSandi.length < 8) cek.kata_sandi = 'Kata sandi minimal 8 karakter.';
    if (!kelas) cek.kelas = 'Pilih kelasmu.';
    if (tanyaJenis && !jenis) cek.jenis_sekolah = 'Pilih jenis sekolahmu.';
    if (!prodi) cek.prodi_impian = 'Pilih prodi, atau "Belum, aku belum tahu".';
    setGalatLokal(cek);
    if (Object.keys(cek).length || !kelas) return;

    const data: DataDaftar = { nama_pengguna: nama, kata_sandi: kataSandi, kelas, versi_kebijakan: VERSI_KEBIJAKAN };
    if (tanyaJenis && jenis) data.jenis_sekolah = jenis;
    if (prodi && prodi !== BELUM) data.prodi_impian = prodi;
    const emailBersih = email.trim();
    if (emailBersih) kirimKode({ ...data, email: emailBersih }, false);
    else register(data);
  };

  // Kirim (atau kirim ulang) kode ke email. Akun belum dibuat di langkah ini.
  const kirimKode = async (data: DataDaftar & { email: string }, ulang: boolean) => {
    setMengirimKode(true);
    setGalatKirim(null);
    setMedanKirim({});
    setInfoKode(null);
    try {
      await authApi.kirimKodeDaftar(data);
      setDataTertunda(data);
      setKode('');
      setGalatKode(null);
      setTahap('kode');
      if (ulang) setInfoKode(KODE_BARU_TERKIRIM);
    } catch (err) {
      setGalatKirim(pesanKirimKode(err));
      if (err instanceof ApiError && err.medan) setMedanKirim(err.medan);
    } finally {
      setMengirimKode(false);
    }
  };

  const buatAkun = () => {
    if (!dataTertunda) return;
    if (!/^\d{6}$/.test(kode.trim())) {
      setGalatKode('Kode terdiri dari 6 angka.');
      return;
    }
    setGalatKode(null);
    setInfoKode(null);
    registerKode(dataTertunda.email, kode.trim());
  };

  const galat = (kunci: string) => galatLokal[kunci] ?? medanKirim[kunci] ?? medan[kunci];

  if (tahap === 'kode' && dataTertunda) {
    return (
      <AuthLayout judul="Buat akun" pengantar="Satu langkah lagi: masukkan kode dari email.">
        <View style={authStyles.form}>
          <Keterangan>{`Kami kirim kode ke ${dataTertunda.email}. Masukkan kodenya untuk membuat akun. Kode berlaku 5 menit.`}</Keterangan>
          <Field label="Kode dari email" galat={medan.kode ? 'Periksa lagi kodenya.' : undefined}>
            <Input
              value={kode}
              onChangeText={(t) => setKode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 angka"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={buatAkun}
            />
          </Field>
          {/* Setelah kirim ulang berhasil, galat kode lama tidak ditampilkan lagi. */}
          <PesanGalat teks={galatKode ?? galatKirim ?? (infoKode ? null : error)} />
          {infoKode ? <Keterangan>{infoKode}</Keterangan> : null}
          <TombolUtama label="Buat akun" labelProses="Membuat akun…" proses={loading} onPress={buatAkun} />
          <Tombol
            label={mengirimKode ? 'Mengirim…' : 'Kirim ulang kode'}
            varian="garis"
            penuh
            proses={mengirimKode}
            onPress={() => kirimKode(dataTertunda, true)}
          />
          <TautanBawah teks="Salah email atau data?" tautan="Ubah data" onPress={() => setTahap('isi')} />
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout judul="Buat akun" pengantar="Simpan kemajuanmu supaya tidak hilang saat ganti HP.">
      <View style={authStyles.form}>
        <Field
          label="Nama pengguna"
          hint="3–32 karakter: huruf, angka, titik, atau garis bawah."
          galat={galat('nama_pengguna')}
        >
          <Input
            value={namaPengguna}
            onChangeText={setNamaPengguna}
            placeholder="mis. budi.smk12"
            autoComplete="username"
            textContentType="username"
            maxLength={32}
          />
        </Field>
        <Field label="Email" labelTambahan="(boleh dikosongkan)" hint={PETUNJUK_EMAIL} galat={galat('email')}>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="nama@contoh.com"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
        </Field>
        <Field label="Kata sandi" hint="Minimal 8 karakter." galat={galat('kata_sandi')}>
          <Input
            value={kataSandi}
            onChangeText={setKataSandi}
            placeholder="Minimal 8 karakter"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
        </Field>
        <Field label="Kelas" hint="SMP kelas 7–9, SMA/SMK kelas 10–12." galat={galat('kelas')}>
          <DaftarOpsi>
            {KELAS_OPSI.map((k) => (
              <OpsiPil key={k} label={`Kelas ${k}`} aktif={kelas === k} onPress={() => setKelas(k)} />
            ))}
          </DaftarOpsi>
        </Field>
        {tanyaJenis ? (
          <Field label="Jenis sekolah" galat={galat('jenis_sekolah')}>
            <DaftarOpsi>
              {JENIS_SEKOLAH_MENENGAH.map((j) => (
                <OpsiPil key={j} label={LABEL_JENIS_SEKOLAH[j]} aktif={jenis === j} onPress={() => setJenis(j)} />
              ))}
            </DaftarOpsi>
          </Field>
        ) : null}
        <Field label="Prodi impian" hint="Boleh dijawab “belum”." galat={galat('prodi_impian')}>
          <PilihProdi nilai={prodi} onPilih={setProdi} />
        </Field>
        <View style={s.kebijakan}>
          <Text style={s.kebijakanJudul}>{JUDUL_KEBIJAKAN}</Text>
          {RINGKASAN_KEBIJAKAN.map((t) => (
            <View key={t} style={s.butir}>
              <Text style={s.butirTeks}>•</Text>
              <Text style={[s.butirTeks, s.flex]}>{t}</Text>
            </View>
          ))}
          <Text style={s.tautan} onPress={() => setBukaKebijakan(true)} accessibilityRole="link">
            {TAUTAN_KEBIJAKAN}
          </Text>
          <KotakCentang label={LABEL_SUDAH_BACA} tercentang={sudahBaca} onAlih={() => setSudahBaca((v) => !v)} />
        </View>
        <PesanGalat teks={galatKirim ?? error} />
        <TombolUtama
          label="Daftar"
          labelProses={mengirimKode ? 'Mengirim kode…' : 'Mendaftarkan…'}
          proses={loading || mengirimKode}
          nonaktif={!sudahBaca}
          onPress={kirim}
        />
        {sudahBaca ? null : <Keterangan>{PETUNJUK_BELUM_CENTANG}</Keterangan>}
        <Keterangan>{KALIMAT_DATA_PRIBADI}</Keterangan>
        <TautanBawah teks="Sudah punya akun?" tautan="Masuk" onPress={() => router.replace('/masuk')} />
      </View>
      <ModalKebijakan buka={bukaKebijakan} onTutup={() => setBukaKebijakan(false)} />
    </AuthLayout>
  );
}

/**
 * Kebijakan lengkap sebagai modal, bukan pindah halaman: grup (auth) memakai
 * <Slot/>, jadi pindah ke /kebijakan-privasi akan mengosongkan formulir.
 */
function ModalKebijakan({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <Modal visible={buka} animationType="slide" onRequestClose={onTutup}>
      <View style={[s.modal, { paddingTop: top, paddingBottom: bottom }]}>
        <ScrollView contentContainerStyle={s.modalIsi}>
          <Text style={s.modalJudul} role="heading" aria-level={1}>
            Kebijakan Privasi
          </Text>
          <IsiKebijakan />
          <TombolUtama label="Tutup" labelProses="Tutup" proses={false} onPress={onTutup} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  kebijakan: {
    gap: spacing.s3,
    padding: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderSoft,
    backgroundColor: color.white,
  },
  kebijakanJudul: { ...teks.bodySm, fontFamily: font.semibold, color: color.textBody },
  butir: { flexDirection: 'row', gap: spacing.s2 },
  butirTeks: { ...teks.caption, color: color.ink700 },
  flex: { flex: 1 },
  tautan: { ...teks.bodySm, fontFamily: font.semibold, color: color.textLink, textDecorationLine: 'underline' },
  modal: { flex: 1, backgroundColor: color.surfacePage },
  modalIsi: { padding: spacing.gutter, gap: spacing.s4, width: '100%', maxWidth: 520, alignSelf: 'center' },
  modalJudul: { ...teks.h2, color: color.textBody },
});
