import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSesi } from '../providers/AuthProvider';

// LANJUT_048 — "Nanti saja" di prompt kebijakan berlaku untuk SATU sesi login:
// prompt tidak muncul lagi selama sesi itu (termasuk setelah app/halaman
// dimuat ulang), lalu muncul lagi di login berikutnya. Sesi dikenali dari
// ujung token sesi, yang memang sudah tersimpan utuh di perangkat yang sama
// (api/auth.ts), jadi tidak ada data baru yang disimpan. Tidak dikirim ke server.
const KUNCI = 'lanjut.kebijakan.ditunda.v1';
const tandaSesi = (token: string) => token.slice(-16);

export function useTundaKebijakan() {
  const { token } = useSesi();
  const [ditunda, setDitunda] = useState<boolean | null>(null); // null = belum dibaca

  useEffect(() => {
    let batal = false;
    setDitunda(null);
    AsyncStorage.getItem(KUNCI)
      .then((v) => !batal && setDitunda(!!token && v === tandaSesi(token)))
      .catch(() => !batal && setDitunda(false));
    return () => {
      batal = true;
    };
  }, [token]);

  const tunda = useCallback(() => {
    setDitunda(true);
    if (token) AsyncStorage.setItem(KUNCI, tandaSesi(token)).catch(() => {});
  }, [token]);

  return { siap: ditunda !== null, ditunda: ditunda === true, tunda };
}
