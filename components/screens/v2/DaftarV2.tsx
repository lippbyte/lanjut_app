import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as authApi from '../../../api/auth';
import type { DataDaftar } from '../../../api/auth';
import { ApiError } from '../../../api/client';
import { useAuth } from '../../../hooks/useAuth';
import { useKurangiGerak } from '../../../hooks/useKurangiGerak';
import { useProdi } from '../../../hooks/useProdi';
import {
  BELUM_PRODI,
  KELAS_PER_JENJANG,
  LANGKAH_MEDAN,
  TEKS_DAFTAR,
  TEKS_MASUK,
  TEKS_V1,
  bentukKirimanDaftar,
  langkahDaftar,
  periksaLangkah,
  type IsianDaftar,
  type Jenjang,
  type LangkahDaftar,
} from '../../../lib/alurMasukV2';
import { JENIS_SEKOLAH_MENENGAH, LABEL_JENIS_SEKOLAH, type JenisSekolahMenengah, type Kelas } from '../../../lib/jenjang';
import { RINGKASAN_KEBIJAKAN, VERSI_KEBIJAKAN } from '../../../lib/kebijakanPrivasi';
import { ruang, tataLetak } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import { Centang, HeaderLayar, IndikatorLangkah, Isian, Kartu, PesanStatus, Pilihan, Teks, Tombol } from '../../v2';
import { IsiKebijakan } from '../KebijakanPrivasiScreen';
import { KerangkaV2 } from './KerangkaV2';

/**
 * Daftar v2 (LANJUT_030): formulir Daftar v1 dipecah per langkah, satu keputusan per layar.
 *   - Payload ke server SAMA PERSIS dengan v1 (bentukKirimanDaftar; tes kontrak membandingkannya
 *     dengan kode RegisterScreen v1). Tidak ada kolom baru.
 *   - Persetujuan kebijakan privasi (ringkasan dan teks lengkap dari lib/kebijakan-privasi.json, tidak
 *     diubah) diminta SEBELUM akun dibuat, sama dengan v1, dan tetap tindakan eksplisit (centang).
 *   - Dengan email: kode dulu, akun dibuat setelah kode benar (alur v1 LANJUT_083c).
 *   - Kata sandi hanya di state layar; tidak pernah ditulis ke penyimpanan mana pun.
 */
