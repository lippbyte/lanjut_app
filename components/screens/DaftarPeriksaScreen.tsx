import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ButirDaftarPeriksa, KategoriDaftarPeriksa } from '../../api/types';
import { useButirPribadi, useHapusButirPribadi, useTandaiButirPribadi } from '../../hooks/useButirPribadi';
import { useTandaiKemajuan } from '../../hooks/useKemajuan';
import {
  type SaringanDaftarPeriksa,
  useProgresDaftarPeriksa,
  useSaringDaftarPeriksa,
} from '../../hooks/useProgresDaftarPeriksa';
import { CATATAN_KATEGORI, gabungButirPribadi, perluCatatanSnpmb, type Progres } from '../../lib/daftarPeriksa';
import { teksDaftarPeriksaBukanKelas12 } from '../../lib/jenjangSaya';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { BilahProgres, Ikon, Kartu, KeadaanGalat, Kepala, Kosong, Memuat, SeksiJudul, Sumber, gaya } from '../ui';
import { BukanKelas12, useUntukKelas12 } from './KhususKelas12';
import { PersiapanEvent } from './PersiapanEvent';

const KELAS_OPSI = ['10', '11', '12'] as const;
const JALUR_OPSI = ['TKA', 'SNBP', 'SNBT'] as const;

/**
 * F5 — padanan MVP-PWA/checklist.html: bilah kemajuan bergradasi + tiga
 * kalimat kemajuan (§4.4), butir per kategori dengan kotak centang.
 *
 * Beda dari PWA, dua-duanya disengaja:
 *  - Centang disimpan ke akun lewat /kemajuan (PWA: localStorage), jadi
 *    ikut pindah ke HP lain.
 *  - Butir disaring kelas & jalur (AC F5 di PRD, belum ada di PWA). Kelas
 *    diisi dari akun kalau ada; jalur disimpan di perangkat karena akun
 *    belum punya medan jalur. Rumpun target prodi ikut dikirim, jadi butir
 *    khusus rumpun itu tampil (LANJUT_013).
 *
 * Butir pribadi (LANJUT_034, "Simpan" dari Pilih Mapel & Eksplorasi Tujuan)
 * tersimpan di akun, ikut digabung ke kategorinya, dan bisa dihapus. Butir
 * ini tidak disaring kelas/jalur, jadi tetap tampil sebelum keduanya dipilih.
 */
export function DaftarPeriksaScreen() {
  const kelas12 = useUntukKelas12();
  return kelas12 ? <DaftarPeriksaKelas12 /> : <DaftarPeriksaBukanKelas12 />;
}

// LANJUT_035: butir umum (persiapan SNBP/SNBT/TKA) hanya untuk kelas 12.
// Butir pribadi dari Pilih Mapel & Eksplorasi Tujuan tetap tampil — itu
// rencana siswa sendiri, bukan tenggat — supaya "Simpan" tetap ada gunanya.
// LANJUT_069 (Tambahan-069 no. 2): kelas 10–11 tidak melihat pesan "khusus
// kelas 12", tetapi kalimat netral DRAF (lib/jenjangSaya.ts).
// LANJUT_076: Persiapan Event — tidak merender apa pun selama saklar
// event_sekolah_aktif mati. LANJUT_076b: Persiapan Event hanya SMP (kelas 7–9),
// dan SMP juga mendapat kalimat netral, bukan placeholder "Bagian ini untuk kelas 12".
function DaftarPeriksaBukanKelas12() {
  const { pengguna } = useSesi();
  const teksNetral = teksDaftarPeriksaBukanKelas12(pengguna?.kelas ?? null);
  return (
    <View style={gaya.layarIsi}>
      <Kepala judul="Daftar Periksa" pengantar="Satu per satu, tidak perlu sekaligus." />
      {teksNetral ? <Text style={gaya.teksBody}>{teksNetral}</Text> : <BukanKelas12 />}
      <PersiapanEvent />
      <ButirPribadiSaja />
    </View>
  );
}

function DaftarPeriksaKelas12() {
  const saring = useSaringDaftarPeriksa();
  const { kelas, jalur, pilih, isPending } = saring;

  return (
    <View style={gaya.layarIsi}>
      <Kepala judul="Daftar Periksa" pengantar="Satu per satu, tidak perlu sekaligus." />

      <Kartu varian="soft" style={s.saring}>
        <BarisKeping label="Kelas" opsi={KELAS_OPSI} tampil={(k) => `Kelas ${k}`} aktif={kelas} onPilih={(k) => pilih({ kelas: k })} />
        <BarisKeping label="Jalur" opsi={JALUR_OPSI} tampil={(j) => j} aktif={jalur} onPilih={(j) => pilih({ jalur: j })} />
      </Kartu>

      {isPending ? (
        <Memuat />
      ) : kelas && jalur ? (
        <Checklist saring={saring} />
      ) : (
        <>
          <Kosong judul="Pilih kelas dan jalurmu dulu." teks="Supaya butir yang tampil memang yang perlu kamu siapkan." />
          <ButirPribadiSaja />
        </>
      )}
    </View>
  );
}

