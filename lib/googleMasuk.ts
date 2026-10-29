/**
 * Masuk dengan Google tanpa paket baru (LANJUT_083). Alur OpenID Connect
 * `response_type=id_token` lewat peramban:
 *
 * 1. App meminta nonce ke server (GET /auth/google/nonce), menyimpannya, lalu
 *    membuka halaman masuk Google (`bangunUrlGoogle`).
 * 2. Google mengembalikan ID token di fragmen URL `redirect_uri`:
 *    - web: langsung ke `<asal web>/masuk-google` (app/masuk-google.tsx);
 *    - Android/iOS: ke halaman penerus statis di domain landing
 *      (landing/google-kembali.html), yang meneruskannya ke
 *      `lanjut://masuk-google?id_token=…&state=…`.
 * 3. app/masuk-google.tsx mencocokkan `state` dengan nonce tersimpan, lalu
 *    mengirim token + nonce ke POST /auth/google. Server memverifikasi tanda
 *    tangan, Client ID, nonce, dan email_verified.
 *
 * Modul ini murni (tanpa React Native) supaya bisa dites dari server
 * (tests/muat-ts-app.js). Client ID bersifat publik; Client Secret tidak dipakai
 * dan tidak pernah boleh masuk app.
 */

// `unknown`, bukan `string`: manifest bisa membawa nilai lain (null di app.config.ts pernah
// terbaca sebagai `{}` di web dev dan membuat layar Masuk crash).
export type ExtraGoogle = { googleClientId?: unknown; googleRedirectUri?: unknown } | undefined;

function teks(nilai: unknown): string {
  return typeof nilai === 'string' ? nilai.trim() : '';
}

export type KonfigurasiGoogle = { clientId: string; redirectUri: string };

export const URL_OTORISASI_GOOGLE = 'https://accounts.google.com/o/oauth2/v2/auth';

/** Kunci AsyncStorage untuk nonce permintaan masuk yang sedang berjalan. */
export const KUNCI_NONCE_GOOGLE = 'google_nonce';

/**
 * Null = tombol "Masuk dengan Google" TIDAK ditampilkan: Client ID kosong, atau
 * (di Android/iOS) alamat halaman penerus belum diisi.
 */
export function konfigurasiGoogle(
  extra: ExtraGoogle,
  platform: string,
  asalWeb?: string | null
): KonfigurasiGoogle | null {
  const clientId = teks(extra?.googleClientId);
  if (!clientId) return null;
  const redirectUri =
    platform === 'web' ? (asalWeb ? `${asalWeb.replace(/\/$/, '')}/masuk-google` : '') : teks(extra?.googleRedirectUri);
  if (!redirectUri) return null;
  return { clientId, redirectUri };
}

export function bangunUrlGoogle({ clientId, redirectUri }: KonfigurasiGoogle, nonce: string): string {
  const param: [string, string][] = [
    ['client_id', clientId],
    ['redirect_uri', redirectUri],
    ['response_type', 'id_token'],
    ['scope', 'openid email'],
    ['nonce', nonce],
    ['state', nonce],
    ['prompt', 'select_account'],
  ];
  return `${URL_OTORISASI_GOOGLE}?${param.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

export type HasilGoogle = { idToken: string | null; state: string | null; galat: string | null };

function satu(nilai: unknown): string | null {
  const v = Array.isArray(nilai) ? nilai[0] : nilai;
  return typeof v === 'string' && v ? v : null;
}

/** Dari parameter rute (Android/iOS: query yang diteruskan halaman penerus). */
export function hasilDariParam(param: Record<string, unknown>): HasilGoogle {
  return { idToken: satu(param.id_token), state: satu(param.state), galat: satu(param.error) };
}

/** Dari fragmen `#id_token=…&state=…` (web). URLSearchParams sengaja tidak dipakai. */
export function hasilDariFragmen(fragmen: string): HasilGoogle {
  const nilai: Record<string, string> = {};
  for (const bagian of fragmen.replace(/^[#?]/, '').split('&')) {
    if (!bagian) continue;
    const i = bagian.indexOf('=');
    const kunci = i < 0 ? bagian : bagian.slice(0, i);
    try {
      nilai[decodeURIComponent(kunci)] = i < 0 ? '' : decodeURIComponent(bagian.slice(i + 1).replace(/\+/g, ' '));
    } catch {
      // Bagian yang rusak diabaikan.
    }
  }
  return hasilDariParam(nilai);
}

/** Token hanya dipakai bila `state` sama dengan nonce yang disimpan app sendiri. */
export function hasilSah(hasil: HasilGoogle, nonceTersimpan: string | null): hasil is HasilGoogle & { idToken: string } {
  return !hasil.galat && !!hasil.idToken && !!nonceTersimpan && hasil.state === nonceTersimpan;
}
