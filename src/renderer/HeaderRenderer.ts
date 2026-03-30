/**
 * HeaderRenderer — Two-tier column headers for the timeline.
 * Top tier: coarser grouping (e.g., year above months).
 * Bottom tier: individual column labels.
 */

import { NumericAxis } from '../scale/NumericAxis';
import { ColumnBoundary } from '../scale/TimeScale';

export class HeaderRenderer {
  private headerEl: HTMLElement;
  private topTierEl: HTMLElement;
  private bottomTierEl: HTMLElement;

  constructor(parentEl: HTMLElement) {
    this.headerEl = parentEl.createDiv({ cls: 'sabidurian-header-bar' });
    this.topTierEl = this.headerEl.createDiv({ cls: 'sabidurian-header-tier sabidurian-header-tier-top' });
    this.bottomTierEl = this.headerEl.createDiv({ cls: 'sabidurian-header-tier sabidurian-header-tier-bottom' });
  }

  render(columns: ColumnBoundary[], axis: NumericAxis): void {
    this.topTierEl.empty();
    this.bottomTierEl.empty();

    // Group columns by tier label for the top tier
    let currentTierLabel = '';
    let tierStartPx = 0;

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const x = axis.yearToPixel(col.start);
      const w = axis.yearToPixel(col.end) - x;

      // Bottom tier: individual column
      const cell = this.bottomTierEl.createDiv({ cls: 'sabidurian-header-cell' });
      cell.style.left = `${x}px`;
      cell.style.width = `${Math.max(w, 1)}px`;
      cell.setText(col.label);

      // Top tier: group by tierLabel
      if (col.tierLabel && (col.isTierStart || col.tierLabel !== currentTierLabel)) {
        if (currentTierLabel && tierStartPx < x) {
          this.createTierCell(currentTierLabel, tierStartPx, x - tierStartPx);
        }
        currentTierLabel = col.tierLabel;
        tierStartPx = x;
      }
    }

    // Close final tier group
    if (currentTierLabel && columns.length > 0) {
      const lastCol = columns[columns.length - 1];
      const endPx = axis.yearToPixel(lastCol.end);
      this.createTierCell(currentTierLabel, tierStartPx, endPx - tierStartPx);
    }
  }

  private createTierCell(label: string, x: number, w: number): void {
    const cell = this.topTierEl.createDiv({ cls: 'sabidurian-header-cell sabidurian-header-cell-tier' });
    cell.style.left = `${x}px`;
    cell.style.width = `${Math.max(w, 1)}px`;
    cell.setText(label);
  }

  get element(): HTMLElement {
    return this.headerEl;
  }

  setScrollLeft(px: number): void {
    this.headerEl.scrollLeft = px;
  }
}