export function DaftarV2() {
  const router = useRouter();
  const { register, registerKode, loading, error, medan } = useAuth();
  const [isian, setIsian] = useState<IsianDaftar>({ namaPengguna: '', kataSandi: '', email: '', sudahBaca: false, kelas: null, jenis: null, prodi: null });
  const [jenjang, setJenjang] = useState<Jenjang | null>(null);
  const [tetapMasuk, setTetapMasuk] = useState(true);
  const [indeks, setIndeks] = useState(0);
  const [galatLangkah, setGalatLangkah] = useState<Record<string, string>>({});
  const [bukaKebijakan, setBukaKebijakan] = useState(false);
  // Tahap kode (dengan email).
  const [kiriman, setKiriman] = useState<(DataDaftar & { email: string }) | null>(null);
  const [kode, setKode] = useState('');
  const [mengirimKode, setMengirimKode] = useState(false);
  const [galatKirim, setGalatKirim] = useState<string | null>(null);
  const [infoKode, setInfoKode] = useState<string | null>(null);
  const [galatKode, setGalatKode] = useState<string | null>(null);

  const daftarLangkah = langkahDaftar(isian.kelas);
  const langkah = daftarLangkah[Math.min(indeks, daftarLangkah.length - 1)];
  const ubah = (sebagian: Partial<IsianDaftar>) => setIsian((i) => ({ ...i, ...sebagian }));

  // Galat medan dari server → kembali ke langkah tempat medan itu diisi.
  useEffect(() => {
    const kunci = Object.keys(medan).find((k) => LANGKAH_MEDAN[k]);
    if (!kunci) return;
    const ke = langkahDaftar(isian.kelas).indexOf(LANGKAH_MEDAN[kunci]);
    if (ke >= 0) {
      setKiriman(null);
      setIndeks(ke);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medan]);

  // Pesan galat langkah hilang begitu siswa mengubah isian (galat lama tidak tertinggal).
  useEffect(() => setGalatLangkah({}), [isian, jenjang]);

  const lanjut = () => {
    // Jenjang tidak dikirim ke server (hanya menyaring pilihan kelas), tetapi tetap wajib dipilih.
    const g = langkah === 'jenjang' && !jenjang ? { jenjang: TEKS_DAFTAR.jenjang.pilihDulu } : periksaLangkah(langkah, isian);
    setGalatLangkah(g);
    if (Object.keys(g).length) return;
    setIndeks((i) => Math.min(i + 1, daftarLangkah.length - 1));
  };

  const kembali = () => {
    setGalatLangkah({});
    setIndeks((i) => Math.max(0, i - 1));
  };

  const kirimKode = async (data: DataDaftar & { email: string }, ulang: boolean) => {
    setMengirimKode(true);
    setGalatKirim(null);
    setInfoKode(null);
    try {
      await authApi.kirimKodeDaftar(data);
      setKiriman(data);
      setKode('');
      setGalatKode(null);
      if (ulang) setInfoKode(TEKS_DAFTAR.kode.terkirimUlang);
    } catch (err) {
      setGalatKirim(err instanceof ApiError && err.kode === 'OTP_TIDAK_TERSEDIA' ? TEKS_DAFTAR.kode.tidakTersedia : authApi.pesanUntuk(err));
      if (err instanceof ApiError && err.medan) {
        const k = Object.keys(err.medan).find((m) => LANGKAH_MEDAN[m]);
        if (k) setIndeks(langkahDaftar(isian.kelas).indexOf(LANGKAH_MEDAN[k]));
      }
    } finally {
      setMengirimKode(false);
    }
  };

  const buatAkun = () => {
    const g = periksaLangkah('siap', isian);
    setGalatLangkah(g);
    if (Object.keys(g).length) {
      const pertama = Object.keys(g).map((k) => daftarLangkah.indexOf(LANGKAH_MEDAN[k])).filter((i) => i >= 0);
      if (pertama.length) setIndeks(Math.min(...pertama));
      return;
    }
    const k = bentukKirimanDaftar(isian, VERSI_KEBIJAKAN);
    if (!k) return;
    if (k.jalur === 'kode') void kirimKode(k.data, false);
    else register(k.data, { tetapMasuk });
  };

  const verifikasiKode = () => {
    if (!kiriman) return;
    if (!/^\d{6}$/.test(kode.trim())) {
      setGalatKode(TEKS_MASUK.kodeEnamAngka);
      return;
    }
    setGalatKode(null);
    setInfoKode(null);
    registerKode(kiriman.email, kode.trim(), { tetapMasuk });
  };

  // ---------- Tahap kode ----------
  if (kiriman) {
    const galatTampil = galatKode ?? galatKirim ?? (infoKode ? null : error);
    return (
      <KerangkaV2
        kunciLangkah="kode"
        aksi={
          <>
            {galatTampil ? <PesanStatus jenis="galat">{galatTampil}</PesanStatus> : null}
            {infoKode ? <PesanStatus jenis="sukses">{infoKode}</PesanStatus> : null}
            <Tombol label={TEKS_DAFTAR.kode.buatAkun} penuh memuat={loading} onPress={verifikasiKode} />
            <Tombol varian="sekunder" label={TEKS_DAFTAR.kode.kirimUlang} penuh memuat={mengirimKode} onPress={() => kirimKode(kiriman, true)} />
            <Tombol varian="teks" label={TEKS_DAFTAR.kode.ubahData} penuh onPress={() => setKiriman(null)} />
          </>
        }
      >
        <HeaderLayar tanpaTepi judul={TEKS_DAFTAR.kode.judul} ringkasan={TEKS_DAFTAR.kode.ringkasan(kiriman.email)} />
        <Isian
          label={TEKS_DAFTAR.kode.label}
          nilai={kode}
          onUbah={(t) => setKode(t.replace(/\D/g, '').slice(0, 6))}
          jenis="kode"
          galat={medan.kode ? TEKS_MASUK.periksaKode : undefined}
          kunciKirim="go"
          onKirim={verifikasiKode}
          fokusAwal
        />
      </KerangkaV2>
    );
  }

  // ---------- Langkah ----------
  const pertama = indeks === 0;
  const terakhir = langkah === 'siap';
  const galatUmum = terakhir ? galatKirim ?? error : null;
  return (
    <KerangkaV2
      kunciLangkah={langkah}
      aksi={
        <>
          {galatUmum ? <PesanStatus jenis="galat">{galatUmum}</PesanStatus> : null}
          {terakhir ? (
            <Tombol label={TEKS_DAFTAR.siap.buatAkun} penuh memuat={loading || mengirimKode} onPress={buatAkun} />
          ) : (
            <Tombol label={TEKS_DAFTAR.lanjut} penuh onPress={lanjut} />
          )}
          {pertama ? <Tombol varian="teks" label={TEKS_DAFTAR.sudahPunya} penuh onPress={() => router.replace('/masuk')} /> : null}
        </>
      }
    >
      <IndikatorLangkah ke={indeks + 1} total={daftarLangkah.length} teks={TEKS_DAFTAR.langkahKe(indeks + 1, daftarLangkah.length)} />
      <IsiLangkah
        langkah={langkah}
        isian={isian}
        ubah={ubah}
        jenjang={jenjang}
        setJenjang={setJenjang}
        galat={{ ...galatLangkah, ...medan }}
        tetapMasuk={tetapMasuk}
        setTetapMasuk={setTetapMasuk}
        onKembali={pertama ? undefined : kembali}
        onBacaLengkap={() => setBukaKebijakan(true)}
        onLanjut={lanjut}
      />
      <ModalKebijakanV2 buka={bukaKebijakan} onTutup={() => setBukaKebijakan(false)} />
    </KerangkaV2>
  );
}

function IsiLangkah({
  langkah,
  isian,
  ubah,
  jenjang,
  setJenjang,
  galat,
  tetapMasuk,
  setTetapMasuk,
  onKembali,
  onBacaLengkap,
  onLanjut,
}: {
  langkah: LangkahDaftar;
  isian: IsianDaftar;
  ubah: (s: Partial<IsianDaftar>) => void;
  jenjang: Jenjang | null;
  setJenjang: (j: Jenjang) => void;
  galat: Record<string, string>;
  tetapMasuk: boolean;
  setTetapMasuk: (v: boolean) => void;
  onKembali?: () => void;
  onBacaLengkap: () => void;
  onLanjut: () => void;
}) {
  const t = TEKS_DAFTAR;
  switch (langkah) {
    case 'akun':
      return (
        <>
          <HeaderLayar tanpaTepi judul={t.akun.judul} ringkasan={t.akun.ringkasan} onKembali={onKembali} />
          <Isian label={t.akun.namaPengguna} petunjuk={t.akun.namaKet} nilai={isian.namaPengguna} onUbah={(v) => ubah({ namaPengguna: v })} jenis="namaPengguna" maksPanjang={32} galat={galat.nama_pengguna} fokusAwal />
          <Isian label={t.akun.kataSandi} petunjuk={t.akun.sandiKet} nilai={isian.kataSandi} onUbah={(v) => ubah({ kataSandi: v })} jenis="sandiBaru" galat={galat.kata_sandi} kunciKirim="go" onKirim={onLanjut} />
        </>
      );
    case 'email':
      return (
        <>
          <HeaderLayar tanpaTepi judul={t.email.judul} ringkasan={t.email.ringkasan} onKembali={onKembali} />
          <Isian label={t.email.label} petunjuk={TEKS_V1.petunjukEmail} nilai={isian.email} onUbah={(v) => ubah({ email: v })} jenis="email" galat={galat.email} kunciKirim="go" onKirim={onLanjut} fokusAwal />
        </>
      );
    case 'persetujuan':
      return (
        <>
          <HeaderLayar tanpaTepi judul={t.persetujuan.judul} onKembali={onKembali} />
          {/* Ringkasan kebijakan dari JSON, apa adanya (tidak diringkas ulang). */}
          <Kartu>
            {RINGKASAN_KEBIJAKAN.map((butir) => (
              <Teks key={butir} varian="badanKecil">
                {`• ${butir}`}
              </Teks>
            ))}
          </Kartu>
          <Tombol varian="sekunder" label={t.persetujuan.bacaLengkap} onPress={onBacaLengkap} />
          <Teks varian="keterangan" warna="teksSekunder">
            {TEKS_V1.dataPribadi}
          </Teks>
          <Centang label={TEKS_V1.sudahBaca} dicentang={isian.sudahBaca} onUbah={(v) => ubah({ sudahBaca: v })} galat={galat.versi_kebijakan} />
        </>
      );
    case 'jenjang':
      return (
        <>
          <HeaderLayar tanpaTepi judul={t.jenjang.judul} onKembali={onKembali} />
          <Pilihan
            judul={t.jenjang.judul}
            mode="satu"
            judulTersembunyi
            opsi={[{ nilai: 'smp', label: t.jenjang.smp }, { nilai: 'menengah', label: t.jenjang.menengah }]}
            terpilih={jenjang ? [jenjang] : []}
            galat={galat.jenjang}
            onUbah={([j]) => {
              const baru = j as Jenjang;
              setJenjang(baru);
              if (isian.kelas && !KELAS_PER_JENJANG[baru].includes(isian.kelas)) ubah({ kelas: null, jenis: null });
            }}
          />
        </>
      );
    case 'kelas':
      return (
        <>
          <HeaderLayar tanpaTepi judul={t.kelas.judul} onKembali={onKembali} />
          <Pilihan
            judul={t.kelas.judul}
            mode="satu"
            judulTersembunyi
            opsi={(jenjang ? KELAS_PER_JENJANG[jenjang] : [...KELAS_PER_JENJANG.smp, ...KELAS_PER_JENJANG.menengah]).map((k) => ({ nilai: k, label: t.kelas.opsi(k) }))}
            terpilih={isian.kelas ? [isian.kelas] : []}
            onUbah={([k]) => ubah({ kelas: k as Kelas })}
            galat={galat.kelas}
          />
        </>
      );
    case 'jenis':
      return (
        <>
          <HeaderLayar tanpaTepi judul={t.jenis.judul} onKembali={onKembali} />
          <Pilihan
            judul={t.jenis.judul}
            mode="satu"
            judulTersembunyi
            opsi={JENIS_SEKOLAH_MENENGAH.map((j) => ({ nilai: j, label: LABEL_JENIS_SEKOLAH[j] }))}
            terpilih={isian.jenis ? [isian.jenis] : []}
            onUbah={([j]) => ubah({ jenis: j as JenisSekolahMenengah })}
            galat={galat.jenis_sekolah}
          />
        </>
      );
    case 'prodi':
      return <LangkahProdi isian={isian} ubah={ubah} galat={galat.prodi_impian} onKembali={onKembali} />;
    case 'siap':
      return (
        <>
          <HeaderLayar tanpaTepi judul={t.siap.judul} ringkasan={t.siap.ringkasan} onKembali={onKembali} />
          <RingkasanIsian isian={isian} />
          <Centang label={TEKS_MASUK.tetapMasuk} keterangan={TEKS_MASUK.tetapMasukKet} dicentang={tetapMasuk} onUbah={setTetapMasuk} />
          {Object.keys(galat).length ? <PesanStatus jenis="galat">{t.siap.pilihDulu}</PesanStatus> : null}
        </>
      );
  }
}

/** Ringkasan isian sebelum akun dibuat. Kata sandi tidak pernah ditampilkan. */
function RingkasanIsian({ isian }: { isian: IsianDaftar }) {
  const prodi = useProdi();
  const t = TEKS_DAFTAR.siap;
  const namaProdi = isian.prodi === BELUM_PRODI ? TEKS_V1.belumProdi : prodi.data?.find((p) => p.id === isian.prodi)?.nama ?? isian.prodi ?? '';
  const baris: [string, string][] = [
    [t.labelNama, isian.namaPengguna.trim().toLowerCase()],
    [t.labelEmail, isian.email.trim() || t.tanpaEmail],
    [t.labelKelas, isian.kelas ? TEKS_DAFTAR.kelas.opsi(isian.kelas) : ''],
    ...(isian.jenis && isian.kelas && Number(isian.kelas) >= 10 ? ([[t.labelSekolah, LABEL_JENIS_SEKOLAH[isian.jenis]]] as [string, string][]) : []),
    [t.labelProdi, namaProdi],
  ];
  return (
    <Kartu>
      {baris.map(([label, nilai]) => (
        <View key={label} style={s.barisRingkas}>
          <Teks varian="keterangan" warna="teksSekunder">
            {label}
          </Teks>
          <Teks varian="badan">{nilai}</Teks>
        </View>
      ))}
    </Kartu>
  );
}

function LangkahProdi({ isian, ubah, galat, onKembali }: { isian: IsianDaftar; ubah: (s: Partial<IsianDaftar>) => void; galat?: string; onKembali?: () => void }) {
  const prodi = useProdi();
  const opsi = useMemo(
    () => [{ nilai: BELUM_PRODI, label: TEKS_V1.belumProdi }, ...(prodi.data ?? []).map((p) => ({ nilai: p.id, label: p.nama }))],
    [prodi.data]
  );
  return (
    <>
      <HeaderLayar tanpaTepi judul={TEKS_DAFTAR.prodi.judul} ringkasan={TEKS_DAFTAR.prodi.ringkasan} onKembali={onKembali} />
      {prodi.isError ? <PesanStatus jenis="galat">{TEKS_DAFTAR.prodi.gagal}</PesanStatus> : null}
      <Pilihan
        judul={TEKS_DAFTAR.prodi.judul}
        mode="satu"
        judulTersembunyi
        opsi={opsi}
        terpilih={isian.prodi ? [isian.prodi] : []}
        onUbah={([p]) => ubah({ prodi: p })}
        memuat={prodi.isPending}
        galat={galat}
      />
    </>
  );
}

/** Teks kebijakan lengkap, IsiKebijakan v1 (lib/kebijakan-privasi.json) tanpa perubahan. */
function ModalKebijakanV2({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  const { warna } = useTemaV2();
  const { top, bottom } = useSafeAreaInsets();
  const kurangiGerak = useKurangiGerak();
  return (
    <Modal visible={buka} animationType={kurangiGerak ? 'none' : 'slide'} onRequestClose={onTutup}>
      <View style={StyleSheet.flatten([s.modal, { backgroundColor: warna.halaman, paddingTop: top, paddingBottom: bottom }])}>
        <ScrollView contentContainerStyle={s.modalIsi}>
          <Teks varian="h1">{TEKS_DAFTAR.persetujuan.judulLengkap}</Teks>
          <IsiKebijakan />
          <Tombol label={TEKS_DAFTAR.persetujuan.tutup} penuh onPress={onTutup} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modal: { flex: 1 },
  barisRingkas: { gap: ruang.r1 },
  modalIsi: { padding: ruang.tepi, gap: ruang.r2, width: '100%', maxWidth: tataLetak.lebarMaks, alignSelf: 'center' },
});
