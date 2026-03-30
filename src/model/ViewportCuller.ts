/**
 * ViewportCuller — Filters entries to only those visible in the current
 * scroll viewport, both horizontally (date range) and vertically (row range).
 *
 * Used to avoid rendering hundreds of off-screen SVG elements.
 * All entries must have .x, .width, and .row already assigned by LayoutEngine.
 */

import type { SabidurianEntry } from './SabidurianEntry';
import { ROW_HEIGHT } from './LayoutEngine';

/** Padding in pixels beyond the viewport to pre-render (prevents pop-in). */
const H_BUFFER = 200;
const V_BUFFER = 100;

export interface ViewportBounds {
  scrollLeft: number;
  scrollTop: number;
  viewportWidth: number;
  viewportHeight: number;
}

export class ViewportCuller {
  private getRowY: (row: number) => number;

  constructor(getRowY: (row: number) => number) {
    this.getRowY = getRowY;
  }

  /**
   * Return only the entries whose bars/points fall within the visible
   * scroll region (with buffer).
   */
  cull(entries: SabidurianEntry[], bounds: ViewportBounds): SabidurianEntry[] {
    const left = bounds.scrollLeft - H_BUFFER;
    const right = bounds.scrollLeft + bounds.viewportWidth + H_BUFFER;
    const top = bounds.scrollTop - V_BUFFER;
    const bottom = bounds.scrollTop + bounds.viewportHeight + V_BUFFER;

    return entries.filter((entry) => {
      // Horizontal check: bar or point must overlap [left, right]
      const entryLeft = entry.x;
      const entryRight = entry.isPoint ? entry.x + 40 : entry.x + entry.width;
      if (entryRight < left || entryLeft > right) return false;

      // Vertical check: row must overlap [top, bottom]
      const rowY = this.getRowY(entry.row);
      if (rowY + ROW_HEIGHT < top || rowY > bottom) return false;

      return true;
    });
  }

  /**
   * Quick check: did the viewport change enough to warrant a re-cull?
   * Returns true if scroll moved more than half the buffer distance.
   */
  static shouldRecull(prev: ViewportBounds | null, curr: ViewportBounds): boolean {
    if (!prev) return true;
    const dh = Math.abs(curr.scrollLeft - prev.scrollLeft);
    const dv = Math.abs(curr.scrollTop - prev.scrollTop);
    return dh > H_BUFFER / 2 || dv > V_BUFFER / 2;
  }
}
