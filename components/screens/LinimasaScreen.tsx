import React, { useState } from 'react';
import { Article, H1 } from '@expo/html-elements';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { BannerBeranda, EventSekolah } from '../../api/types';
import { useTahapanLinimasa } from '../../hooks/useTahapanLinimasa';
import { useBannerBeranda } from '../../hooks/useBannerBeranda';
import { useButirPribadi } from '../../hooks/useButirPribadi';
import { useEventSekolah } from '../../hooks/useEventSekolah';
import { useKemajuan } from '../../hooks/useKemajuan';
import { useRiwayatLatihan } from '../../hooks/useLatihan';
import { useKartuSaya } from '../../hooks/useKartu';
import { useSaranHarian } from '../../hooks/useLevelIn';
import { useMapel } from '../../hooks/useMapel';
import { namaMapel } from '../../lib/arsip';
import {
  apakahPunyaKemajuan,
  bannerBeranda,
  daftarKartuBeranda,
  hitungJumlahCentang,
  hitungProgresBeranda,
  infoMulaiDariSini,
  pisahKepalaBeranda,
  teksSapaan,
  urutanBeranda,
  type BagianBeranda,
} from '../../lib/beranda';
import { TEKS_EVENT, eventTerdekat, labelJenis, selisihHari, teksHitungMundur, untukPersiapanEvent } from '../../lib/eventSekolah';
import type { Kelas } from '../../lib/jenjang';
import { TEKS_LEVELIN, latihanBerikutnya } from '../../lib/levelin';
import {
  formatRentang,
  formatTanggal,
  tampilanInfoPenting,
  tanggalMomen,
  turunkanLinimasa,
  type TahapanTurunan,
} from '../../lib/linimasa';
import { lembagaSumber } from '../../lib/sumber';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, gradient, radius, shadow, spacing, teks } from '../../theme/tokens';
import {
  BilahProgres,
  Ikon,
  Kartu,
  SeksiJudul,
  Sumber,
  Tombol,
  gaya,
} from '../ui';

const LAMAN_SNPMB = 'https://snpmb.bppp.kemdikbud.go.id/';

/**
 * Tab Beranda — padanan MVP-PWA/beranda.html. Dari atas (LANJUT_074,
 * lib/beranda.ts `urutanBeranda`): sapaan, kartu hero tenggat (kelas 12), baris
 * progres, grid menu launcher per jenjang (LANJUT_065), Info Penting dari data
 * terverifikasi (kelas 12, LANJUT_066/072b), carousel banner (LANJUT_073/074),
 * lalu kalimat K1 dan kartu "Mulai dari Sini" bila akun baru.
 *
 * Sapaan dan hero ada di kepala bergradasi yang menyatu dengan app bar; sisanya di
 * lembar putih bersudut bulat yang sedikit menimpa kepala (gaya header GoPay —
 * pilihan di percakapan LANJUT_074, belum disetujui PM).
 */
