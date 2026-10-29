import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { pesanUntuk, type DataUbahProfil, type GayaBelajar, type Pengguna } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useSesi } from '../../providers/AuthProvider';
import { usePersetujuan } from '../../hooks/usePersetujuan';
import { useProdi } from '../../hooks/useProdi';
import { useProgresDaftarPeriksa, useSaringDaftarPeriksa } from '../../hooks/useProgresDaftarPeriksa';
import { useUbahProfil } from '../../hooks/useUbahProfil';
import { GAYA_BELAJAR, labelGayaBelajar } from '../../lib/gayaBelajar';
import { keadaanKebijakan, perluTerimaUlang } from '../../lib/kebijakanPrivasi';
import {
  JENIS_SEKOLAH_MENENGAH,
  KELAS_OPSI,
  LABEL_JENIS_SEKOLAH,
  adalahJenisMenengah,
  tanyaJenisSekolah,
  type JenisSekolahMenengah,
  type Kelas,
} from '../../lib/jenjang';
import { tampilPintuJalurSaya, teksKemajuanDataAkun } from '../../lib/jenjangSaya';
import { color, font, spacing, teks } from '../../theme/tokens';
import { BilahProgres, Kartu, KartuPintu, Memuat, Penafian, SeksiJudul, Tombol, gaya } from '../ui';
import { BELUM, DaftarOpsi, Field, Input, OpsiPil, PesanGalat, PilihProdi } from './auth/AuthUI';
import { useUntukKelas12 } from './KhususKelas12';
import { AjakanVerifikasiEmail } from './VerifikasiEmail';

// "Data Akun" (v1.1 LANJUT_004 menamainya Jalur Saya; nama itu dipindah ke
// /cek-posisi sejak LANJUT_074) di atas padanan MVP-PWA/akun.html
// (keadaan "sudah masuk"). Keadaan tamu tidak ada di sini karena layar ini
// hanya bisa dibuka setelah login. Semua isi dibaca dari `pengguna` di
// AuthProvider — hasil GET /auth/saya milik akun yang sedang masuk.
export function AkunScreen() {
  const { pengguna, keluar } = useSesi();
  const router = useRouter();
  const [proses, setProses] = useState(false);

  const onKeluar = async () => {
    setProses(true);
    await keluar();
  };

  if (!pengguna) return null;

  return (
    <View style={gaya.layarIsiRapat}>
      {/* LANJUT_083c: hanya untuk akun lama yang emailnya belum terverifikasi. */}
      <AjakanVerifikasiEmail key={`verifikasi-${pengguna.id}`} />
      {/* key: formulir yang setengah diisi tidak terbawa ke akun lain. */}
      <KartuJalur key={pengguna.id} pengguna={pengguna} />
      {/* LANJUT_077b: SMP tidak melihat pintu ini (layarnya hanya placeholder kelas 12). */}
      {tampilPintuJalurSaya(pengguna.kelas) ? (
        <KartuPintu
          ikon="posisi"
          judul="Jalur Saya"
          keterangan="Tahap kamu sekarang, dihitung dari jalur dan kemajuanmu."
          onPress={() => router.push('/cek-posisi')}
        />
      ) : null}

      <SeksiJudul>Kemajuan</SeksiJudul>
      <RingkasanKemajuan />

      <SeksiJudul>Akun</SeksiJudul>
      <Kartu>
        <View style={s.daftar}>
          <Baris label="Nama pengguna" nilai={pengguna.nama_pengguna} />
          <Baris label="Email" nilai={pengguna.email || '—'} />
          <BarisKebijakan />
          <BarisPersetujuan />
        </View>
        <TombolTerimaKebijakan onPress={() => router.push('/terima-kebijakan')} />
        <Text style={s.penjelas}>{PENJELAS_PERSETUJUAN}</Text>
        <Text style={s.tautan} onPress={() => router.push('/kebijakan-privasi')} accessibilityRole="link">
          Baca kebijakan privasi
        </Text>
      </Kartu>
      <Penafian>Catatan yang sudah tersimpan ke akunmu tetap ada setelah keluar.</Penafian>
      <Tombol label={proses ? 'Mengeluarkan…' : 'Keluar'} varian="garis" besar penuh proses={proses} onPress={onKeluar} />
    </View>
  );
}

