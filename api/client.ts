import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Base URL API diambil dari app.config.ts (field `extra.apiUrl*`) lewat
 * expo-constants, bukan di-hardcode di sini. Tiga kandidat URL sudah
 * disiapkan app.config.ts; PEMILIHANNYA terjadi di sini (runtime), bukan di
 * sana (config-time), karena hanya di sini `__DEV__` dan `Platform.OS`
 * benar-benar tersedia — dev-web (browser di komputer yang sama dengan
 * backend, "localhost" benar) dan dev-android (emulator/device, "localhost"
 * merujuk ke perangkat itu sendiri, bukan komputer) butuh nilai berbeda.
 */
const extra = Constants.expoConfig?.extra as
  | { apiUrl?: string; apiUrlProd?: string; apiUrlDevAndroid?: string; apiUrlDevWeb?: string }
  | undefined;

/**
 * Dev native (Expo Go / development build di HP): backend dianggap berjalan
 * di komputer yang sama dengan Metro, jadi host `apiUrlDevAndroid` diganti
 * host Metro (`hostUri`, mis. "10.141.5.75:8081"). IP LAN komputer boleh
 * berubah tanpa build ulang maupun set env var.
 */
function urlDevNative(): string | undefined {
  const bawaan = extra?.apiUrlDevAndroid;
  const hostMetro = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!bawaan || !hostMetro) return bawaan;
  // Bukan `new URL().hostname = …`: setter URL di React Native belum ada.
  return bawaan.replace(/^(https?:\/\/)[^:/]+/, `$1${hostMetro}`);
}

// `apiUrl` (EXPO_PUBLIC_API_URL) mengalahkan pemilihan otomatis di bawahnya.
const BASE_URL =
  extra?.apiUrl ||
  (__DEV__
    ? Platform.OS === 'web'
      ? extra?.apiUrlDevWeb
      : urlDevNative()
    : extra?.apiUrlProd);

if (!BASE_URL) {
  // Gagal cepat & jelas saat startup, daripada tiap hook diam-diam gagal
  // dengan "Network request failed" tanpa penjelasan dari mana asalnya.
  throw new Error(
    `[api/client] Base URL tidak ditemukan untuk __DEV__=${String(__DEV__)} Platform.OS=${Platform.OS} — cek app.config.ts.`
  );
}

// Bentuk respons Express persis server/src/util/respons.js `sukses`/`galat` —
// tipe ini SENGAJA disamakan literal dengan implementasi backend supaya
// perubahan bentuk di sana ketahuan lewat error TypeScript di sini, bukan
// gagal diam-diam saat runtime.
type ResponsSukses<T> = { ok: true; data: T; meta?: unknown };
type ResponsGalat = {
  ok: false;
  galat: { kode: string; pesan: string; medan?: Record<string, string> };
};

export class ApiError extends Error {
  status: number;
  kode?: string;
  medan?: Record<string, string>;

  constructor(status: number, message: string, kode?: string, medan?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kode = kode;
    this.medan = medan;
  }
}

/**
 * Kode 401 yang berarti "sesi tidak sah" (wajibLogin di server). BUKAN
 * `KREDENSIAL_SALAH`, yang juga 401 tapi berarti sandi salah (mis. sandi lama
 * di ubah-sandi) — itu harus tetap tampil sebagai galat biasa, bukan keluar.
 */
const KODE_SESI_TIDAK_SAH = new Set(['TIDAK_MASUK', 'SESI_KEDALUWARSA']);

let pendengarSesiBerakhir: ((token: string) => void) | null = null;

/**
 * Satu pendengar (AuthProvider) untuk 401 sesi dari request mana pun yang
 * membawa token — satu tempat terpusat, bukan tiap layar. Menerima token
 * yang ditolak supaya pendengar bisa mengabaikan jawaban untuk sesi lama.
 * Mengembalikan fungsi pelepas.
 */
export function saatSesiBerakhir(pendengar: (token: string) => void): () => void {
  pendengarSesiBerakhir = pendengar;
  return () => {
    if (pendengarSesiBerakhir === pendengar) pendengarSesiBerakhir = null;
  };
}

type ApiFetchOpsi = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Token sesi mentah — dikirim sebagai `Authorization: Bearer <token>`.
   *  Wajib diisi untuk rute yang dijaga `wajibLogin` (mis. /kemajuan) —
   *  lihat server/src/middleware/autentikasi.js. */
  token?: string;
  query?: Record<string, string | undefined>;
};

/**
 * Satu fungsi fetch generik untuk seluruh API — tiap hook memanggil ini
 * dengan path relatif (mis. "/konten/linimasa"), bukan menyusun `fetch()`
 * sendiri-sendiri, supaya base URL & penanganan galat konsisten di satu
 * tempat (SDD Bagian 12: klien bicara ke "LAPISAN API" lewat satu jalur).
 */
export async function apiFetch<T>(path: string, opsi: ApiFetchOpsi = {}): Promise<T> {
  const url = new URL(BASE_URL!.replace(/\/$/, '') + path);
  if (opsi.query) {
    for (const [key, value] of Object.entries(opsi.query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  // FormData (unggah modul, LANJUT_049): Content-Type & batas multipart diatur fetch sendiri.
  const formulir = typeof FormData !== 'undefined' && opsi.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opsi.method || 'GET',
      headers: {
        ...(formulir ? {} : { 'Content-Type': 'application/json' }),
        ...(opsi.token ? { Authorization: `Bearer ${opsi.token}` } : {}),
      },
      body: formulir ? (opsi.body as FormData) : opsi.body ? JSON.stringify(opsi.body) : undefined,
    });
  } catch (err) {
    // Network-level failure (server mati, salah IP, dsb) — bukan galat API
    // terstruktur, jadi dibungkus supaya tetap dikenali sebagai ApiError
    // oleh pemanggil (React Query `isError`) alih-alih TypeError mentah.
    throw new ApiError(0, `Gagal menghubungi ${url.origin}: ${(err as Error).message}`, 'JARINGAN');
  }

  let json: ResponsSukses<T> | ResponsGalat;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, `Respons bukan JSON (status ${res.status}) dari ${url.pathname}`);
  }

  if (!json.ok) {
    if (res.status === 401 && opsi.token && KODE_SESI_TIDAK_SAH.has(json.galat.kode)) {
      pendengarSesiBerakhir?.(opsi.token);
    }
    // Tetap dilempar: pemanggil (React Query dsb.) berhenti seperti biasa.
    throw new ApiError(res.status, json.galat.pesan, json.galat.kode, json.galat.medan);
  }
  return json.data;
}
