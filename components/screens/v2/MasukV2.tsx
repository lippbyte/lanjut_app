import React, { useState } from 'react';
import { useRouter } from 'expo-router';

import * as authApi from '../../../api/auth';
import { PESAN_SESI_BERAKHIR } from '../../../api/auth';
import { ApiError } from '../../../api/client';
import { useAuth } from '../../../hooks/useAuth';
import { TEKS_MASUK } from '../../../lib/alurMasukV2';
import { TEKS_DATA_AKUN } from '../../../lib/dataAkun';
import { useSesi } from '../../../providers/AuthProvider';
import { Centang, HeaderLayar, Isian, Kartu, PesanStatus, Tombol } from '../../v2';
import { TombolGoogle } from '../auth/TombolGoogle';
import { KerangkaV2 } from './KerangkaV2';

/**
 * Masuk v2 (LANJUT_030). Kolom, rute, dan alur sama dengan v1 (LoginScreen dan MasukKodeEmail):
 * kata sandi, atau kode email (juga dipakai bila lupa kata sandi). Yang berubah hanya tampilan, dan
 * pilihan "Tetap masuk di HP ini" (bawaan aktif). Kata sandi hanya di state layar, tidak disimpan.
 * Sesudah berhasil, app/(auth)/_layout.tsx memindahkan siswa ke app (sama dengan v1).
 */
