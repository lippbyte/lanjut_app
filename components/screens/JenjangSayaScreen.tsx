import React, { useState } from 'react';
import { Article } from '@expo/html-elements';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ButirKhususSmk } from '../../api/types';
import { useButirKhususSmk } from '../../hooks/useButirKhususSmk';
import type { KelompokJenjang } from '../../lib/jenjang';
import { isiJenjangSaya, type CatatanJenjang, type PembukaJenjang } from '../../lib/jenjangSaya';
import { butirSmkUntuk } from '../../lib/khususSmk';
import { formatTanggal } from '../../lib/linimasa';
import { lembagaSumber } from '../../lib/sumber';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { Ikon, Kartu, KartuPintu, KeadaanGalat, Kepala, Memuat, SeksiJudul, Sumber, Tombol, gaya } from '../ui';

// ---------------------------------------------------------------------------
// Pengantar, kartu pembuka, pintu, dan kartu catatan per kelas ada di
// lib/jenjangSaya.ts (LANJUT_069). Teks seksi SMK di bawah: TEKS DRAF
// (LANJUT_037), belum disetujui Khalifa — salinan-teks-lanjut.md §4.2,
// kecuali PEMBUKA_SMK_KELAS_12: teks lama halaman Khusus SMK, dipakai apa adanya.
// ---------------------------------------------------------------------------
const PEMBUKA_SMK_KELAS_10_11 = 'Beberapa hal memang beda buat anak SMK. Yang ini sudah bisa kamu siapkan dari sekarang.';
const PEMBUKA_SMK_KELAS_12 =
  'Sebagian aturan seleksi menganggap semua pendaftar berasal dari SMA. Halaman ini merangkum bagian yang tidak berlaku sama untuk kita — dan apa yang bisa dilakukan.';

/**
 * Jenjang Saya (LANJUT_037, isi SMP & 10–11 LANJUT_069) — dulu "Khusus SMK"
 * (F2), sekarang hub semua jenjang. Isinya menurut kelas AKUN
 * (lib/jenjangSaya.ts `isiJenjangSaya`):
 *   - SMP 7–9     → kartu pembuka, pintu Eksplorasi Tujuan / Gaya Belajar /
 *                   Ngobrol, kartu "SMA, SMK, atau MA?"; TIDAK ada bagian SMK.
 *   - kelas 10–11 → kartu pembuka, pintu Pilih Mapel / Eksplorasi Tujuan /
 *                   Arsip / Level-In / Daftar Periksa; bagian SMK hanya butir
 *                   tanpa SNBP/PDSS/UTBK/kuota (lib/khususSmk.ts daftar izin).
 *   - kelas 12    → pintu lama + bagian SMK lengkap (tidak diubah LANJUT_069).
 * Bagian "Kalau kamu anak SMK" hanya untuk jenis sekolah SMK (LANJUT_038);
 * siswa SMA/MA kelas 10–12 tidak melihatnya.
 */
export function JenjangSayaScreen() {
  const router = useRouter();
  const { pengguna } = useSesi();
  const { kelompok, pengantar, pembuka, pintu, catatan } = isiJenjangSaya(pengguna?.kelas ?? null);
  // LANJUT_038: menurut jenis sekolah, bukan rentang kelas. Kelas 7–9 selalu
  // SMP, jadi syarat kelompok hanya menjaga data yang tidak konsisten.
  const anakSmk = pengguna?.jenis_sekolah === 'SMK' && (kelompok === 'kelas10_11' || kelompok === 'kelas12');

  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul="Jenjang Saya" pengantar={pengantar} />

      {pembuka ? <KartuPembuka pembuka={pembuka} onPress={() => router.push(pembuka.href)} /> : null}

      <View style={s.seksi}>
        <SeksiJudul>Mulai dari sini</SeksiJudul>
        {pintu.map((p) => (
          <KartuPintu key={p.id} ikon={p.ikon} judul={p.judul} keterangan={p.keterangan} onPress={() => router.push(p.href)} />
        ))}
      </View>

      {catatan ? <KartuCatatan catatan={catatan} /> : null}

      {anakSmk && kelompok ? <SeksiSmk kelompok={kelompok} /> : null}
    </View>
  );
}

// Pola sama dengan kartu "Mulai dari Sini" di Beranda (LinimasaScreen).
function KartuPembuka({ pembuka, onPress }: { pembuka: PembukaJenjang; onPress: () => void }) {
  return (
    <Kartu varian="soft" style={s.pembuka}>
      <Text style={s.catatanJudul}>{pembuka.judul}</Text>
      <Text style={gaya.teksKecil}>{pembuka.teks}</Text>
      <Tombol label={pembuka.labelTombol} varian="utama" onPress={onPress} />
    </Kartu>
  );
}