export function LinimasaScreen() {
  const router = useRouter();
  const { pengguna } = useSesi();
  const { width } = useWindowDimensions();
  const kelas = pengguna?.kelas ?? null;
  const kartu = daftarKartuBeranda(kelas);

  // Ambil data progres & aktivitas pengguna dari server
  const kemajuanQuery = useKemajuan();
  const butirPribadiQuery = useButirPribadi();
  const latihanQuery = useRiwayatLatihan();
  const kartuQuery = useKartuSaya();

  // LANJUT_070: centang butir umum (/kemajuan) dan butir pribadi sama-sama dihitung.
  const jumlahCentang = hitungJumlahCentang({
    kemajuan: kemajuanQuery.data,
    butirPribadi: butirPribadiQuery.data,
  });
  const jumlahLatihan = latihanQuery.data?.length ?? 0;
  const jumlahKartu = kartuQuery.data?.length ?? 0;

  const punyaKemajuan = apakahPunyaKemajuan({
    jumlahCentang,
    jumlahLatihan,
    jumlahKartu,
  });

  const progres = hitungProgresBeranda({
    prodiImpian: pengguna?.prodi_impian,
    jumlahCentang,
    jumlahLatihan,
  });

  const kolom = width < 360 ? 3 : 4;
  const memuatData =
    kemajuanQuery.isPending || butirPribadiQuery.isPending || latihanQuery.isPending || kartuQuery.isPending;

  // LANJUT_073/074: carousel hanya bila endpoint berhasil dan ada banner yang masih
  // berlaku (maks. 3). Memuat, kosong, atau gagal → tidak tampil, tanpa teks pengganti.
  const bannerQuery = useBannerBeranda();
  const banner = bannerQuery.isError ? [] : bannerBeranda(bannerQuery.data?.banner);

  // LANJUT_076: kartu "Persiapan Terdekat" (LANJUT_076b: hanya kelas 7–9). Saklar mati,
  // kebijakan belum diterima, memuat, atau gagal → tidak tampil, tanpa teks pengganti (aturan 072).
  const persiapanAktif = untukPersiapanEvent(kelas);
  const eventQuery = useEventSekolah(persiapanAktif);
  const persiapan = persiapanAktif && !eventQuery.isError ? eventTerdekat(eventQuery.data) : null;

  // LANJUT_077: kartu "Latihan berikutnya" (semua jenjang) dari saran harian 042
  // (GET /saran-harian, dihitung server). Data belum cukup, memuat, atau gagal →
  // tidak tampil, tanpa teks pengganti (aturan 072).
  const saranQuery = useSaranHarian();
  const latihan = saranQuery.isError ? null : latihanBerikutnya(saranQuery.data);

  // Urutan tampil sepenuhnya ditentukan urutanBeranda (lib/beranda.ts, LANJUT_074).
  const urutan = urutanBeranda({
    kelas,
    tampilMulaiDariSini: !memuatData && !punyaKemajuan,
    tampilBanner: banner.length > 0,
    tampilPersiapan: persiapan !== null,
    tampilLatihan: latihan !== null,
  });

  const bagian: Record<BagianBeranda, React.ReactNode> = {
    // Nama panjang (nama_tampilan maks. 60 karakter) dipotong di baris kedua dengan "…".
    sapaan: (
      <Text style={s.sapaan} numberOfLines={2}>
        {teksSapaan(pengguna)}
      </Text>
    ),
    // LANJUT_074: kartu hero tenggat (kelas 12; urutanBeranda hanya memasukkannya untuk kelas 12).
    hero: <KartuHero />,
    banner: banner.length ? <KarouselBanner daftar={banner} /> : null,
    persiapan: persiapan ? <KartuPersiapan event={persiapan} onPress={() => router.push('/daftar-periksa')} /> : null,
    latihan: latihan ? <KartuLatihanBerikutnya mapelId={latihan.mapelId} onMulai={() => router.push(latihan.tujuan)} /> : null,
    judul: <H1 style={s.k1}>Tahu harus ngapain hari ini.</H1>,
    // LANJUT_065 §C: satu baris progres, tepat di atas grid.
    progres: (
      <View style={s.barisProgres}>
        <View style={s.progresTeksBaris}>
          <Text style={s.progresLabel}>{`${progres.selesai} dari ${progres.total} langkah selesai`}</Text>
        </View>
        <BilahProgres selesai={progres.selesai} total={progres.total} label="Progres langkah awal" />
      </View>
    ),
    // LANJUT_065 §A: grid menu launcher 4 kolom (3 kolom bila lebar layar < 360 px).
    grid: (
      <View style={s.gridWadah}>
        {kartu.map((k) => {
          const label = k.labelPendek ?? k.judul;
          return (
            <Pressable
              key={k.id}
              accessibilityRole="button"
              accessibilityLabel={k.judul}
              style={({ pressed }) => [
                s.gridItem,
                { width: `${100 / kolom}%` as any },
                pressed && s.ditekan,
              ]}
              onPress={() => router.push(k.href as any)}
            >
              <View style={s.ikonWadah}>
                <Ikon nama={k.ikon} ukuran={24} warna={color.blue600} />
              </View>
              <Text style={s.gridLabel} numberOfLines={2}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    ),
    // LANJUT_065 §B: kartu "Mulai dari Sini" untuk akun baru / belum punya kemajuan.
    mulai_dari_sini: <KartuMulaiDariSini kelas={kelas} onPress={(href) => router.push(href as any)} />,
    // LANJUT_035, LANJUT_064, LANJUT_066: Info Penting terverifikasi HANYA untuk kelas 12.
    info_penting: <InfoPenting kelas={kelas} />,
  };

  const { kepala, badan } = pisahKepalaBeranda(urutan);

  return (
    <View style={s.akar}>
      <LinearGradient
        colors={gradient.kepala.colors}
        start={gradient.kepala.start}
        end={gradient.kepala.end}
        style={s.kepala}
      >
        {kepala.map((b) => (
          <React.Fragment key={b}>{bagian[b]}</React.Fragment>
        ))}
      </LinearGradient>
      <View style={StyleSheet.flatten([gaya.layarIsi, s.lembar])}>
        {badan.map((b) => (
          <React.Fragment key={b}>{bagian[b]}</React.Fragment>
        ))}
      </View>
    </View>
  );
}

// LANJUT_077: satu mapel dari saran harian Level-In (lib/levelin.ts latihanBerikutnya).
// "Mulai latihan" membuka Latihan dengan mapel yang sama (?mapel=&asal=saran).
function KartuLatihanBerikutnya({ mapelId, onMulai }: { mapelId: string; onMulai: () => void }) {
  const { data: mapel } = useMapel();
  return (
    <Kartu varian="soft" style={s.latihanKartu}>
      <Text style={s.latihanLabel}>{TEKS_LEVELIN.berandaJudul}</Text>
      <View style={s.latihanBaris}>
        <Text style={s.latihanMapel}>{namaMapel(mapelId, mapel)}</Text>
        <Tombol label={TEKS_LEVELIN.berandaTombol} kecil onPress={onMulai} />
      </View>
    </Kartu>
  );
}

// LANJUT_076: satu kartu event terdekat (7 hari sebelum s.d. hari H, lib/eventSekolah.ts).
// Hitung mundur dari selisihHari (hariIniWib) — tidak ada logika tanggal di layar.
// LANJUT_076b: hanya SMP (untukPersiapanEvent); jenis memakai label SMP (UAS/PAS, Ulangan Harian).
function KartuPersiapan({ event, onPress }: { event: EventSekolah; onPress: () => void }) {
  const { data: mapel } = useMapel();
  const namaMapel = event.mapel_id ? mapel?.find((m) => m.id === event.mapel_id)?.nama : undefined;
  const hitung = teksHitungMundur(selisihHari(event.tanggal) ?? 0);
  const jenis = labelJenis(event.jenis);
  const judul = namaMapel ? `${jenis} · ${namaMapel}` : jenis;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${TEKS_EVENT.kartuBerandaJudul}: ${judul}, ${hitung}`}
      style={({ pressed }) => (pressed ? s.ditekan : undefined)}
    >
      <Kartu varian="soft" style={s.persiapanKartu}>
        <Text style={s.persiapanLabel}>{TEKS_EVENT.kartuBerandaJudul}</Text>
        <View style={s.persiapanBaris}>
          <Text style={s.persiapanJudul}>{judul}</Text>
          <Text style={s.persiapanHitung}>{hitung}</Text>
        </View>
      </Kartu>
    </Pressable>
  );
}

// LANJUT_074: carousel banner (paling banyak 3 dari bannerBeranda) — satu kartu per
// halaman, digeser horizontal, indikator titik bila lebih dari satu. Tanpa judul seksi
// dan tanpa tombol tutup.
function KarouselBanner({ daftar }: { daftar: BannerBeranda[] }) {
  const [lebar, setLebar] = useState(0);
  const [aktif, setAktif] = useState(0);
  const saatGeser = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!lebar) return;
    const ke = Math.round(e.nativeEvent.contentOffset.x / lebar);
    setAktif(Math.max(0, Math.min(daftar.length - 1, ke)));
  };

  return (
    <View style={s.karousel} onLayout={(e) => setLebar(e.nativeEvent.layout.width)}>
      {lebar ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={saatGeser}
          scrollEventThrottle={16}
          contentContainerStyle={s.karouselIsi}
        >
          {daftar.map((b) => (
            <View key={b.id} style={StyleSheet.flatten([s.karouselHalaman, { width: lebar }])}>
              <KartuBanner banner={b} />
            </View>
          ))}
        </ScrollView>
      ) : null}
      {daftar.length > 1 ? (
        <View style={s.karouselTitikBaris} aria-hidden importantForAccessibility="no-hide-descendants">
          {daftar.map((b, i) => (
            <View key={b.id} style={StyleSheet.flatten([s.karouselTitik, i === aktif && s.karouselTitikAktif])} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// LANJUT_073: banner pengumuman terkurasi (server/config/banner-beranda.json).
// Judul dan isi apa adanya dari server (sudah dibatasi 80/200 karakter di sana).
// Kartunya sendiri tidak bisa ditekan; satu-satunya tautan adalah "Sumber: …".
function KartuBanner({ banner }: { banner: BannerBeranda }) {
  return (
    <Kartu varian="outline" style={s.bannerKartu}>
      <Text style={s.bannerJudul}>{banner.judul}</Text>
      <Text style={s.bannerIsi}>{banner.isi}</Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(banner.url_sumber)}
        style={({ pressed }) => [s.infoTautan, pressed && s.ditekan]}
      >
        <Text style={s.infoTautanTeks}>Sumber: {banner.sumber}</Text>
      </Pressable>
    </Kartu>
  );
}

function KartuMulaiDariSini({
  kelas,
  onPress,
}: {
  kelas: Kelas | null | undefined;
  onPress: (href: string) => void;
}) {
  const info = infoMulaiDariSini(kelas);

  return (
    <Kartu varian="soft" style={s.mulaiKartu}>
      <Text style={s.mulaiJudul}>{info.judul}</Text>
      <Text style={s.mulaiPenjelas}>{info.penjelas}</Text>
      <Tombol label={info.labelTombol} varian="utama" onPress={() => onPress(info.href)} />
    </Kartu>
  );
}

// LANJUT_074: kartu hero tenggat terdekat (kelas 12), menyatu dengan app bar di kepala
// bergradasi Beranda (warna kartu tenggat lama, gradient.kepala; teks gelap seperti
// dulu). Lebih besar dari kartu lain. Isi sama dengan kartu tenggat sebelumnya, tanpa
// teks baru. Memuat atau gagal → tidak tampil, tanpa pesan.
// Tenggat dan Info Penting memakai satu query yang sama; "hari ini" untuk keduanya =
// hariIniWib (LANJUT_072b), lewat default turunkanLinimasa. LANJUT_066: tanpa data
// terverifikasi yang relevan, tidak ada kartu sama sekali.
function KartuHero() {
  const { data, isPending, isError } = useTahapanLinimasa();
  if (isPending || isError) return null;

  // Angka hari biasa, bukan hitungan detik (§4.1). Belum dimulai → menuju
  // tanggal mulai; sudah berjalan → menuju tutup.
  const { terdekat, sisaHari, momen } = turunkanLinimasa(data ?? []);
  if (!terdekat || !momen || sisaHari === null || sisaHari < 0) return null;

  return (
    <View style={s.hero}>
      <Text style={s.heroAngka}>{sisaHari} hari</Text>
      <Text style={s.heroTeks}>
        menuju {terdekat.judul} {momen === 'mulai' ? 'dimulai' : 'ditutup'},{' '}
        {formatTanggal(tanggalMomen(terdekat, momen))}.
      </Text>
    </View>
  );
}

// LANJUT_066 §A: paling banyak tiga kartu "Info Penting" dari data terverifikasi.
// LANJUT_072b: tanpa tahapan yang sudah lewat; bila semuanya sudah lewat, satu
// kalimat netral. Aturan tanggalnya hanya di lib/linimasa.ts (tampilanInfoPenting).
function InfoPenting({ kelas }: { kelas: Kelas | null | undefined }) {
  const { data, isPending, isError } = useTahapanLinimasa();
  if (isPending || isError) return null;

  const tampilan = tampilanInfoPenting(data ?? [], kelas);
  if (tampilan.jenis === 'sembunyi') return null;

  return (
    <View style={s.seksi}>
      <SeksiJudul>Info Penting</SeksiJudul>
      {tampilan.jenis === 'kartu' ? (
        tampilan.butir.map((b) => <KartuInfoPenting key={b.id} butir={b} />)
      ) : (
        <Text style={gaya.teksKecil}>{tampilan.kalimat}</Text>
      )}
    </View>
  );
}

// Kartu "Info Penting" di Beranda (LANJUT_066 §A).
// Menampilkan judul, tanggal/rentang, label sumber, tanggal periksa, dan tautan ke url_sumber.
function KartuInfoPenting({ butir }: { butir: TahapanTurunan }) {
  return (
    <Kartu style={s.infoKartu}>
      <Text style={s.infoTanggal}>{formatRentang(butir.tanggal_mulai, butir.tanggal_selesai)}</Text>
      <Text style={s.infoJudul}>{butir.judul}</Text>
      <View style={s.infoMetaBaris}>
        <Text style={s.infoMeta}>Sumber: {lembagaSumber(butir.url_sumber)}</Text>
        <Text style={s.infoMeta}>Diperiksa pada {formatTanggal(butir.diperiksa_pada)}</Text>
      </View>
      {butir.url_sumber ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Buka tautan sumber resmi ${butir.judul}`}
          onPress={() => Linking.openURL(butir.url_sumber)}
          style={({ pressed }) => [s.infoTautan, pressed && s.ditekan]}
        >
          <Text style={s.infoTautanTeks}>Buka sumber resmi ↗</Text>
        </Pressable>
      ) : null}
    </Kartu>
  );
}