/** Centang & hapus untuk butir umum (/kemajuan) dan butir pribadi (/butir-pribadi). */
function useAksiButir(pribadiIds: ReadonlySet<string>, selesai: ReadonlySet<string>) {
  const tandai = useTandaiKemajuan();
  const tandaiPribadi = useTandaiButirPribadi();
  const hapusPribadi = useHapusButirPribadi();
  return {
    onAlih: (b: ButirDaftarPeriksa) =>
      pribadiIds.has(b.id)
        ? tandaiPribadi.mutate({ id: b.id, selesai: !selesai.has(b.id) })
        : tandai.mutate({ butirId: b.id, selesai: !selesai.has(b.id) }),
    onHapus: (b: ButirDaftarPeriksa) => hapusPribadi.mutate(b.id),
    galat: tandai.isError || tandaiPribadi.isError || hapusPribadi.isError,
  };
}

// Kelas/jalur belum dipilih: butir pribadi tetap tampil (tanpa bilah kemajuan,
// karena X/Y baru bermakna setelah butir umum tersaring).
function ButirPribadiSaja() {
  const { data } = useButirPribadi();
  const selesai = new Set((data ?? []).filter((b) => b.selesai_pada).map((b) => b.id));
  const pribadiIds = new Set((data ?? []).map((b) => b.id));
  const aksi = useAksiButir(pribadiIds, selesai);
  if (!data?.length) return null;

  return (
    <>
      {aksi.galat ? <Text style={s.galat}>Perubahan terakhir belum tersimpan. Coba lagi.</Text> : null}
      {gabungButirPribadi([], data).map((k) => (
        <SeksiKategori key={k.id} kategori={k} selesai={selesai} pribadiIds={pribadiIds} aksi={aksi} />
      ))}
    </>
  );
}

