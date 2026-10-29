/**
 * Nama lembaga sumber untuk penanda "Diperbarui dari … · dicek …",
 * ditentukan dari domain `url_sumber` (seperti app.js PWA), bukan ditulis
 * tetap di layar — satu layar bisa memuat konten dari lembaga berbeda
 * (mis. Linimasa: TKA dari Kemendikdasmen, SNBP/SNBT dari SNPMB).
 *
 * Urutan penting: subdomain yang lebih khusus dicek lebih dulu. Domain yang
 * tidak dikenal TIDAK diklaim sebagai SNPMB — cukup "laman resmi".
 */
export function lembagaSumber(url: string | null | undefined): string {
  const u = url ?? '';
  if (u.includes('vokasi.kemdikbud.go.id')) return 'Direktorat SMK, Kemendikdasmen';
  if (u.includes('kemendikdasmen.go.id')) return 'laman resmi Kemendikdasmen';
  if (u.includes('snpmb')) return 'laman resmi SNPMB';
  return 'laman resmi';
}
