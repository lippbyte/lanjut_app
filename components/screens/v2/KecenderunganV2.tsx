import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '../../../api/client';
import type { ArahV2 } from '../../../hooks/useArahV2';
import { TEKS_ARAH } from '../../../lib/alurMasukV2';
import { jalurUntukDikirim } from '../../../lib/tandaArah';
import { warna } from '../../../theme/v2';
import { HeaderLayar, KeadaanGalat, KeadaanKosong, Pilihan, PesanStatus, Tombol } from '../../v2';
import { KerangkaV2 } from './KerangkaV2';

/**
 * Kecenderungan arah (LANJUT_030), langkah terakhir alur masuk v2, sebagai gerbang di atas app
 * (app/(app)/_layout.tsx). Tidak pernah memblokir: daftar kosong atau galat tetap bisa dilewati.
 *   - Banyak pilihan boleh; "Belum tahu" berdiri sendiri (lib/pilihan.ts).
 *   - Jalur dikirim lewat rute Jalur & Tujuan yang sudah ada; hanya jalur disetujui (K37).
 *   - "Belum tahu" tidak dikirim ke server; hanya tanda lokal (lib/tandaArah.ts).
 */
export function GerbangArahV2({ arah }: { arah: ArahV2 }) {
  const [terpilih, setTerpilih] = useState<string[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const simpan = async () => {
    setMenyimpan(true);
    setGalat(null);
    try {
      for (const id of jalurUntukDikirim(terpilih, arah.opsi)) {
        try {
          await arah.pilihJalur(id);
        } catch (e) {
          // Sudah dipilih sebelumnya (mis. coba lagi sesudah sebagian berhasil): bukan galat.
          if (!(e instanceof ApiError && e.kode === 'JALUR_SUDAH_DIPILIH')) throw e;
        }
      }
      await arah.simpanTanda('dijawab');
    } catch {
      setGalat(TEKS_ARAH.galatSimpan);
    } finally {
      setMenyimpan(false);
    }
  };

  let isi: React.ReactNode;
  let aksi: React.ReactNode;
  if (arah.galatJaringan) {
    isi = <KeadaanGalat judul={TEKS_ARAH.galatJudul} pesan={TEKS_ARAH.galatTeks} onCobaLagi={arah.muatUlang} />;
    aksi = <Tombol varian="teks" label={TEKS_ARAH.lanjutDulu} penuh onPress={arah.lewatiSesiIni} />;
  } else if (arah.opsi.length === 0) {
    isi = <KeadaanKosong judul={TEKS_ARAH.kosongJudul} teks={TEKS_ARAH.kosongTeks} />;
    aksi = <Tombol label={TEKS_ARAH.lanjut} penuh onPress={() => void arah.simpanTanda('kosong')} />;
  } else {
    isi = (
      <>
        <HeaderLayar tanpaTepi judul={TEKS_ARAH.judul} ringkasan={TEKS_ARAH.ringkasan} />
        <Pilihan
          judul={TEKS_ARAH.judul}
          judulTersembunyi
          mode="banyak"
          opsi={arah.opsi}
          terpilih={terpilih}
          onUbah={setTerpilih}
          belumTahu={TEKS_ARAH.belumTahu}
          nonaktif={menyimpan}
        />
      </>
    );
    aksi = (
      <>
        {galat ? <PesanStatus jenis="galat">{galat}</PesanStatus> : null}
        <Tombol label={TEKS_ARAH.simpan} penuh memuat={menyimpan} nonaktif={terpilih.length === 0} onPress={() => void simpan()} />
      </>
    );
  }

  return (
    <View style={s.lapis}>
      <KerangkaV2 kunciLangkah={arah.galatJaringan ? 'galat' : arah.opsi.length ? 'pilih' : 'kosong'} aksi={aksi}>
        {isi}
      </KerangkaV2>
    </View>
  );
}

const s = StyleSheet.create({
  lapis: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: warna.halaman },
});
