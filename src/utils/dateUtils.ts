/**
 * Date utilities for Sabidurian Timeline.
 * Handles parsing, formatting, and BCE date logic.
 */

export interface SabidurianDate {
  year: number;           // Negative for BCE: -500 = 501 BCE
  month?: number;         // 0-11, only for CE dates at month+ precision
  day?: number;           // 1-31, only for CE dates at day+ precision
  hour?: number;          // 0-23, only for hour scale
  isHistorical: boolean;  // true if year < 1 (BCE territory)
}

/**
 * Parse a frontmatter value into a SabidurianDate.
 *
 * Priority:
 * 1. ISO 8601 "2025-03-27" → { year: 2025, month: 2, day: 27 }
 * 2. "2025-03" → { year: 2025, month: 2 }
 * 3. "2025" → { year: 2025 }
 * 4. "-500" or "501 BCE" → { year: -500, isHistorical: true }
 * 5. Numeric value → treated as year
 */
export function parseSabidurianDate(value: unknown): SabidurianDate | null {
  if (value == null) return null;

  // Handle raw numbers directly (e.g. -500 from YAML frontmatter)
  if (typeof value === 'number') {
    if (!isFinite(value)) return null;
    return { year: Math.round(value), isHistorical: value < 1 };
  }

  // Handle JS Date objects (YAML auto-parses YYYY-MM-DD strings as Dates)
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    // Use UTC methods to avoid timezone shifts
    const y = value.getUTCFullYear();
    return {
      year: y,
      month: value.getUTCMonth(),
      day: value.getUTCDate(),
      isHistorical: y < 1,
    };
  }

  const raw = typeof value === 'object' && value !== null && 'toString' in value
    ? value.toString()
    : String(value);

  if (!raw || raw === 'null' || raw === 'undefined') return null;

  // Try BCE string: "501 BCE" or "501 BC"
  const bceMatch = raw.match(/^(\d+)\s*BC(?:E)?$/i);
  if (bceMatch) {
    const bceYear = parseInt(bceMatch[1], 10);
    return { year: -(bceYear - 1), isHistorical: true };
  }

  // Try negative number (astronomical year notation)
  const negMatch = raw.match(/^-(\d+)$/);
  if (negMatch) {
    const y = -parseInt(negMatch[1], 10);
    return { year: y, isHistorical: true };
  }

  // Try ISO 8601 with time: "2025-03-27T14:30:00" (1-4 digit year)
  const isoTimeMatch = raw.match(/^(\d{1,4})-(\d{2})-(\d{2})T(\d{2})/);
  if (isoTimeMatch) {
    const y = parseInt(isoTimeMatch[1], 10);
    return {
      year: y,
      month: parseInt(isoTimeMatch[2], 10) - 1,
      day: parseInt(isoTimeMatch[3], 10),
      hour: parseInt(isoTimeMatch[4], 10),
      isHistorical: false,
    };
  }

  // Try ISO date: "2025-03-27" or "0533-03-04" (1-4 digit year)
  const isoDateMatch = raw.match(/^(\d{1,4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const y = parseInt(isoDateMatch[1], 10);
    return {
      year: y,
      month: parseInt(isoDateMatch[2], 10) - 1,
      day: parseInt(isoDateMatch[3], 10),
      isHistorical: false,
    };
  }

  // Try year-month: "2025-03" or "0533-03" (1-4 digit year)
  const ymMatch = raw.match(/^(\d{1,4})-(\d{2})$/);
  if (ymMatch) {
    const y = parseInt(ymMatch[1], 10);
    return {
      year: y,
      month: parseInt(ymMatch[2], 10) - 1,
      isHistorical: false,
    };
  }

  // Try plain year: "2025" or "533"
  const yearMatch = raw.match(/^(\d{1,4})$/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    return { year: y, isHistorical: y < 1 };
  }

  return null;
}

/**
 * Convert a SabidurianDate to a JS Date (CE dates only).
 * Returns null for historical/BCE dates.
 */
export function sabidurianDateToDate(cd: SabidurianDate): Date | null {
  if (cd.isHistorical) return null;
  // Use setFullYear to avoid JS treating years 0-99 as 1900-1999
  const d = new Date(2000, cd.month ?? 0, cd.day ?? 1, cd.hour ?? 0);
  d.setFullYear(cd.year);
  return d;
}

/**
 * Convert a SabidurianDate to a fractional year for axis positioning.
 * e.g., 2025-07-01 → ~2025.5
 */
export function sabidurianDateToYear(cd: SabidurianDate): number {
  if (cd.isHistorical || cd.month == null) {
    return cd.year;
  }
  const monthFrac = cd.month / 12;
  const dayFrac = cd.day != null ? (cd.day - 1) / 365 : 0;
  const hourFrac = cd.hour != null ? cd.hour / 8760 : 0;
  return cd.year + monthFrac + dayFrac + hourFrac;
}

/**
 * Format a year number for display.
 * -500 → "501 BCE"
 *    0 → "1 BCE"
 *    1 → "1 CE"
 * 2025 → "2025"
 */
export function formatYear(year: number): string {
  if (year <= 0) {
    return `${1 - year} BCE`;
  }
  if (year < 100) {
    return `${year} CE`;
  }
  return `${year}`;
}

/**
 * Format a SabidurianDate for display at various precisions.
 */
export function formatSabidurianDate(cd: SabidurianDate): string {
  if (cd.isHistorical) {
    return formatYear(cd.year);
  }
  if (cd.month == null) {
    return `${cd.year}`;
  }
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  if (cd.day == null) {
    return `${monthNames[cd.month]} ${cd.year}`;
  }
  if (cd.hour != null) {
    return `${monthNames[cd.month]} ${cd.day}, ${cd.year} ${cd.hour}:00`;
  }
  return `${monthNames[cd.month]} ${cd.day}, ${cd.year}`;
}

/**
 * Format a SabidurianDate back to YAML-friendly string.
 */
export function formatDateForYAML(cd: SabidurianDate): string | number {
  if (cd.isHistorical) {
    // Return plain number for YAML serialization
    return cd.year;
  }
  const y = String(cd.year).padStart(4, '0');
  if (cd.month == null) return y;
  const m = String(cd.month + 1).padStart(2, '0');
  if (cd.day == null) return `${y}-${m}`;
  const d = String(cd.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get the number of days in a given month (1-indexed month).
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
