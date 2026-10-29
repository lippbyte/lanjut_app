import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { usePosisi } from '../../hooks/usePosisi';
import { KEBINGUNGAN, NAMA_TAHAP, type Kebingungan, type Tahap } from '../../lib/cekPosisi';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { BilahProgres, Ikon, Kartu, Kepala, Lencana, Memuat, Penafian, SeksiJudul, Tombol, gaya } from '../ui';
import { DaftarOpsi, OpsiPil } from './auth/AuthUI';
import { SeksiKesiapanUjian } from './KesiapanUjian';
import { BukanKelas12, useUntukKelas12 } from './KhususKelas12';
import { PilihRumpunFavorit } from './MapelPilihan';
import { TEKS_MAPEL_PILIHAN } from '../../lib/mapelPilihan';

const URUTAN: Tahap[] = ['eksplorasi', 'pemantapan', 'persiapan', 'menjelang'];
// Satu kata per tahap supaya muat di kolom peta tanpa terpotong di tengah kata.
const LABEL_PETA: Record<Tahap, string> = {
  eksplorasi: 'Eksplorasi',
  pemantapan: 'Pemantapan',
  persiapan: 'Persiapan',
  menjelang: 'Menjelang',
};

/**
 * Jalur Saya (v1.1, LANJUT_005; nama baru sejak LANJUT_074): Posisi Kamu → Fokus Sekarang →
 * Langkah Berikutnya. Tahap dihitung dari data akun (lib/cekPosisi.ts),
 * jadi tidak ada kuis yang menanyakan ulang hal yang app sudah tahu.
 */
export function CekPosisiScreen() {
  // LANJUT_035: tahap & tenggatnya berbasis SNBP/SNBT/TKA — hanya kelas 12.
  const kelas12 = useUntukKelas12();
  if (!kelas12) {
    return (
      <View style={gaya.layarIsiRapat}>
        <BukanKelas12 />
      </View>
    );
  }
  return <CekPosisiKelas12 />;
}

function CekPosisiKelas12() {
  // undefined = belum dijawab; null = dilewati. Tidak disimpan ke server
  // (belum ada endpoint preferensi) — hanya mempersonalkan tampilan saat ini.
  const [jawaban, setJawaban] = useState<Kebingungan | null | undefined>(undefined);

  if (jawaban === undefined) return <Pertanyaan onJawab={setJawaban} />;
  return <Hasil kebingungan={jawaban} onUlang={() => setJawaban(undefined)} />;
}

/** Satu pertanyaan ringan sebelum hasil. Tidak mengubah tahap, hanya kalimat fokus. */
function Pertanyaan({ onJawab }: { onJawab: (k: Kebingungan | null) => void }) {
  const [pilihan, setPilihan] = useState<Kebingungan | null>(null);
  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala
        judul="Apa yang paling bikin kamu bingung sekarang?"
        pengantar="Opsional. Jawabanmu cuma dipakai untuk menyesuaikan saran di halaman berikutnya."
      />
      <DaftarOpsi>
        {KEBINGUNGAN.map((k) => (
          <OpsiPil key={k.id} label={k.label} aktif={pilihan === k.id} onPress={() => setPilihan(k.id)} />
        ))}
      </DaftarOpsi>
      <Tombol label="Lihat posisiku" besar penuh onPress={() => onJawab(pilihan)} />
      <Tombol label="Lewati" varian="hantu" onPress={() => onJawab(null)} />
    </View>
  );
}

