/**
 * TimelineRenderer — The main SVG canvas for grid lines, today marker, and (later) bars.
 * Phase 1: Renders grid + today marker. Bars come in Phase 2.
 */

import { NumericAxis } from '../scale/NumericAxis';
import { ColumnBoundary } from '../scale/TimeScale';
import { sabidurianDateToYear, type SabidurianDate } from '../utils/dateUtils';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class TimelineRenderer {
  private wrapperEl: HTMLElement;
  private svg: SVGSVGElement;
  private gridGroup: SVGGElement;
  private todayGroup: SVGGElement;

  constructor(parentEl: HTMLElement) {
    this.wrapperEl = parentEl.createDiv({ cls: 'sabidurian-timeline-body' });

    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.classList.add('sabidurian-svg');
    this.wrapperEl.appendChild(this.svg);

    this.gridGroup = document.createElementNS(SVG_NS, 'g');
    this.gridGroup.classList.add('sabidurian-grid');
    this.svg.appendChild(this.gridGroup);

    this.todayGroup = document.createElementNS(SVG_NS, 'g');
    this.todayGroup.classList.add('sabidurian-today-group');
    this.svg.appendChild(this.todayGroup);
  }

  render(
    columns: ColumnBoundary[],
    axis: NumericAxis,
    totalHeight: number,
    showToday = true,
  ): void {
    // Set SVG dimensions
    this.svg.setAttribute('width', `${axis.totalWidth}`);
    this.svg.setAttribute('height', `${Math.max(totalHeight, 200)}`);

    this.renderGrid(columns, axis, totalHeight);
    if (showToday) {
      this.renderTodayMarker(axis, totalHeight);
    }
  }

  private renderGrid(columns: ColumnBoundary[], axis: NumericAxis, height: number): void {
    // Clear previous grid
    while (this.gridGroup.firstChild) {
      this.gridGroup.removeChild(this.gridGroup.firstChild);
    }

    // Alternating column shading + grid lines
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const x = axis.yearToPixel(col.start);
      const w = axis.yearToPixel(col.end) - x;

      // Subtle alternating background
      if (i % 2 === 0) {
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', `${x}`);
        rect.setAttribute('y', '0');
        rect.setAttribute('width', `${w}`);
        rect.setAttribute('height', `${height}`);
        rect.classList.add('sabidurian-grid-band');
        this.gridGroup.appendChild(rect);
      }

      // Grid line (major at tier starts, minor otherwise)
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', `${x}`);
      line.setAttribute('y1', '0');
      line.setAttribute('x2', `${x}`);
      line.setAttribute('y2', `${height}`);
      line.classList.add(col.isTierStart ? 'sabidurian-grid-line-major' : 'sabidurian-grid-line-minor');
      this.gridGroup.appendChild(line);
    }
  }

  private renderTodayMarker(axis: NumericAxis, height: number): void {
    while (this.todayGroup.firstChild) {
      this.todayGroup.removeChild(this.todayGroup.firstChild);
    }

    const now = new Date();
    const todayYear = now.getFullYear();
    const startOfYear = new Date(todayYear, 0, 1).getTime();
    const endOfYear = new Date(todayYear + 1, 0, 1).getTime();
    const todayFrac = todayYear + (now.getTime() - startOfYear) / (endOfYear - startOfYear);

    // Only render if today is within view bounds
    if (todayFrac < axis.viewStart || todayFrac > axis.viewEnd) return;

    const x = axis.yearToPixel(todayFrac);

    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', `${x}`);
    line.setAttribute('y1', '0');
    line.setAttribute('x2', `${x}`);
    line.setAttribute('y2', `${height}`);
    line.classList.add('sabidurian-today-line');
    this.todayGroup.appendChild(line);

    // "Today" label at top
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', `${x}`);
    text.setAttribute('y', '12');
    text.classList.add('sabidurian-today-label');
    text.textContent = 'Today';
    this.todayGroup.appendChild(text);
  }

  get element(): HTMLElement {
    return this.wrapperEl;
  }

  get svgElement(): SVGSVGElement {
    return this.svg;
  }

  /** Re-append the today group so it renders above all other SVG content. */
  raiseTodayMarker(): void {
    this.svg.appendChild(this.todayGroup);
  }

  scrollToYear(axis: NumericAxis, year: number): void {
    const x = axis.yearToPixel(year);
    this.wrapperEl.scrollLeft = Math.max(0, x - this.wrapperEl.clientWidth / 2);
  }
}