const s = StyleSheet.create({
  akar: { flexGrow: 1 },
  // LANJUT_074 (pilihan di percakapan): kepala bergradasi yang menyambung app bar —
  // tanpa jarak samping, ujung bawahnya ditimpa lembar putih sedalam radius.lg.
  kepala: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.s2,
    paddingBottom: spacing.s6 + radius.lg,
    gap: spacing.s5,
  },
  lembar: {
    marginTop: -radius.lg,
    paddingTop: spacing.s6,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: color.white,
  },
  sapaan: { ...teks.title, fontFamily: font.semibold, color: color.textBody },
  k1: { ...teks.title, color: color.textBody, marginVertical: 0 },
  // LANJUT_074: hero tenggat di atas gradasi biru muda — teks gelap seperti kartu tenggat
  // lama (putih di gradasi itu hanya 1,3–2,0:1, LANJUT_027). textBody ±8,7:1 dan
  // textMuted ±4,9:1 di ujung tergelap gradasi (blue300).
  hero: { gap: spacing.s1 },
  heroAngka: { ...teks.h1, fontSize: 40, lineHeight: 46, color: color.textBody },
  heroTeks: { ...teks.bodyLg, color: color.textMuted },
  // LANJUT_074: carousel banner
  karousel: { gap: spacing.s2 },
  karouselIsi: { alignItems: 'stretch' },
  karouselHalaman: { alignSelf: 'stretch' },
  karouselTitikBaris: { flexDirection: 'row', justifyContent: 'center', gap: spacing.s2 },
  karouselTitik: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.ink300 },
  karouselTitikAktif: { backgroundColor: color.blue600 },
  seksi: { gap: spacing.s3 },
  butir: { flexDirection: 'row', gap: spacing.s4 },
  butirLewat: { opacity: 0.55 },
  rel: { width: 20, alignItems: 'center' },
  titik: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 5,
    backgroundColor: color.white,
    borderWidth: 2,
    borderColor: color.ink300,
  },
  titikLewat: { backgroundColor: color.statusOk, borderColor: color.statusOk },
  titikSoon: { backgroundColor: color.blue400, borderColor: color.blue400 },
  garis: { flex: 1, width: 2, backgroundColor: color.borderSoft, marginTop: 6, borderRadius: 1 },
  teks: { flex: 1, paddingBottom: spacing.s6 },
  teksTerakhir: { paddingBottom: 0 },
  tanggal: { ...teks.caption, color: color.textMuted },
  // LANJUT_066: Kartu Info Penting
  infoKartu: {
    gap: spacing.s2,
    padding: spacing.s4,
  },
  infoTanggal: {
    ...teks.caption,
    color: color.textMuted,
  },
  infoJudul: {
    ...teks.title,
    fontFamily: font.semibold,
    color: color.textBody,
  },
  infoMetaBaris: {
    gap: 2,
  },
  infoMeta: {
    ...teks.caption,
    color: color.ink500,
  },
  infoTautan: {
    alignSelf: 'flex-start',
    marginTop: spacing.s1,
  },
  infoTautanTeks: {
    ...teks.caption,
    fontFamily: font.medium,
    color: color.blue600,
    textDecorationLine: 'underline',
  },
  // LANJUT_073: Banner Beranda (satu kartu; di carousel mengisi tinggi halaman)
  bannerKartu: {
    flex: 1,
    gap: spacing.s2,
    padding: spacing.s4,
  },
  bannerJudul: {
    ...teks.title,
    fontFamily: font.semibold,
    color: color.textBody,
  },
  bannerIsi: {
    ...teks.bodySm,
    color: color.textBody,
  },
  // LANJUT_077: Latihan berikutnya
  latihanKartu: { gap: spacing.s2, padding: spacing.s4 },
  latihanLabel: { ...teks.label, color: color.blue600 },
  latihanBaris: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s3 },
  latihanMapel: { ...teks.title, fontFamily: font.semibold, color: color.textBody, flex: 1 },
  // LANJUT_076: Persiapan Terdekat
  persiapanKartu: { gap: spacing.s1, padding: spacing.s4 },
  persiapanLabel: { ...teks.label, color: color.blue600 },
  persiapanBaris: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.s3 },
  persiapanJudul: { ...teks.title, fontFamily: font.semibold, color: color.textBody, flex: 1 },
  persiapanHitung: { ...teks.bodySm, fontFamily: font.semibold, color: color.textMuted },
  // LANJUT_065: Mulai dari Sini
  mulaiKartu: {
    gap: spacing.s3,
    padding: spacing.s5,
  },
  mulaiJudul: {
    ...teks.title,
    fontFamily: font.semibold,
    color: color.textBody,
  },
  mulaiPenjelas: {
    ...teks.bodySm,
    color: color.textMuted,
  },
  // LANJUT_065: Baris Progres Sederhana
  barisProgres: {
    gap: spacing.s2,
  },
  progresTeksBaris: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progresLabel: {
    ...teks.caption,
    fontFamily: font.medium,
    color: color.textMuted,
  },
  // LANJUT_065: Grid Menu Launcher
  gridWadah: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.s1,
    rowGap: spacing.s5,
  },
  gridItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.s1,
    gap: spacing.s2,
  },
  ikonWadah: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: color.surfaceCard,
    borderWidth: 1,
    borderColor: color.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.s1,
  },
  gridLabel: {
    fontFamily: font.medium,
    fontSize: 11,
    lineHeight: 14,
    color: color.textBody,
    textAlign: 'center',
  },
  ditekan: {
    opacity: 0.7,
  },
});
