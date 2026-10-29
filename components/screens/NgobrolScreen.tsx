import React, { useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';

import type { KartuBantuan, TautanNgobrol } from '../../api/types';
import { useKartuBantuan } from '../../hooks/useKartuBantuan';
import { usePersetujuan } from '../../hooks/usePersetujuan';
import { useStatusNgobrol } from '../../hooks/useStatusNgobrol';
import { mikrofonNgobrolAktif } from '../../lib/fiturApp';
import { labelGayaBelajar } from '../../lib/gayaBelajar';
import { keadaanKebijakan } from '../../lib/kebijakanPrivasi';
import { PANJANG_PESAN_MAKS, TEKS_NGOBROL } from '../../lib/ngobrol';
import { kartuTautan } from '../../lib/tautanNgobrol';
import { BAHASA_PENGENALAN, cariPengenalSuara, gabungDraf, teksDariHasil, type PengenalSuara } from '../../lib/suara';
import { useSesi } from '../../providers/AuthProvider';
import { useObrolan, type Pesan } from '../../providers/ObrolanProvider';
import { color, font, layout, radius, spacing, teks } from '../../theme/tokens';
import { Ikon, Memuat, Peringatan, Tombol } from '../ui';

// Salinan teks §4.14 (LANJUT_048) — DRAF. Tampil di layar terkunci bila kebijakan belum diterima.
const AJAKAN_KEBIJAKAN = 'Terima kebijakan privasi dulu supaya fitur AI bisa diaktifkan nanti.';

/**
 * Ngobrol Bareng LANJUT (LANJUT_032; AI lewat server sejak LANJUT_051).
 *
 * Balasan dari POST /ngobrol (server → OpenRouter). Boleh-tidaknya AI dipakai
 * SELALU diputuskan server (bolehPakaiAi); `boleh_pakai_ai` di sini hanya
 * untuk memilih tampilan: obrolan, atau penjelasan kenapa fitur belum aktif.
 * Riwayat hanya di memori (ObrolanProvider), tidak disimpan di perangkat
 * maupun server.
 */
export function NgobrolScreen() {
  const { data: persetujuan, isPending, isError } = usePersetujuan();

  if (isPending) return <Memuat />;
  if (isError || !persetujuan) {
    return (
      <View style={s.terkunci}>
        <Peringatan>{TEKS_NGOBROL.belumBisaDimuat}</Peringatan>
      </View>
    );
  }
  if (!persetujuan.boleh_pakai_ai) return <Terkunci />;
  return <Obrolan />;
}

/** Fitur AI belum aktif: jelaskan syaratnya, tanpa kotak tulis. Kartu bantuan tetap bisa dibuka. */
function Terkunci() {
  const router = useRouter();
  const { data: persetujuan } = usePersetujuan();
  const keadaan = persetujuan ? keadaanKebijakan(persetujuan) : null;
  const ajakKebijakan = keadaan === 'bisa_diterima' || keadaan === 'versi_app_berbeda';
  const ajakOrtu = keadaan === 'diterima' && !persetujuan?.ortu_wali_aktif;
  return (
    <ScrollView contentContainerStyle={s.terkunci}>
      <Peringatan judul={TEKS_NGOBROL.terkunciJudul}>{TEKS_NGOBROL.terkunciIsi}</Peringatan>
      {ajakKebijakan ? (
        <Pressable onPress={() => router.push('/terima-kebijakan')} style={s.gaya} accessibilityRole="link">
          <Text style={s.gayaTeks}>
            {AJAKAN_KEBIJAKAN} <Text style={s.gayaTautan}>Baca dan terima</Text>
          </Text>
        </Pressable>
      ) : null}
      {ajakOrtu ? (
        <Pressable onPress={() => router.push('/persetujuan-ortu')} style={s.gaya} accessibilityRole="link">
          <Text style={s.gayaTeks}>
            {TEKS_NGOBROL.ajakOrtu} <Text style={s.gayaTautan}>{TEKS_NGOBROL.tautanOrtu}</Text>
          </Text>
        </Pressable>
      ) : null}
      <PanelBantuan />
    </ScrollView>
  );
}

/** Kartu layanan bantuan dari server (LANJUT_053). Isinya tidak pernah ditulis AI. */
function KartuBantuanView({ kartu }: { kartu: KartuBantuan }) {
  return (
    <View style={s.kartu} role="note" aria-label={kartu.judul}>
      <Text style={s.kartuJudul}>{kartu.judul}</Text>
      {kartu.layanan.map((l) => (
        <View key={l.nama} style={s.kartuLayanan}>
          <Text style={s.kartuNama}>{l.nama}</Text>
          <Text style={s.kartuNomor} selectable>
            {l.nomor_atau_alamat}
          </Text>
          <Text style={s.kartuKeterangan}>{l.keterangan}</Text>
        </View>
      ))}
      <Text style={s.kartuKeterangan}>{kartu.penutup}</Text>
    </View>
  );
}

/**
 * Sumber jawaban materi (LANJUT_055), disusun SERVER: modul dari label [M..]
 * dan halaman web dari anotasi penyedia [W..]. Model tidak bisa menambah tautan.
 */
function SumberJawaban({ sumber }: { sumber: NonNullable<Pesan['sumber']> }) {
  return (
    <View style={s.sumber}>
      {sumber.modul.length ? (
        <View style={s.sumberBagian}>
          <Text style={s.sumberJudul}>{TEKS_NGOBROL.dariModul}</Text>
          {sumber.modul.map((m) => (
            <Text key={m.label} style={s.sumberIsi}>
              {m.label} · {m.judul}
            </Text>
          ))}
        </View>
      ) : null}
      {sumber.web.length ? (
        <View style={s.sumberBagian}>
          <Text style={s.sumberJudul}>{TEKS_NGOBROL.dariWeb}</Text>
          {sumber.web.map((w) => (
            <Pressable key={w.label} onPress={() => Linking.openURL(w.url)} accessibilityRole="link" accessibilityHint={w.url}>
              <Text style={s.sumberIsi}>
                {w.label} · <Text style={s.sumberTautan}>{w.judul}</Text>
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Avatar AI LANJUT (ikon kelinci, lib/navigasi.ts IKON_AVATAR_AI) di samping balasan bot.
 * Hiasan saja: disembunyikan dari pembaca layar.
 */
function AvatarAi() {
  return (
    <View style={s.avatar} aria-hidden importantForAccessibility="no-hide-descendants">
      <Image source={require('../../assets/maskot-ai-biru.png')} style={s.avatarIkon} resizeMode="contain" accessible={false} />
    </View>
  );
}

/**
 * LANJUT_078 — kartu tautan di bawah jawaban AI (≤3, disusun server, lib/tautanNgobrol.ts).
 * Tombol membuka layar yang sudah ada; chatbot tidak pernah membuka layar sendiri.
 */
function KartuTautanDaftar({ tautan }: { tautan: TautanNgobrol[] }) {
  const router = useRouter();
  const kartu = kartuTautan(tautan);
  if (!kartu.length) return null;
  return (
    <View style={s.tautanDaftar}>
      {kartu.map((k) => (
        <View key={k.jenis} style={s.tautanKartu}>
          <Text style={s.tautanLabel}>{k.label}</Text>
          <Text style={s.tautanJudul}>{k.judul}</Text>
          <View style={s.tautan}>
            <Tombol label={k.tombol} varian="sekunder" kecil onPress={() => router.push(k.tujuan)} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Tautan "Butuh bicara dengan orang?" yang selalu ada; kartu dimuat dari server saat dibuka. */
function PanelBantuan() {
  const [buka, setBuka] = useState(false);
  const { data: kartu, isError } = useKartuBantuan(buka);
  return (
    <View style={s.panelBantuan}>
      <Pressable onPress={() => setBuka((b) => !b)} style={s.gaya} accessibilityRole="button" aria-expanded={buka}>
        <Text style={s.gayaTeks}>
          <Text style={s.gayaTautan}>{buka ? TEKS_NGOBROL.sembunyikanBantuan : TEKS_NGOBROL.tautanBantuan}</Text>
        </Text>
      </Pressable>
      {buka ? kartu ? <KartuBantuanView kartu={kartu} /> : isError ? <Peringatan>{TEKS_NGOBROL.kartuGagalDimuat}</Peringatan> : <Memuat /> : null}
    </View>
  );
}

/**
 * Ucapan → teks (LANJUT_074 §F) lewat pengenal suara PERAMBAN (lib/suara.ts); hanya
 * web — di Android/iOS tanpa paket native `didukung` false dan tombolnya tidak ada.
 * Mikrofon baru hidup setelah siswa menekan tombol, dan mati saat tombol ditekan
 * lagi, saat siswa selesai bicara, saat pesan dikirim, atau saat layar ditutup.
 * App tidak menyentuh audio: yang diterima hanya teks, dan teks itu masuk ke kotak
 * pesan (tidak terkirim otomatis). Galat (mis. izin mikrofon ditolak) diam saja:
 * tombol kembali ke keadaan awal.
 *
 * LANJUT_080b: seluruhnya di balik konfigurasi MIKROFON_NGOBROL (bawaan mati untuk uji
 * rilis) — tombol tidak tampil dan pengenal tidak pernah dimulai. Kotak pesan tetap.
 */
const MIKROFON_NGOBROL = mikrofonNgobrolAktif(Constants.expoConfig?.extra);

function useUcapan(onTeks: (teks: string) => void) {
  const [Pengenal] = useState(() => (Platform.OS === 'web' ? cariPengenalSuara() : null));
  const [mendengar, setMendengar] = useState(false);
  const aktif = useRef<PengenalSuara | null>(null);
  const onTeksRef = useRef(onTeks);
  onTeksRef.current = onTeks;

  useEffect(
    () => () => {
      const p = aktif.current;
      aktif.current = null;
      p?.abort();
    },
    []
  );

  const selesai = (p: PengenalSuara) => {
    if (aktif.current !== p) return;
    aktif.current = null;
    setMendengar(false);
  };

  const mulai = () => {
    if (!MIKROFON_NGOBROL || !Pengenal || aktif.current) return;
    try {
      const p = new Pengenal();
      p.lang = BAHASA_PENGENALAN;
      p.continuous = false;
      p.interimResults = false;
      p.maxAlternatives = 1;
      p.onresult = (e) => {
        const t = teksDariHasil(e);
        if (t && aktif.current === p) onTeksRef.current(t);
      };
      p.onerror = () => selesai(p);
      p.onend = () => selesai(p);
      aktif.current = p;
      setMendengar(true);
      p.start();
    } catch {
      aktif.current = null;
      setMendengar(false);
    }
  };

  /** Berhenti tanpa memakai sisa hasil (dipakai saat pesan dikirim). */
  const batal = () => {
    const p = aktif.current;
    if (!p) return;
    selesai(p);
    try {
      p.abort();
    } catch {
      // diam: pengenal sudah berhenti
    }
  };

  const tekan = () => {
    const p = aktif.current;
    if (!p) return mulai();
    try {
      p.stop(); // hasil terakhir masih masuk, lalu onend
    } catch {
      selesai(p);
    }
  };

  return { didukung: MIKROFON_NGOBROL && !!Pengenal, mendengar, tekan, batal };
}

function Obrolan() {
  const { pengguna } = useSesi();
  const { pesan, mengetik, kirim: kirimPesan, cobaLagi } = useObrolan();
  const router = useRouter();
  // LANJUT_078: teks khusus AI aktif hanya bila server menyatakan ai_aktif (memuat/gagal → tidak tampil).
  const status = useStatusNgobrol(true);
  const gulir = useRef<ScrollView>(null);
  const [draf, setDraf] = useState('');
  const [fokus, setFokus] = useState(false);
  const ucapan = useUcapan((t) => setDraf((d) => gabungDraf(d, t, PANJANG_PESAN_MAKS)));

  const labelGaya = labelGayaBelajar(pengguna?.gaya_belajar ?? null);

  const kirim = () => {
    const isi = draf.trim();
    if (!isi || mengetik) return;
    ucapan.batal();
    setDraf('');
    kirimPesan(isi);
  };

  // Web: Enter mengirim, Shift+Enter baris baru. Di HP tombol kirim yang dipakai.
  const tekanTombol = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const ev = e.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
    if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
      e.preventDefault();
      kirim();
    }
  };

  const bisaKirim = draf.trim().length > 0 && !mengetik;
  const terakhir = pesan[pesan.length - 1];

  return (
    <KeyboardAvoidingView style={s.akar} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={gulir}
        style={s.daftar}
        contentContainerStyle={s.daftarIsi}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => gulir.current?.scrollToEnd({ animated: true })}
        aria-live="polite"
      >
        <Text style={s.catatan}>{TEKS_NGOBROL.catatanAi}</Text>
        <Text style={s.catatan}>{TEKS_NGOBROL.peringatanDataPribadi}</Text>
        <Text style={s.catatan}>{TEKS_NGOBROL.catatanMateri}</Text>
        {status.data?.ai_aktif ? (
          <>
            <Text style={s.catatan}>{TEKS_NGOBROL.catatanKonteks}</Text>
            <Text style={s.petunjuk}>{TEKS_NGOBROL.petunjukAi}</Text>
          </>
        ) : null}

        <PanelBantuan />

        <Pressable onPress={() => router.push('/gaya-belajar')} style={s.gaya} accessibilityRole="link">
          <Text style={s.gayaTeks}>
            {labelGaya ? `Gaya belajarmu: ${labelGaya}` : 'Gaya belajarmu belum dipilih'} ·{' '}
            <Text style={s.gayaTautan}>{labelGaya ? 'Ubah' : 'Atur'}</Text>
          </Text>
        </Pressable>

        {pesan.map((m) =>
          m.dari === 'galat' ? (
            <View key={m.id} style={s.barisKiri} role="alert">
              <View style={s.gelembungGalat}>
                <Text style={s.teksGalat}>{m.teks}</Text>
              </View>
              {m === terakhir && !mengetik ? (
                <View style={s.tautan}>
                  <Tombol label={TEKS_NGOBROL.cobaLagi} varian="garis" kecil onPress={cobaLagi} />
                </View>
              ) : null}
            </View>
          ) : (
            <View key={m.id} style={m.dari === 'pengguna' ? s.barisKanan : s.barisKiri}>
              {m.ujiCoba ? <Text style={s.labelUjiCoba}>{TEKS_NGOBROL.labelUjiCoba}</Text> : null}
              {m.dari === 'pengguna' ? (
                <View style={s.gelembungPengguna}>
                  <Text style={s.teksPengguna} selectable>
                    {m.teks}
                  </Text>
                </View>
              ) : (
                <View style={s.barisAvatar}>
                  <AvatarAi />
                  <View style={StyleSheet.flatten([s.gelembungBot, s.gelembungBesertaAvatar])}>
                    <Text style={s.teksBot} selectable>
                      {m.teks}
                    </Text>
                  </View>
                </View>
              )}
              {m.disamarkan ? <Text style={s.disamarkan}>{TEKS_NGOBROL.dataDisamarkan}</Text> : null}
              {m.sumber ? <SumberJawaban sumber={m.sumber} /> : null}
              {m.webHabis ? <Text style={s.catatanKecil}>{TEKS_NGOBROL.webHabis}</Text> : null}
              {m.tautan ? <KartuTautanDaftar tautan={m.tautan} /> : null}
              {m.kartu ? <KartuBantuanView kartu={m.kartu} /> : null}
            </View>
          )
        )}

        {mengetik ? (
          <View style={s.barisKiri}>
            <View style={s.barisAvatar}>
              <AvatarAi />
              <View style={StyleSheet.flatten([s.gelembungBot, s.gelembungBesertaAvatar])}>
                <Text style={s.mengetik}>LANJUT sedang mengetik…</Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={s.masukan}>
        <TextInput
          value={draf}
          onChangeText={setDraf}
          onKeyPress={tekanTombol}
          placeholder={ucapan.mendengar ? TEKS_NGOBROL.mendengarkan : TEKS_NGOBROL.placeholder}
          placeholderTextColor={color.textSubtle}
          onFocus={() => setFokus(true)}
          onBlur={() => setFokus(false)}
          multiline
          numberOfLines={1}
          maxLength={PANJANG_PESAN_MAKS}
          style={StyleSheet.flatten([s.input, fokus && s.inputFokus])}
          accessibilityLabel="Pesan"
        />
        {ucapan.didukung ? (
          <Pressable
            onPress={ucapan.tekan}
            accessibilityRole="button"
            accessibilityLabel={TEKS_NGOBROL.ucapkanPesan}
            aria-pressed={ucapan.mendengar}
            style={({ pressed }) => StyleSheet.flatten([s.mik, ucapan.mendengar && s.mikAktif, pressed && s.mikTekan])}
          >
            <Ikon nama="mikrofon" ukuran={22} warna={ucapan.mendengar ? color.white : color.blue600} tebal={2} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={kirim}
          disabled={!bisaKirim}
          accessibilityRole="button"
          accessibilityLabel="Kirim"
          aria-disabled={!bisaKirim}
          style={({ pressed }) =>
            StyleSheet.flatten([s.kirim, !bisaKirim && s.kirimMati, pressed && bisaKirim && s.kirimTekan])
          }
        >
          <Ikon nama="panah" ukuran={22} warna={color.white} tebal={2.5} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  akar: { flex: 1 },
  terkunci: { padding: spacing.gutter, gap: spacing.s3 },
  catatan: { ...teks.caption, color: color.textMuted, textAlign: 'center' },
  daftar: { flex: 1 },
  daftarIsi: { padding: spacing.gutter, gap: spacing.s3 },
  gaya: { alignSelf: 'center', paddingVertical: spacing.s1, minHeight: 44, justifyContent: 'center' },
  gayaTeks: { ...teks.caption, color: color.textMuted, textAlign: 'center' },
  gayaTautan: { color: color.textLink, fontFamily: font.semibold, textDecorationLine: 'underline' },
  barisKiri: { alignItems: 'flex-start', gap: spacing.s2 },
  // Avatar kelinci AI LANJUT di kiri gelembung bot; gelembung menyusut, avatar tidak.
  barisAvatar: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s2, maxWidth: '100%' },
  avatar: {
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderSoft,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIkon: { width: 26, height: 26 },
  gelembungBesertaAvatar: { flexShrink: 1, maxWidth: '85%' },
  barisKanan: { alignItems: 'flex-end' },
  gelembungBot: {
    maxWidth: '85%',
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s4,
    borderRadius: radius.md,
    borderTopLeftRadius: spacing.s1,
    backgroundColor: color.surfaceSoft,
  },
  gelembungPengguna: {
    maxWidth: '85%',
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s4,
    borderRadius: radius.md,
    borderTopRightRadius: spacing.s1,
    backgroundColor: color.blue600,
  },
  gelembungGalat: {
    maxWidth: '85%',
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s4,
    borderRadius: radius.md,
    borderTopLeftRadius: spacing.s1,
    borderWidth: 1,
    borderColor: color.borderSoft,
    backgroundColor: color.statusIdleBg,
  },
  // LANJUT_053 — kartu bantuan, label uji coba, penanda disamarkan.
  panelBantuan: { gap: spacing.s2 },
  kartu: {
    width: '100%',
    gap: spacing.s3,
    padding: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderBrand,
    backgroundColor: color.white,
  },
  kartuJudul: { ...teks.bodySm, fontFamily: font.semibold, color: color.ink900 },
  kartuLayanan: { gap: 2 },
  kartuNama: { ...teks.bodySm, fontFamily: font.semibold, color: color.textBody },
  kartuNomor: { ...teks.bodySm, color: color.textLink, fontFamily: font.semibold },
  kartuKeterangan: { ...teks.caption, color: color.textMuted },
  labelUjiCoba: { ...teks.caption, color: color.textMuted, fontFamily: font.semibold },
  // LANJUT_055 — sumber jawaban materi.
  sumber: { maxWidth: '85%', gap: spacing.s2, paddingLeft: spacing.s2 },
  sumberBagian: { gap: 2 },
  sumberJudul: { ...teks.caption, color: color.textMuted, fontFamily: font.semibold },
  sumberIsi: { ...teks.caption, color: color.textBody },
  sumberTautan: { color: color.textLink, textDecorationLine: 'underline' },
  catatanKecil: { ...teks.caption, color: color.textMuted, maxWidth: '85%' },
  // LANJUT_078 — petunjuk AI aktif dan kartu tautan fitur.
  petunjuk: { ...teks.bodySm, color: color.textBody, textAlign: 'center' },
  tautanDaftar: { width: '85%', gap: spacing.s2 },
  tautanKartu: {
    gap: spacing.s1,
    padding: spacing.s3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderSoft,
    backgroundColor: color.white,
  },
  tautanLabel: { ...teks.caption, fontFamily: font.semibold, color: color.blue600 },
  tautanJudul: { ...teks.bodySm, fontFamily: font.semibold, color: color.textBody },
  disamarkan: { ...teks.caption, color: color.textMuted, maxWidth: '85%', textAlign: 'right' },
  teksBot: { ...teks.bodySm, color: color.textBody },
  teksPengguna: { ...teks.bodySm, color: color.white },
  teksGalat: { ...teks.bodySm, color: color.textMuted },
  mengetik: { ...teks.bodySm, color: color.textMuted, fontStyle: 'italic' },
  tautan: { flexDirection: 'row' },
  masukan: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.s2,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.s3,
    borderTopWidth: 1,
    borderTopColor: color.borderHairline,
    backgroundColor: color.white,
    width: '100%',
    maxWidth: layout.lebarMaks,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.s4,
    paddingVertical: 10,
    fontFamily: font.regular,
    fontSize: 16,
    lineHeight: 22,
    color: color.ink900,
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.borderSoft,
    borderRadius: radius.lg,
    outlineWidth: 0,
  },
  // Sama dengan `inputFokus` di auth/AuthUI.tsx (padanan .input:focus di PWA).
  inputFokus: { borderColor: color.blue400, outlineWidth: 3, outlineStyle: 'solid', outlineColor: color.focusRing },
  kirim: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.blue600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kirimMati: { backgroundColor: color.ink300 },
  kirimTekan: { backgroundColor: color.textMuted },
  // LANJUT_074 §F — tombol mikrofon: garis saat diam, terisi blue600 saat mendengarkan.
  mik: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.blue600,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mikAktif: { backgroundColor: color.blue600 },
  mikTekan: { opacity: 0.7 },
});
