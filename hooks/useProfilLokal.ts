import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PROFIL_KOSONG, kunciProfilLokal, uraiProfilLokal, type ProfilLokal } from '../lib/profilLokal';
import { useSesi } from '../providers/AuthProvider';

export type { ProfilLokal };

// Kunci per akun: satu HP bisa dipakai bergantian, dan pilihan akun A tidak
// boleh menyaring Daftar Periksa (dan ringkasan kemajuan) akun B.
const kunciUntuk = kunciProfilLokal;

async function bacaProfilLokal(penggunaId: string): Promise<ProfilLokal> {
  try {
    const mentah = await AsyncStorage.getItem(kunciUntuk(penggunaId));
    return uraiProfilLokal(mentah);
  } catch {
    return PROFIL_KOSONG;
  }
}

// F5 — kelas & jalur_seleksi untuk menyaring Daftar Periksa. Disimpan di perangkat
// karena akun belum punya medan jalur_seleksi; kelas dari akun dipakai sebagai awalan.
export function useProfilLokal() {
  const { pengguna } = useSesi();
  const id = pengguna?.id;
  return useQuery({
    queryKey: ['profil_lokal', id],
    queryFn: () => bacaProfilLokal(id!),
    enabled: !!id,
  });
}

export function useSetProfilLokal() {
  const { pengguna } = useSesi();
  const id = pengguna?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profil: ProfilLokal) => {
      if (!id) throw new Error('Belum masuk.');
      await AsyncStorage.setItem(kunciUntuk(id), JSON.stringify(profil));
      return profil;
    },
    onSuccess: (profil) => {
      queryClient.setQueryData(['profil_lokal', id], profil);
    },
  });
}
