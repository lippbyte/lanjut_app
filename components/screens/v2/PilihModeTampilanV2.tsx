import React from 'react';
import { StyleSheet, View } from 'react-native';

import { TEKS_MODE_TAMPILAN } from '../../../lib/modeTampilan';
import { garis, keluargaHuruf, radius, ruang, ukuran } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import { Ikon, Kartu, Sentuh, Teks } from '../../v2';

/**
 * Tombol ganti mode tampilan v2 (LANJUT_031b): tiga pilihan (Ikuti sistem, Terang, Gelap),
 * tampil di layar Akun & Privasi (/akun) lewat AppShellV2 HANYA saat EXPO_PUBLIC_MODE_GELAP=1.
 * - Target sentuh minimal 44 pt (lewat `Sentuh`), peran `radio` + `accessibilityState.selected`.
 * - Pilihan aktif dibedakan dengan bentuk (ikon terisi, centang, garis lebih tebal, huruf tebal),
 *   tidak hanya warna.
 * - Pilihan hanya disimpan lokal di perangkat (penyimpanan biasa), tidak pernah dikirim ke server.
 */
export function PilihModeTampilanV2() {
  const { warna, pilihan, ubahPilihan, saklarAktif } = useTemaV2();
  if (!saklarAktif) return null;

  return (
    <Kartu judul={TEKS_MODE_TAMPILAN.judul} keterangan={TEKS_MODE_TAMPILAN.ringkasan}>
      <View
        style={s.daftar}
        accessibilityRole="radiogroup"
        accessibilityLabel={TEKS_MODE_TAMPILAN.judul}
      >
        {TEKS_MODE_TAMPILAN.opsi.map((o) => {
          const aktif = pilihan === o.nilai;
          return (
            <Sentuh
              key={o.nilai}
              peran="radio"
              label={o.label}
              terpilih={aktif}
              dicentang={aktif}
              onPress={() => ubahPilihan(o.nilai)}
              gaya={({ ditekan }) => [
                s.opsi,
                { borderColor: warna.garisKontrol, backgroundColor: warna.halaman },
                aktif
                  ? { backgroundColor: warna.permukaanLembut, borderColor: warna.aksen, borderWidth: garis.fokus }
                  : ditekan
                    ? { backgroundColor: warna.permukaanLembut }
                    : null,
              ]}
            >
              <Ikon
                nama={o.ikon}
                ukuran={ukuran.ikon}
                warna={aktif ? warna.aksen : warna.teksSekunder}
                bobot={aktif ? 'fill' : 'regular'}
              />
              <Teks
                varian="badanKecil"
                warna={aktif ? 'aksen' : 'teks'}
                gaya={StyleSheet.flatten([s.label, aktif ? s.labelAktif : null])}
              >
                {o.label}
              </Teks>
              {aktif ? <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.aksen} /> : null}
            </Sentuh>
          );
        })}
      </View>
    </Kartu>
  );
}

const s = StyleSheet.create({
  daftar: { gap: ruang.r1 },
  opsi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r2,
    paddingVertical: ruang.r1,
    paddingHorizontal: ruang.r2,
    borderRadius: radius.kecil,
    borderWidth: garis.tipis,
  },
  label: { flex: 1 },
  labelAktif: { fontFamily: keluargaHuruf.badanTebal },
});