export function MasukV2() {
  const router = useRouter();
  const { login, loginKode, loading, error, medan } = useAuth();
  const { alasanKeluar } = useSesi();
  const [cara, setCara] = useState<'sandi' | 'kode'>('sandi');
  const [tetapMasuk, setTetapMasuk] = useState(true);
  const [namaPengguna, setNamaPengguna] = useState('');
  const [kataSandi, setKataSandi] = useState('');
  const [galatLokal, setGalatLokal] = useState<string | null>(null);
  // Mode kode email (logika MasukKodeEmail v1).
  const [tahapKode, setTahapKode] = useState<'email' | 'kode'>('email');
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [galatKirim, setGalatKirim] = useState<string | null>(null);
  const [galatEmail, setGalatEmail] = useState<string | undefined>(undefined);

  const masukSandi = () => {
    if (!namaPengguna.trim() || !kataSandi) {
      setGalatLokal(TEKS_MASUK.isiDulu);
      return;
    }
    setGalatLokal(null);
    login(namaPengguna.trim(), kataSandi, { tetapMasuk });
  };

  const kirimKode = async () => {
    if (!email.trim()) {
      setGalatEmail(TEKS_MASUK.isiEmail);
      return;
    }
    setMengirim(true);
    setGalatKirim(null);
    setGalatEmail(undefined);
    try {
      await authApi.kirimKodeEmail(email.trim());
      setKode('');
      setTahapKode('kode');
    } catch (err) {
      setGalatKirim(authApi.pesanUntuk(err));
      if (err instanceof ApiError && err.medan?.email && err.kode === 'VALIDASI_GAGAL') setGalatEmail(TEKS_MASUK.emailSalah);
    } finally {
      setMengirim(false);
    }
  };

  const masukKode = () => {
    if (!/^\d{6}$/.test(kode.trim())) {
      setGalatLokal(TEKS_MASUK.kodeEnamAngka);
      return;
    }
    setGalatLokal(null);
    loginKode(email.trim(), kode.trim(), { tetapMasuk });
  };

  const gantiCara = (baru: 'sandi' | 'kode') => {
    setCara(baru);
    setGalatLokal(null);
    setGalatKirim(null);
  };

  const pilihanTetapMasuk = (
    <Centang label={TEKS_MASUK.tetapMasuk} keterangan={TEKS_MASUK.tetapMasukKet} dicentang={tetapMasuk} onUbah={setTetapMasuk} />
  );

  let isi: React.ReactNode;
  let aksi: React.ReactNode;
  if (cara === 'sandi') {
    isi = (
      <>
        <Isian label={TEKS_MASUK.namaPengguna} nilai={namaPengguna} onUbah={setNamaPengguna} jenis="namaPengguna" galat={medan.nama_pengguna} fokusAwal />
        <Isian label={TEKS_MASUK.kataSandi} nilai={kataSandi} onUbah={setKataSandi} jenis="sandi" galat={medan.kata_sandi} kunciKirim="go" onKirim={masukSandi} />
        {pilihanTetapMasuk}
      </>
    );
    aksi = (
      <>
        {galatLokal ?? error ? <PesanStatus jenis="galat">{(galatLokal ?? error) as string}</PesanStatus> : null}
        <Tombol label={TEKS_MASUK.masuk} penuh memuat={loading} onPress={masukSandi} />
        <Tombol varian="teks" label={TEKS_MASUK.denganKode} penuh onPress={() => gantiCara('kode')} />
      </>
    );
  } else if (tahapKode === 'email') {
    isi = (
      <>
        <Isian label={TEKS_MASUK.email} petunjuk={TEKS_MASUK.emailKet} nilai={email} onUbah={setEmail} jenis="email" galat={galatEmail} kunciKirim="send" onKirim={kirimKode} fokusAwal />
        {pilihanTetapMasuk}
      </>
    );
    aksi = (
      <>
        {galatKirim ? <PesanStatus jenis="galat">{galatKirim}</PesanStatus> : null}
        <Tombol label={TEKS_MASUK.kirimKode} penuh memuat={mengirim} onPress={kirimKode} />
        <Tombol varian="teks" label={TEKS_MASUK.denganSandi} penuh onPress={() => gantiCara('sandi')} />
      </>
    );
  } else {
    isi = (
      <>
        <Kartu varian="lembut" keterangan={TEKS_MASUK.kodeTerkirim(email.trim())} />
        <Isian
          label={TEKS_MASUK.kodeMasuk}
          nilai={kode}
          onUbah={(t) => setKode(t.replace(/\D/g, '').slice(0, 6))}
          jenis="kode"
          galat={medan.kode ? TEKS_MASUK.periksaKode : undefined}
          kunciKirim="go"
          onKirim={masukKode}
          fokusAwal
        />
        {pilihanTetapMasuk}
      </>
    );
    aksi = (
      <>
        {galatLokal ?? error ?? galatKirim ? <PesanStatus jenis="galat">{(galatLokal ?? error ?? galatKirim) as string}</PesanStatus> : null}
        <Tombol label={TEKS_MASUK.masuk} penuh memuat={loading} onPress={masukKode} />
        <Tombol varian="sekunder" label={TEKS_MASUK.kirimUlang} penuh memuat={mengirim} onPress={kirimKode} />
        <Tombol varian="teks" label={TEKS_MASUK.gantiEmail} penuh onPress={() => setTahapKode('email')} />
      </>
    );
  }

  return (
    <KerangkaV2
      kunciLangkah={`${cara}-${tahapKode}`}
      aksi={
        <>
          {aksi}
          <Tombol varian="teks" label={TEKS_MASUK.belumPunya} penuh onPress={() => router.replace('/daftar')} />
        </>
      }
    >
      <HeaderLayar tanpaTepi judul={TEKS_MASUK.judul} ringkasan={cara === 'sandi' ? TEKS_MASUK.ringkasanSandi : TEKS_MASUK.ringkasanKode} />
      {alasanKeluar === 'sesi_berakhir' ? <Kartu varian="lembut" keterangan={PESAN_SESI_BERAKHIR} /> : null}
      {alasanKeluar === 'akun_dihapus' ? <Kartu varian="lembut" keterangan={TEKS_DATA_AKUN.akunDihapus} /> : null}
      {isi}
      {/* Tombol Google v1 apa adanya; hanya tampil bila Client ID diisi (LANJUT_083). */}
      <TombolGoogle />
    </KerangkaV2>
  );
}