function KartuJalur({ pengguna }: { pengguna: Pengguna }) {
  const { data: daftarProdi } = useProdi();
  const [ubah, setUbah] = useState(false);
  const namaProdi = pengguna.prodi_impian
    ? (daftarProdi?.find((p) => p.id === pengguna.prodi_impian)?.nama ?? pengguna.prodi_impian)
    : null;

  if (ubah) return <FormJalur pengguna={pengguna} onSelesai={() => setUbah(false)} />;

  return (
    <Kartu>
      {/* LANJUT_074: judul bagian "Data Akun" (DRAF); isinya tidak berubah. */}
      <Text style={s.eyebrow}>Data Akun</Text>
      <Text style={s.nama}>{pengguna.nama_tampilan}</Text>
      <View style={s.daftar}>
        <Baris label="Kelas" nilai={pengguna.kelas ? `Kelas ${pengguna.kelas}` : null} />
        <Baris label="Sekolah" nilai={pengguna.jenis_sekolah ? LABEL_JENIS_SEKOLAH[pengguna.jenis_sekolah] : null} />
        <Baris label="Target prodi" nilai={namaProdi} />
        <Baris label="Gaya belajar" nilai={labelGayaBelajar(pengguna.gaya_belajar)} />
      </View>
      <View style={s.aksi}>
        <Tombol
          label={namaProdi && pengguna.kelas ? 'Ubah' : 'Lengkapi jalurmu'}
          varian="garis"
          kecil
          onPress={() => setUbah(true)}
        />
      </View>
    </Kartu>
  );
}

// Menyimpan ke PATCH /pengguna/saya. Validasi di sini hanya yang paling
// jelas (nama kosong/terlalu panjang); server tetap sumber kebenaran.
function FormJalur({ pengguna, onSelesai }: { pengguna: Pengguna; onSelesai: () => void }) {
  const simpan = useUbahProfil();
  const { pilih: setSaringan } = useSaringDaftarPeriksa();
  const [nama, setNama] = useState(pengguna.nama_tampilan);
  const [kelas, setKelas] = useState<Kelas | null>(pengguna.kelas);
  // LANJUT_038: jenis sekolah hanya dipilih untuk kelas 10–12 (7–9 → SMP di server).
  const [jenis, setJenis] = useState<JenisSekolahMenengah | null>(
    adalahJenisMenengah(pengguna.jenis_sekolah) ? pengguna.jenis_sekolah : null
  );
  const [galatJenis, setGalatJenis] = useState<string | null>(null);
  const tanyaJenis = tanyaJenisSekolah(kelas);
  const [prodi, setProdi] = useState<string>(pengguna.prodi_impian ?? BELUM);
  const [gayaBelajar, setGayaBelajar] = useState<GayaBelajar | null>(pengguna.gaya_belajar ?? null);
  const [galatNama, setGalatNama] = useState<string | null>(null);

  const kirim = () => {
    const namaBersih = nama.trim();
    if (!namaBersih) return setGalatNama('Nama tampilan belum diisi.');
    if (namaBersih.length > 60) return setGalatNama('Nama tampilan maksimal 60 karakter.');
    setGalatNama(null);
    if (tanyaJenis && !jenis) return setGalatJenis('Pilih jenis sekolahmu.');
    setGalatJenis(null);

    // Hanya medan yang berubah yang dikirim.
    const data: DataUbahProfil = {};
    const prodiBaru = prodi === BELUM ? null : prodi;
    if (namaBersih !== pengguna.nama_tampilan) data.nama_tampilan = namaBersih;
    if (kelas !== pengguna.kelas) data.kelas = kelas;
    if (tanyaJenis && jenis !== (pengguna.jenis_sekolah ?? null)) data.jenis_sekolah = jenis;
    if (prodiBaru !== pengguna.prodi_impian) data.prodi_impian = prodiBaru;
    if (gayaBelajar !== (pengguna.gaya_belajar ?? null)) data.gaya_belajar = gayaBelajar;
    if (!Object.keys(data).length) return onSelesai();

    simpan.mutate(data, {
      onSuccess: () => {
        // Kelas di perangkat mengalahkan kelas akun di Daftar Periksa, jadi
        // ikut diganti supaya saringannya mengikuti kelas yang baru disimpan.
        if (data.kelas) setSaringan({ kelas: data.kelas });
        onSelesai();
      },
    });
  };

  const medan = simpan.error instanceof ApiError ? simpan.error.medan : undefined;

  return (
    <Kartu style={s.form}>
      <Text style={s.eyebrow}>Ubah Data Akun</Text>
      <Field label="Nama tampilan" galat={galatNama ?? medan?.nama_tampilan}>
        <Input
          value={nama}
          onChangeText={(v) => {
            setNama(v);
            setGalatNama(null);
          }}
          maxLength={60}
          autoCapitalize="words"
        />
      </Field>
      <Field label="Kelas" galat={medan?.kelas}>
        <DaftarOpsi>
          {KELAS_OPSI.map((k) => (
            <OpsiPil key={k} label={`Kelas ${k}`} aktif={kelas === k} onPress={() => setKelas(k)} />
          ))}
        </DaftarOpsi>
      </Field>
      {tanyaJenis ? (
        <Field label="Jenis sekolah" galat={galatJenis ?? medan?.jenis_sekolah}>
          <DaftarOpsi>
            {JENIS_SEKOLAH_MENENGAH.map((j) => (
              <OpsiPil
                key={j}
                label={LABEL_JENIS_SEKOLAH[j]}
                aktif={jenis === j}
                onPress={() => {
                  setJenis(j);
                  setGalatJenis(null);
                }}
              />
            ))}
          </DaftarOpsi>
        </Field>
      ) : null}
      <Field label="Target prodi" hint="Boleh dijawab “belum”." galat={medan?.prodi_impian}>
        <PilihProdi nilai={prodi} onPilih={setProdi} />
      </Field>
      <Field label="Gaya belajar" hint="Cara belajar yang paling nyambung buat kamu." galat={medan?.gaya_belajar}>
        <DaftarOpsi>
          {GAYA_BELAJAR.map((g) => (
            <OpsiPil key={g.id} label={g.label} aktif={gayaBelajar === g.id} onPress={() => setGayaBelajar(g.id)} />
          ))}
        </DaftarOpsi>
      </Field>
      <PesanGalat teks={simpan.isError ? pesanUntuk(simpan.error) : null} />
      <View style={s.aksiForm}>
        <Tombol label="Batal" varian="hantu" onPress={onSelesai} />
        <Tombol label={simpan.isPending ? 'Menyimpan…' : 'Simpan'} proses={simpan.isPending} onPress={kirim} />
      </View>
    </Kartu>
  );
}

