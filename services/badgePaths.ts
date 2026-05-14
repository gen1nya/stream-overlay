/**
 * Filesystem-safe sanitisation for theme names used as folder names under
 * userData/images/badges/. Theme names come from arbitrary user input
 * (Cyrillic, spaces, emoji), so we only strip what would cause traversal or
 * Windows-reserved-character issues — Unicode is preserved.
 */
export function sanitizeThemeNameForPath(name: unknown): string {
  return String(name ?? '')
      .replace(/[\/\\:*?"<>|\x00-\x1f]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/^\.+|\.+$/g, '_')
      .trim() || '_unnamed';
}
