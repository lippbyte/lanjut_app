import type { TempatSimpan } from '../lib/sesiAman';

/**
 * CADANGAN WEB (LANJUT_030). Peramban tidak punya penyimpanan aman setara Keychain/Keystore, jadi
 * di web tidak ada penyimpanan aman: lib/sesiAman.ts memakai penyimpanan lama (AsyncStorage =
 * localStorage), persis seperti sebelum LANJUT_030. Web hanya dipakai untuk pengembangan dan
 * pemeriksaan di peramban; aplikasi siswa adalah APK.
 */
export const penyimpananAman: TempatSimpan | null = null;