// LANJUT_035: X/Y Daftar Periksa = persiapan SNBP/SNBT/TKA, hanya kelas 12.
// Tombolnya tetap ada: butir pribadi siswa non-12 juga ada di Daftar Periksa.
// LANJUT_077 §B: kalimatnya dari lib/jenjangSaya.ts — SMP tanpa kalimat kelas 12.
function RingkasanKemajuan() {
  const router = useRouter();
  const { pengguna } = useSesi();
  const kelas12 = useUntukKelas12();
  if (kelas12) return <RingkasanKemajuanKelas12 />;
  return (
    <Kartu style={s.kemajuan}>
      {/* TEKS DRAF (salinan §4.11). */}
      <Text style={gaya.teksKecil}>{teksKemajuanDataAkun(pengguna?.kelas)}</Text>
      <Tombol label="Buka Daftar Periksa" varian="sekunder" kecil onPress={() => router.push('/daftar-periksa')} />
    </Kartu>
  );
}

// X dari Y memakai saringan & hitungan yang sama dengan layar Daftar
// Periksa (useProgresDaftarPeriksa), jadi angkanya selalu cocok.
function RingkasanKemajuanKelas12() {
  const router = useRouter();
  const saring = useSaringDaftarPeriksa();
  const { kelas, jalur, isPending: saringMemuat } = saring;
  const hasil = useProgresDaftarPeriksa(saring);
  const bukaDaftarPeriksa = () => router.push('/daftar-periksa');

  let isi: React.ReactNode;
  if (saringMemuat || hasil.isPending) {
    isi = <Memuat />;
  } else if (!hasil.siap) {
    isi = <Text style={gaya.teksKecil}>Pilih kelas dan jalurmu di Daftar Periksa untuk melihat kemajuanmu.</Text>;
  } else if (hasil.isError || !hasil.data) {
    isi = <Text style={gaya.teksKecil}>Kemajuan belum bisa dimuat. Coba lagi sebentar lagi.</Text>;
  } else {
    const { selesai, total } = hasil.data.progres;
    isi = (
      <>
        <Text style={s.angka}>
          {selesai} dari {total} langkah Daftar Periksa selesai
        </Text>
        <BilahProgres selesai={selesai} total={total} label="Kemajuan daftar periksa" />
        <Text style={s.label}>
          Kelas {kelas} · {jalur}
        </Text>
      </>
    );
  }

  return (
    <Kartu style={s.kemajuan}>
      {isi}
      <Tombol label="Buka Daftar Periksa" varian="sekunder" kecil onPress={bukaDaftarPeriksa} />
    </Kartu>
  );
}

