import React from 'react';
import { Article, H1 } from '@expo/html-elements';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProfilProdi, StatusSumber } from '../../api/types';
import { useButirPribadi, useSimpanButirPribadi } from '../../hooks/useButirPribadi';
import { useEksplorasiTujuan } from '../../hooks/useEksplorasiTujuan';
import { angkaRibuan, kalimatKakiProfil, rasioKeketatan } from '../../lib/eksplorasi';
import { formatTanggal } from '../../lib/linimasa';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { Ikon, Kartu, KeadaanGalat, Kosong, Lencana, Memuat, Penafian, SeksiJudul, Sumber, Tombol, gaya } from '../ui';

// Salinan teks §4.9 (docs/salinan-teks-lanjut.md) — jangan ditulis ulang di sini.
const DISCLAIMER = 'Data ini rangkuman dari SNPMB/BAN-PT, bisa berubah. Cek laman resmi untuk info terkini.';
const SEKSI_KOSONG = 'Bagian ini masih kami siapkan.';
// Salinan teks §4.9, LANJUT_044 — DRAF belum disetujui Khalifa. Juga dipakai
// layar minat SMP/10–11 (EksplorasiKampusScreen, LANJUT_075).
export const PENJELAS_PERKIRAAN =
  'Perkiraan artinya bagian ini disusun dari sumber umum, belum dari sumber resmi, jadi cek lagi ke kampus tujuanmu.';

/**
 * F10 Eksplorasi Tujuan (LANJUT_031). Dibuka dari hasil Pilih Mapel dengan
 * `?prodi=<id>`. Server hanya mengirim profil yang sudah terverifikasi, jadi:
 *   - profil ketemu                → isi lengkap (SDD-F10 §F.2)
 *   - belum ada profil terverifikasi → layar kosong "sedang kami cek"
 *   - prodi ini belum ada profilnya → fallback + daftar yang sudah tersedia
 * Nilai `?prodi=` hanya dipakai untuk MENCARI; tidak pernah ditampilkan.
 */
export function EksplorasiTujuanScreen() {
  const { prodi: prodiParam } = useLocalSearchParams<{ prodi?: string }>();
  const router = useRouter();
  const { data, isPending, isError } = useEksplorasiTujuan();

  if (isPending) return <View style={gaya.layarIsiRapat}><Memuat /></View>;
  if (isError) return <View style={gaya.layarIsiRapat}><KeadaanGalat /></View>;

  const kePilihMapel = () => (router.canGoBack() ? router.back() : router.replace('/pilih-mapel'));
  const profil = prodiParam ? data.find((p) => p.id === prodiParam) : undefined;

  if (profil) return <Profil profil={profil} onLainnya={() => router.setParams({ prodi: '' })} />;

  if (!data.length) {
    return (
      <View style={gaya.layarIsiRapat}>
        <Kosong
          judul="Profil prodi sedang kami cek."
          teks="Peminat, mata kuliah, dan kampus tiap prodi baru tampil di sini setelah dicek ke sumber resmi. Sementara itu, mapel yang dibutuhkan sudah bisa kamu lihat di Pilih Mapel."
          aksi={<Tombol label="Kembali ke Pilih Mapel" varian="sekunder" onPress={kePilihMapel} />}
        />
      </View>
    );
  }

  return <Tersedia daftar={data} adaPermintaan={!!prodiParam} onPilih={(id) => router.setParams({ prodi: id })} />;
}