function Hasil({ kebingungan, onUlang }: { kebingungan: Kebingungan | null; onUlang: () => void }) {
  const router = useRouter();
  const { isPending, posisi, ujian } = usePosisi(kebingungan);

  if (isPending) return <Memuat />;

  const ke = URUTAN.indexOf(posisi.tahap);

  return (
    <View style={gaya.layarIsiRapat}>
      <SeksiJudul>Posisi Kamu</SeksiJudul>
      <Kartu varian="brand">
        {/* "resmi" (blue600 di blue100, 5,0:1), bukan "ondark" (putih di putih 22%, 1,3:1). */}
        <Lencana varian="resmi">
          Tahap {ke + 1} dari {URUTAN.length}
        </Lencana>
        <Text style={s.tahap}>{posisi.nama}</Text>
        <Text style={s.ringkas}>{posisi.ringkas}</Text>
      </Kartu>

      {/* Peta tahap: semua tahap tampil, yang sekarang disorot. */}
      <View style={s.peta} role="list">
        {URUTAN.map((t, i) => (
          <View
            key={t}
            style={s.petaButir}
            role="listitem"
            aria-label={NAMA_TAHAP[t]}
            aria-current={i === ke ? 'step' : undefined}
          >
            <View style={StyleSheet.flatten([s.titik, i < ke && s.titikLewat, i === ke && s.titikKini])} />
            <Text style={StyleSheet.flatten([s.petaLabel, i === ke && s.petaLabelKini])} numberOfLines={1}>
              {LABEL_PETA[t]}
            </Text>
          </View>
        ))}
      </View>

      <SeksiJudul>Fokus Sekarang</SeksiJudul>
      <Kartu style={s.fokus}>
        {posisi.fokus.map((f) => (
          <View key={f} style={s.fokusBaris}>
            <Ikon nama="centang" ukuran={18} warna={color.blue500} />
            <Text style={s.fokusTeks}>{f}</Text>
          </View>
        ))}
        {posisi.persen !== null ? (
          <View style={s.progres}>
            <Text style={s.label}>Daftar Periksa {posisi.persen}% selesai</Text>
            <BilahProgres selesai={posisi.persen} total={100} label="Kemajuan daftar periksa" />
          </View>
        ) : null}
      </Kartu>

      <SeksiJudul>Langkah Berikutnya</SeksiJudul>
      <Tombol label={posisi.langkah.label} besar penuh onPress={() => router.push(posisi.langkah.tujuan)} />
      <Tombol label="Ganti jawaban kebingungan" varian="hantu" kecil onPress={onUlang} />

      {/* Percakapan 15 Okt 2026: seberapa siap (disimpan ke akun) + saran; tidak mengubah tahap. */}
      <SeksiKesiapanUjian ujian={ujian} />

      {/* LANJUT_079: rumpun favorit (1–3) untuk Pilih Mapel per rumpun; disimpan ke minat_rumpun. */}
      <SeksiJudul>{TEKS_MAPEL_PILIHAN.rumpun.judul}</SeksiJudul>
      <PilihRumpunFavorit />

      <Penafian>
        Posisi ini dihitung dari target prodi di Data Akun dan kemajuan Daftar Periksa, termasuk Persiapan Ujian.
        Jawaban kesiapanmu hanya mengubah saran, bukan tahapmu. Ini cuma gambaran, keputusannya tetap di tanganmu.
      </Penafian>
    </View>
  );
}

const s = StyleSheet.create({
  // Teks gelap di kartu gradasi biru muda (LANJUT_027): putih hanya 1,3–2,0:1 di
  // blue200→blue300. textBody 8,7:1, textMuted 4,9:1 di ujung terburuk gradasi.
  tahap: { ...teks.h2, color: color.textBody, marginTop: spacing.s3 },
  ringkas: { ...teks.bodySm, color: color.textMuted, marginTop: spacing.s1 },
  peta: { flexDirection: 'row', gap: spacing.s2 },
  petaButir: { flex: 1, alignItems: 'center', gap: spacing.s1 },
  titik: { width: '100%', height: 6, borderRadius: radius.pill, backgroundColor: color.ink100 },
  titikLewat: { backgroundColor: color.blue200 },
  titikKini: { backgroundColor: color.blue400 },
  // 11px: "Pemantapan" tebal harus muat di seperempat kolom 360px.
  petaLabel: { ...teks.caption, fontSize: 11, lineHeight: 16, color: color.textMuted, textAlign: 'center' },
  petaLabelKini: { color: color.blue600, fontFamily: font.semibold },
  fokus: { gap: spacing.s3 },
  fokusBaris: { flexDirection: 'row', gap: spacing.s3, alignItems: 'flex-start' },
  fokusTeks: { ...teks.bodySm, color: color.ink700, flex: 1 },
  progres: { gap: spacing.s2, marginTop: spacing.s1 },
  label: { ...teks.caption, color: color.textMuted },
});
