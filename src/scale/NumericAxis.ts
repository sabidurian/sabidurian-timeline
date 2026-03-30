/**
 * NumericAxis — Core x-axis math.
 * Pure linear mapping between year values and pixel positions.
 * No Date objects in this module — works for both CE and BCE.
 */

export class NumericAxis {
  constructor(
    public viewStart: number,
    public viewEnd: number,
    public totalWidth: number,
  ) {}

  /** Convert a year (fractional) to a pixel x position. */
  yearToPixel(year: number): number {
    const range = this.viewEnd - this.viewStart;
    if (range === 0) return 0;
    return ((year - this.viewStart) / range) * this.totalWidth;
  }

  /** Convert a pixel x position to a year (fractional). */
  pixelToYear(px: number): number {
    const range = this.viewEnd - this.viewStart;
    if (this.totalWidth === 0) return this.viewStart;
    return this.viewStart + (px / this.totalWidth) * range;
  }

  /** Get the number of pixels per year at current zoom. */
  get pixelsPerYear(): number {
    const range = this.viewEnd - this.viewStart;
    if (range === 0) return 0;
    return this.totalWidth / range;
  }

  /** Update view bounds. */
  setView(start: number, end: number, width: number): void {
    this.viewStart = start;
    this.viewEnd = end;
    this.totalWidth = width;
  }
}