// .keping — pilihan berbentuk pil.
function BarisKeping<T extends string>({
  label,
  opsi,
  tampil,
  aktif,
  onPilih,
}: {
  label: string;
  opsi: readonly T[];
  tampil: (v: T) => string;
  aktif: string | null;
  onPilih: (v: T) => void;
}) {
  return (
    <View style={s.barisKeping}>
      <Text style={s.kepingLabel}>{label}</Text>
      <View style={s.kepingDaftar} role="radiogroup">
        {opsi.map((v) => {
          const pilihan = aktif === v;
          return (
            <Pressable
              key={v}
              onPress={() => onPilih(v)}
              accessibilityRole="radio"
              aria-checked={pilihan}
              style={StyleSheet.flatten([s.keping, pilihan && s.kepingAktif])}
            >
              <Text style={StyleSheet.flatten([s.kepingTeks, pilihan && s.kepingTeksAktif])}>{tampil(v)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Checklist({ saring }: { saring: SaringanDaftarPeriksa }) {
  const hasil = useProgresDaftarPeriksa(saring);
  const kosong = new Set<string>();
  const aksi = useAksiButir(hasil.data?.pribadiIds ?? kosong, hasil.data?.selesai ?? kosong);

  if (hasil.isError) return <KeadaanGalat />;
  if (!hasil.data) return <Memuat />;

  const { kategori, selesai, pribadiIds, progres } = hasil.data;
  if (!kategori.length) {
    return <Kosong judul="Bagian ini masih kami siapkan." teks="Kalau kamu punya bahannya, kirim ke kami." />;
  }
  // Butir pribadi dan kategori saran (Persiapan Ujian) bukan isi laman SNPMB, jadi tidak
  // memicu catatan "belum diverifikasi" (lib/daftarPeriksa.ts).
  const adaBelumTerverifikasi = perluCatatanSnpmb(kategori, pribadiIds);

  return (
    <>
      <BilahKemajuan progres={progres} />
      {aksi.galat ? <Text style={s.galat}>Perubahan terakhir belum tersimpan. Coba lagi.</Text> : null}
      {kategori.map((k) => (
        <SeksiKategori key={k.id} kategori={k} selesai={selesai} pribadiIds={pribadiIds} aksi={aksi} />
      ))}
      {adaBelumTerverifikasi ? <Sumber>Perlu dicek ke laman resmi SNPMB · belum diverifikasi</Sumber> : null}
    </>
  );
}

// .progress + tiga keadaan teks kemajuan (salinan-teks-lanjut.md §4.4).
function BilahKemajuan({ progres }: { progres: Progres }) {
  return (
    <View style={s.kemajuan}>
      <BilahProgres selesai={progres.selesai} total={progres.total} label="Kemajuan daftar periksa" />
      <Text style={gaya.teksBody}>
        {progres.status === 'kosong'
          ? 'Belum ada yang dicentang — itu wajar kalau baru mulai. Ambil satu yang paling gampang dulu.'
          : progres.status === 'selesai'
            ? 'Bagian persiapannya beres. Sisanya tinggal latihan.'
            : `${progres.selesai} dari ${progres.total} beres. Jalan terus.`}
      </Text>
    </View>
  );
}

function SeksiKategori({
  kategori,
  selesai,
  pribadiIds,
  aksi,
}: {
  kategori: KategoriDaftarPeriksa;
  selesai: ReadonlySet<string>;
  pribadiIds: ReadonlySet<string>;
  aksi: { onAlih: (b: ButirDaftarPeriksa) => void; onHapus: (b: ButirDaftarPeriksa) => void };
}) {
  const catatan = CATATAN_KATEGORI[kategori.id];
  return (
    <View style={s.seksi}>
      <SeksiJudul>{kategori.nama}</SeksiJudul>
      {catatan ? <Text style={s.catatan}>{catatan}</Text> : null}
      <Kartu style={s.kartuButir}>
        {kategori.butir.map((b) => (
          <Centang
            key={b.id}
            label={b.judul}
            tercentang={selesai.has(b.id)}
            onAlih={() => aksi.onAlih(b)}
            onHapus={pribadiIds.has(b.id) ? () => aksi.onHapus(b) : undefined}
          />
        ))}
      </Kartu>
    </View>
  );
}

// .centang — kotak 24px radius-xs, terisi biru saat tercentang. `onHapus`
// hanya untuk butir pribadi (butir umum milik tim konten, tidak bisa dihapus).
function Centang({
  label,
  tercentang,
  onAlih,
  onHapus,
}: {
  label: string;
  tercentang: boolean;
  onAlih: () => void;
  onHapus?: () => void;
}) {
  return (
    <View style={s.barisCentang}>
      <Pressable onPress={onAlih} accessibilityRole="checkbox" aria-checked={tercentang} style={s.centang}>
        <View style={StyleSheet.flatten([s.kotak, tercentang && s.kotakAktif])}>
          {tercentang ? <Ikon nama="centang" ukuran={16} warna={color.white} tebal={2.5} /> : null}
        </View>
        <Text style={s.centangLabel}>{label}</Text>
      </Pressable>
      {onHapus ? (
        <Pressable onPress={onHapus} accessibilityRole="button" accessibilityLabel={`Hapus: ${label}`} style={s.hapus}>
          <Text style={s.hapusTeks}>Hapus</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  saring: { gap: spacing.s3, padding: spacing.s4 },
  barisKeping: { gap: spacing.s2 },
  kepingLabel: { ...teks.bodySm, fontFamily: font.medium, color: color.ink700 },
  kepingDaftar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
  keping: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.s4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderSoft,
    backgroundColor: color.white,
  },
  // Putih 14 px di blue400 hanya 2,63:1 → blue600 5,69:1 (LANJUT_027).
  kepingAktif: { backgroundColor: color.blue600, borderColor: color.blue600 },
  kepingTeks: { ...teks.bodySm, fontFamily: font.medium, color: color.ink700 },
  kepingTeksAktif: { color: color.white },
  kemajuan: { gap: spacing.s3 },
  seksi: { gap: spacing.s3 },
  catatan: { ...teks.caption, color: color.textMuted },
  kartuButir: { gap: 2, paddingVertical: spacing.s2 },
  barisCentang: { flexDirection: 'row', alignItems: 'center', gap: spacing.s2 },
  centang: { flexDirection: 'row', alignItems: 'center', gap: spacing.s3, minHeight: 44, flex: 1 },
  hapus: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  hapusTeks: { ...teks.caption, color: color.textLink, fontFamily: font.semibold },
  kotak: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: color.borderSoft,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kotakAktif: { backgroundColor: color.blue400, borderColor: color.blue400 },
  centangLabel: { ...teks.body, color: color.textBody, flex: 1 },
  galat: { ...teks.caption, color: color.blue600 },
});
