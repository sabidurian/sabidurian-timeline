/**
 * colorUtils — Deterministic color mapping from property values to Obsidian palette.
 * Uses CSS variables so it adapts to light/dark themes automatically.
 */

/**
 * 16 distinct Obsidian CSS color variables for bar coloring.
 * These adapt automatically to light/dark themes.
 */
const COLOR_VARS = [
  'var(--color-blue)',
  'var(--color-purple)',
  'var(--color-green)',
  'var(--color-orange)',
  'var(--color-red)',
  'var(--color-yellow)',
  'var(--color-cyan)',
  'var(--color-pink)',
  'var(--interactive-accent)',
  'var(--color-base-70, var(--color-blue))',
  'var(--color-accent-2, var(--color-purple))',
  'var(--tag-color, var(--color-green))',
  'var(--link-color, var(--color-cyan))',
  'var(--text-accent, var(--color-orange))',
  'var(--color-base-50, var(--color-red))',
  'var(--color-accent-1, var(--color-yellow))',
];

/** Simple hash for deterministic color assignment. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

/** Map of value → color index for consistent assignment within a session. */
const colorCache = new Map<string, number>();
let nextColorIndex = 0;

/** Check whether a string is a valid 3- or 6-digit hex color (with or without #). */
function isHexColor(str: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(str);
}

/** Normalise a hex color string to #RRGGBB format. */
function normalizeHex(str: string): string {
  let hex = str.startsWith('#') ? str.slice(1) : str;
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return '#' + hex;
}

/**
 * Get a CSS color value for a given property value string.
 * If the value is a valid hex color code (e.g. "be4c3b" or "#be4c3b"),
 * it is used directly. Otherwise, same value always maps to the same
 * palette color within a session.
 */
export function getColorForValue(value: string | null | undefined): string {
  if (!value) return COLOR_VARS[0];

  const trimmed = value.trim();

  // Direct hex color support
  if (isHexColor(trimmed)) {
    return normalizeHex(trimmed);
  }

  const key = trimmed.toLowerCase();
  if (colorCache.has(key)) {
    return COLOR_VARS[colorCache.get(key)! % COLOR_VARS.length];
  }

  // Use hash for deterministic assignment
  const idx = hashString(key) % COLOR_VARS.length;
  colorCache.set(key, idx);
  return COLOR_VARS[idx];
}

/**
 * Get a lighter version of a color for hover states.
 * Returns a CSS filter string.
 */
export function getHoverFilter(): string {
  return 'brightness(1.15)';
}

/**
 * Reset color cache (call when view options change).
 */
export function resetColorCache(): void {
  colorCache.clear();
  nextColorIndex = 0;
}
