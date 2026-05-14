import { describe, it, expect } from 'vitest';
import { sanitizeThemeNameForPath } from './badgePaths';

describe('sanitizeThemeNameForPath', () => {
  it('passes safe names through unchanged', () => {
    expect(sanitizeThemeNameForPath('default')).toBe('default');
    expect(sanitizeThemeNameForPath('Theme-1')).toBe('Theme-1');
    expect(sanitizeThemeNameForPath('my_theme')).toBe('my_theme');
  });

  it('preserves Cyrillic, spaces and other Unicode', () => {
    expect(sanitizeThemeNameForPath('Моя тема')).toBe('Моя тема');
    expect(sanitizeThemeNameForPath('тёмная_v2')).toBe('тёмная_v2');
  });

  it('replaces path separators', () => {
    expect(sanitizeThemeNameForPath('a/b')).toBe('a_b');
    expect(sanitizeThemeNameForPath('a\\b')).toBe('a_b');
  });

  it('neutralises ".." traversal', () => {
    expect(sanitizeThemeNameForPath('..')).toBe('_');
    expect(sanitizeThemeNameForPath('a/../b')).toBe('a___b');
  });

  it('replaces leading and trailing dots', () => {
    // Used to bypass dotfile/hidden-folder semantics on Unix.
    expect(sanitizeThemeNameForPath('.foo')).toBe('_foo');
    expect(sanitizeThemeNameForPath('foo.')).toBe('foo_');
  });

  it('replaces Windows-reserved filename characters', () => {
    expect(sanitizeThemeNameForPath('a:b*c?d"e<f>g|h')).toBe('a_b_c_d_e_f_g_h');
  });

  it('replaces ASCII control characters', () => {
    expect(sanitizeThemeNameForPath('foo\x00bar')).toBe('foo_bar');
    expect(sanitizeThemeNameForPath('foo\x1Fbar')).toBe('foo_bar');
  });

  it('returns "_unnamed" for empty or whitespace-only input', () => {
    expect(sanitizeThemeNameForPath('')).toBe('_unnamed');
    expect(sanitizeThemeNameForPath('   ')).toBe('_unnamed');
    expect(sanitizeThemeNameForPath(null)).toBe('_unnamed');
    expect(sanitizeThemeNameForPath(undefined)).toBe('_unnamed');
  });

  it('coerces non-string input to string', () => {
    expect(sanitizeThemeNameForPath(42)).toBe('42');
  });
});
