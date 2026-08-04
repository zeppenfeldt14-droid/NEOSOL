/**
 * Utility functions to normalize and compare zone names case-insensitively across the application.
 */

export function normalizeZona(zona?: string | null): string {
  if (!zona || typeof zona !== 'string') return ''
  return zona
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
}

export function cleanZonaPrefix(zona?: string | null): string {
  const norm = normalizeZona(zona)
  return norm.replace(/^(ZONA|GBA)\s+/, '').trim()
}

export function areZonasEqual(z1?: string | null, z2?: string | null): boolean {
  if (!z1 || !z2) return false
  const norm1 = normalizeZona(z1)
  const norm2 = normalizeZona(z2)
  if (norm1 === norm2) return true
  const clean1 = cleanZonaPrefix(z1)
  const clean2 = cleanZonaPrefix(z2)
  return clean1 === clean2 && clean1.length > 0
}