/** Fallback: prodi yang diminta belum punya profil terverifikasi → tawarkan yang sudah ada. */
function Tersedia({
  daftar,
  adaPermintaan,
  onPilih,
}: {
  daftar: ProfilProdi[];
  adaPermintaan: boolean;
  onPilih: (id: string) => void;
}) {
  const perRumpun = new Map<string, ProfilProdi[]>();
  for (const p of daftar) {
    if (!perRumpun.has(p.rumpun)) perRumpun.set(p.rumpun, []);
    perRumpun.get(p.rumpun)!.push(p);
  }
  return (
    <View style={gaya.layarIsiRapat}>
      {adaPermintaan ? <Kosong judul="Profil lengkap untuk prodi ini belum kami siapkan." /> : null}
      <Text style={s.pengantar}>Yang sudah tersedia:</Text>
      {[...perRumpun.entries()].map(([rumpun, anggota]) => (
        <View key={rumpun} style={s.seksi}>
          <SeksiJudul>{rumpun}</SeksiJudul>
          <View style={s.tumpukRapat}>
            {anggota.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onPilih(p.id)}
                accessibilityRole="link"
                style={({ pressed }) => (pressed ? s.ditekan : undefined)}
              >
                <Kartu style={s.kartuRapat}>
                  <View style={s.baris}>
                    <View style={s.barisIsi}>
                      <Text style={s.barisJudul}>{p.nama}</Text>
                      <Text style={s.caption}>{p.jenjang}</Text>
                    </View>
                    <Ikon nama="panah" ukuran={16} warna={color.ink500} />
                  </View>
                </Kartu>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function LencanaStatus({ status }: { status?: StatusSumber }) {
  if (!status) return null;
  // resmi (5,0:1) & neutral (8,1:1) lolos kontras; solid/biasa tidak (LANJUT_027).
  return <Lencana varian={status === 'Terverifikasi' ? 'resmi' : 'neutral'}>{status}</Lencana>;
}

/**
 * LANJUT_044: lencana "Perkiraan" saja tidak menjelaskan artinya. Satu
 * kalimat di bawah lencana supaya siswa tidak membaca isi perkiraan sebagai
 * fakta. Kaki halaman ikut dibedakan per bagian sejak LANJUT_045.
 */
function PenjelasStatus({ status }: { status?: StatusSumber }) {
  return status === 'Perkiraan' ? <Text style={gaya.teksKecil}>{PENJELAS_PERKIRAAN}</Text> : null;
}

function Profil({ profil: p, onLainnya }: { profil: ProfilProdi; onLainnya: () => void }) {
  const rasio = rasioKeketatan(p.diterima, p.peminat?.jumlah);
  const sumberPeminat = p.peminat
    ? ['Sumber:', p.peminat.sumber, p.peminat.jalur, p.peminat.tahun].filter(Boolean).join(' ') +
      (p.peminat.kampus ? `, ${p.peminat.kampus}` : '')
    : null;

  return (
    <View style={gaya.layarIsiRapat}>
      <View style={s.kepala}>
        <Text style={s.eyebrow}>Eksplorasi Tujuan</Text>
        <H1 style={s.judul}>{p.nama}</H1>
        <View style={s.lencanaBaris}>
          <Lencana varian="neutral">{p.jenjang}</Lencana>
          {p.badge_relevan_smk ? <Lencana varian="resmi">Relevan untuk RPL/TKJ/Teknik</Lencana> : null}
        </View>
      </View>

      {/* Dua metrik selalu berpasangan (spec F10 §3), walau salah satunya "—". */}
      <Kartu style={s.metrikKartu}>
        {p.peminat ? (
          <>
            <View style={s.metrik}>
              <View style={s.metrikKolom}>
                <Text style={s.angka}>{angkaRibuan(p.peminat.jumlah)}</Text>
                <Text style={s.caption}>Pendaftar</Text>
              </View>
              <View style={s.metrikKolom}>
                <Text style={s.angka}>{rasio ?? '—'}</Text>
                <Text style={s.caption}>Diterima dari pendaftar</Text>
              </View>
            </View>
            {rasio ? null : <Text style={s.caption}>Angka diterima belum tersedia.</Text>}
            <View style={s.sumberBaris}>
              <Text style={[s.caption, s.flex]}>{sumberPeminat}</Text>
              <LencanaStatus status={p.status_sumber.peminat} />
            </View>
            <PenjelasStatus status={p.status_sumber.peminat} />
          </>
        ) : (
          <Text style={gaya.teksKecil}>{SEKSI_KOSONG}</Text>
        )}
      </Kartu>

      <Seksi judul="Yang akan kamu pelajari" status={p.status_sumber.mata_kuliah}>
        {p.mata_kuliah.length ? (
          p.mata_kuliah.map((mk) => <KartuRapat key={mk} teks={mk} />)
        ) : (
          <Text style={gaya.teksKecil}>{SEKSI_KOSONG}</Text>
        )}
        {p.catatan_studi ? <Text style={s.caption}>{p.catatan_studi}</Text> : null}
      </Seksi>

      {/* Tidak ada angka gaji di mana pun (spec F10 §3). */}
      <Seksi judul="Ke mana lulusannya" status={p.status_sumber.profesi}>
        {p.profesi.length ? (
          p.profesi.map((pr) => <KartuRapat key={pr} teks={pr} />)
        ) : (
          <Text style={gaya.teksKecil}>{SEKSI_KOSONG}</Text>
        )}
      </Seksi>

      {/* Urutan kampus mengikuti data (SDD-F10 §C.4) — tidak diurutkan ulang. */}
      <Seksi judul="Kampus yang cocok" status={p.status_sumber.kampus}>
        {p.kampus.length ? (
          p.kampus.map((k) => (
            <Article key={k.nama}>
              <Kartu varian={k.jenis === 'PTN Vokasi' ? 'outline' : 'biasa'} style={s.kampus}>
                <Text style={s.kampusNama}>{k.nama}</Text>
                <View style={s.lencanaBaris}>
                  <Lencana varian="neutral">{k.jenis}</Lencana>
                  {k.jalur_masuk.map((j) => (
                    <Lencana key={j} varian="resmi">
                      {j}
                    </Lencana>
                  ))}
                </View>
              </Kartu>
            </Article>
          ))
        ) : (
          <Text style={gaya.teksKecil}>{SEKSI_KOSONG}</Text>
        )}
      </Seksi>

      <Penafian>{DISCLAIMER}</Penafian>
      {/* LANJUT_045: per bagian — tidak menyiratkan bagian "Perkiraan" sudah dicek. */}
      <Sumber>{kalimatKakiProfil(p.status_sumber, formatTanggal(p.diperiksa_pada))}</Sumber>
      <SimpanRisetKampus prodiId={p.id} />
      <Tombol label="Lihat prodi lain" varian="garis" besar penuh onPress={onLainnya} />
    </View>
  );
}

/**
 * "Simpan ke Daftar Periksa" (salinan §4.9) → butir pribadi "Cari tahu lebih
 * lanjut soal [prodi]" di kategori Riset Kampus, BELUM dicentang (LANJUT_034,
 * sama dengan PWA). Keadaan tersimpan dibaca dari butir akun, jadi tetap
 * benar saat layar dibuka lagi.
 */
function SimpanRisetKampus({ prodiId }: { prodiId: string }) {
  const router = useRouter();
  const { data: butir } = useButirPribadi();
  const simpan = useSimpanButirPribadi();
  const tersimpan = butir?.some((b) => b.jenis === 'riset_kampus' && b.prodi_id === prodiId);

  if (tersimpan) {
    return (
      <View style={s.tersimpan}>
        <Text style={gaya.teksBody}>Sudah masuk Daftar Periksa.</Text>
        <Tombol label="Lihat Daftar Periksa" varian="sekunder" besar penuh onPress={() => router.push('/daftar-periksa')} />
      </View>
    );
  }
  return (
    <View style={s.tersimpan}>
      {simpan.isError ? <Text style={s.galat}>Belum tersimpan. Coba lagi sebentar lagi.</Text> : null}
      <Tombol
        label="Simpan ke Daftar Periksa"
        besar
        penuh
        proses={simpan.isPending}
        onPress={() => simpan.mutate({ jenis: 'riset_kampus', prodi_id: prodiId })}
      />
    </View>
  );
}

function Seksi({ judul, status, children }: { judul: string; status?: StatusSumber; children: React.ReactNode }) {
  return (
    <View style={s.seksi}>
      <View style={s.seksiKepala}>
        <SeksiJudul>{judul}</SeksiJudul>
        <LencanaStatus status={status} />
      </View>
      <PenjelasStatus status={status} />
      <View style={s.tumpukRapat}>{children}</View>
    </View>
  );
}

function KartuRapat({ teks: isi }: { teks: string }) {
  return (
    <Kartu style={s.kartuRapat}>
      <Text style={s.barisJudul}>{isi}</Text>
    </Kartu>
  );
}

const s = StyleSheet.create({
  kepala: { gap: spacing.s2 },
  eyebrow: { ...teks.label, color: color.blue600 },
  judul: { ...teks.h2, color: color.textBody, marginVertical: 0 },
  lencanaBaris: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
  metrikKartu: { gap: spacing.s3 },
  metrik: { flexDirection: 'row', gap: spacing.s3 },
  metrikKolom: { flex: 1, gap: 2 },
  angka: { ...teks.h2, color: color.textBody },
  sumberBaris: { flexDirection: 'row', alignItems: 'center', gap: spacing.s2 },
  flex: { flex: 1 },
  seksi: { gap: spacing.s3 },
  seksiKepala: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s3 },
  tumpukRapat: { gap: spacing.s2 },
  kartuRapat: { padding: spacing.s3, borderRadius: radius.md },
  kampus: { gap: spacing.s2 },
  kampusNama: { ...teks.h3, color: color.textBody },
  baris: { flexDirection: 'row', alignItems: 'center', gap: spacing.s3 },
  barisIsi: { flex: 1, minWidth: 0 },
  barisJudul: { ...teks.body, color: color.textBody },
  caption: { ...teks.caption, color: color.textMuted },
  pengantar: { ...teks.body, fontFamily: font.medium, color: color.textBody },
  tersimpan: { gap: spacing.s2 },
  galat: { ...teks.caption, color: color.blue600, textAlign: 'center' },
  ditekan: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