function KartuCatatan({ catatan }: { catatan: CatatanJenjang }) {
  return (
    <Kartu varian="soft">
      <Text style={s.catatanJudul}>{catatan.judul}</Text>
      <Text style={gaya.teksKecil}>{catatan.isi}</Text>
      {catatan.butir.map((b) => (
        <Text key={b.nama} style={gaya.teksKecil}>
          {'• '}
          <Text style={s.catatanNama}>{b.nama}</Text> {b.keterangan}
        </Text>
      ))}
      {catatan.catatanCek ? <Text style={s.catatanCek}>{catatan.catatanCek}</Text> : null}
    </Kartu>
  );
}

function SeksiSmk({ kelompok }: { kelompok: KelompokJenjang }) {
  const { data, isPending, isError } = useButirKhususSmk();
  const butir = butirSmkUntuk(data ?? [], kelompok);
  // Semua tertutup di awal supaya seluruh judul terlihat sekaligus.
  const [terbuka, setTerbuka] = useState<Set<string>>(() => new Set());

  if (!isPending && !isError && !butir.length) return null;

  const alih = (id: string) =>
    setTerbuka((lama) => {
      const baru = new Set(lama);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });

  return (
    <View style={s.seksi}>
      <SeksiJudul>Kalau kamu anak SMK</SeksiJudul>
      <Text style={gaya.teksBody}>{kelompok === 'kelas12' ? PEMBUKA_SMK_KELAS_12 : PEMBUKA_SMK_KELAS_10_11}</Text>
      {isPending ? (
        <Memuat />
      ) : isError ? (
        <KeadaanGalat />
      ) : (
        <View style={s.daftar}>
          {butir.map((b) => (
            <ButirKartu key={b.id} butir={b} buka={terbuka.has(b.id)} onAlih={() => alih(b.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

// F2 — kartu buka-tutup berpasangan "apa yang berbeda" + "apa yang bisa dilakukan".
function ButirKartu({ butir, buka, onAlih }: { butir: ButirKhususSmk; buka: boolean; onAlih: () => void }) {
  const lembaga = lembagaSumber(butir.url_sumber);
  return (
    <Article>
      <Kartu>
        <Pressable
          onPress={onAlih}
          accessibilityRole="button"
          aria-expanded={buka}
          style={s.ringkasan}
        >
          <Text style={s.judul}>{butir.judul}</Text>
          <View style={buka ? s.panahBuka : undefined}>
            <Ikon nama="panah" ukuran={18} warna={buka ? color.blue600 : color.ink500} />
          </View>
        </Pressable>

        {buka ? (
          <View style={s.pasangan}>
            <View style={StyleSheet.flatten([s.blok, s.blokBeda])}>
              <Text style={StyleSheet.flatten([s.label, s.labelBeda])}>Apa yang berbeda</Text>
              <Text style={gaya.teksKecil}>{butir.apa_yang_beda}</Text>
            </View>
            <View style={StyleSheet.flatten([s.blok, s.blokBisa])}>
              <Text style={StyleSheet.flatten([s.label, s.labelBisa])}>Apa yang bisa dilakukan</Text>
              <Text style={gaya.teksKecil}>{butir.apa_yang_bisa_dilakukan}</Text>
            </View>
            <Sumber>
              {butir.diperiksa_pada
                ? `Diperbarui dari ${lembaga} · dicek ${formatTanggal(butir.diperiksa_pada)}`
                : `Perlu dicek ke ${lembaga} · belum diverifikasi`}
            </Sumber>
          </View>
        ) : null}
      </Kartu>
    </Article>
  );
}

const s = StyleSheet.create({
  seksi: { gap: spacing.s3 },
  catatanJudul: { ...teks.title, fontFamily: font.semibold, color: color.textBody, marginBottom: spacing.s1 },
  catatanNama: { fontFamily: font.semibold, color: color.textBody },
  catatanCek: { ...teks.caption, color: color.textMuted, marginTop: spacing.s2 },
  pembuka: { gap: spacing.s3 },
  daftar: { gap: spacing.s4 },
  ringkasan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s3 },
  judul: { ...teks.title, fontFamily: font.semibold, color: color.textBody, flex: 1 },
  panahBuka: { transform: [{ rotate: '90deg' }] },
  // .pasangan
  pasangan: { gap: spacing.s3, marginTop: spacing.s4 },
  blok: { borderRadius: radius.md, padding: spacing.s3, gap: spacing.s1 },
  blokBeda: { backgroundColor: color.statusAttentionBg },
  blokBisa: { backgroundColor: color.statusOkBg },
  label: { ...teks.label },
  labelBeda: { color: color.blue600 },
  labelBisa: { color: color.statusOkFg },
});