// Salinan teks §4.13 (LANJUT_047) — DRAF belum disetujui Khalifa.
const PENJELAS_PERSETUJUAN =
  'Orang tua atau walimu memberi persetujuan lewat surat dari sekolah. Persetujuan ini dibutuhkan untuk fitur AI nanti; fitur lain tetap bisa kamu pakai seperti biasa.';

/**
 * Status persetujuan orang tua/wali, hanya baca (LANJUT_047). "Sudah" =
 * persetujuan aktif menurut server (tidak dicabut, versi ≥ minimum); dicabut
 * atau versi lama → "Belum". Fitur AI tetap diputuskan server, bukan di sini.
 */
function BarisPersetujuan() {
  const { data, isPending, isError } = usePersetujuan();
  const nilai = isPending ? '…' : isError || !data ? 'Belum bisa dimuat' : data.ortu_wali_aktif ? 'Sudah' : 'Belum';
  return <Baris label="Persetujuan orang tua/wali" nilai={nilai} />;
}

/**
 * Status kebijakan privasi akun ini (LANJUT_048; salinan §4.14, DRAF). Siswa
 * menerimanya sendiri lewat /terima-kebijakan; bukan syarat fitur dasar.
 */
function BarisKebijakan() {
  const { data, isPending, isError } = usePersetujuan();
  let nilai: string;
  if (isPending) nilai = '…';
  else if (isError || !data) nilai = 'Belum bisa dimuat';
  else if (keadaanKebijakan(data) === 'diterima') nilai = `Diterima (versi ${data.kebijakan_privasi?.versi})`;
  else nilai = perluTerimaUlang(data) ? 'Perlu diterima ulang' : 'Belum diterima';
  return <Baris label="Kebijakan privasi" nilai={nilai} />;
}

/** Tombol ke /terima-kebijakan, hanya selama versi berlaku belum diterima. */
function TombolTerimaKebijakan({ onPress }: { onPress: () => void }) {
  const { data } = usePersetujuan();
  if (!data || ['diterima', 'tidak_tersedia'].includes(keadaanKebijakan(data))) return null;
  return (
    <View style={s.aksi}>
      <Tombol label="Baca dan terima" varian="sekunder" kecil onPress={onPress} />
    </View>
  );
}

/** `nilai` null → "Belum diisi" dengan gaya redup, bukan teks kosong. */
function Baris({ label, nilai }: { label: string; nilai: string | null }) {
  return (
    <View style={s.baris}>
      <Text style={s.label}>{label}</Text>
      <Text style={nilai ? s.nilai : s.nilaiKosong} numberOfLines={2}>
        {nilai ?? 'Belum diisi'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  // .eyebrow
  eyebrow: { ...teks.label, color: color.blue600 },
  nama: { ...teks.h3, color: color.textBody, marginTop: spacing.s1 },
  daftar: { gap: spacing.s3, marginTop: spacing.s4 },
  baris: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.s3 },
  label: { ...teks.caption, color: color.textMuted },
  nilai: { ...teks.bodySm, fontFamily: font.medium, color: color.textBody, flexShrink: 1, textAlign: 'right' },
  kemajuan: { gap: spacing.s3 },
  aksi: { flexDirection: 'row', marginTop: spacing.s4 },
  form: { gap: spacing.s4 },
  aksiForm: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.s2 },
  angka: { ...teks.body, fontFamily: font.semibold, color: color.textBody },
  nilaiKosong: { ...teks.bodySm, color: color.textMuted, flexShrink: 1, textAlign: 'right' },
  penjelas: { ...teks.caption, color: color.textMuted, marginTop: spacing.s3 },
  tautan: { ...teks.bodySm, fontFamily: font.semibold, color: color.textLink, textDecorationLine: 'underline', marginTop: spacing.s2 },
});
