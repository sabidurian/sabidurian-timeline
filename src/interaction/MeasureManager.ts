/**
 * MeasureManager — Click two points on the timeline to see elapsed time.
 *
 * State machine: idle → awaiting-a → awaiting-b → displaying → idle
 *
 * Supports both Timeline (year-based) and Sequence (ordinal) modes.
 */

import { NumericAxis } from '../scale/NumericAxis';

const SVG_NS = 'http://www.w3.org/2000/svg';

type MeasureState = 'idle' | 'awaiting-a' | 'awaiting-b' | 'displaying';

interface MeasurePoint {
  year: number;
  x: number;
  y: number;
}

export class MeasureManager {
  state: MeasureState = 'idle';
  private pointA: MeasurePoint | null = null;
  private pointB: MeasurePoint | null = null;
  private overlayEl: HTMLElement | null = null;
  private markerA: SVGElement | null = null;
  private markerB: SVGElement | null = null;
  private spanLine: SVGElement | null = null;

  /** When true, shows "N positions" instead of time units. */
  sequenceMode = false;

  constructor(
    private svg: SVGSVGElement,
    private containerEl: HTMLElement,
    private axis: NumericAxis,
  ) {}

  activate(): void {
    this.state = 'awaiting-a';
    this.containerEl.classList.add('sabidurian-measure-mode');
  }

  deactivate(): void {
    this.state = 'idle';
    this.containerEl.classList.remove('sabidurian-measure-mode');
    this.clearVisuals();
  }

  get isActive(): boolean {
    return this.state !== 'idle';
  }

  handleClick(e: MouseEvent): boolean {
    if (this.state === 'idle') return false;

    const rect = this.svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const year = this.axis.pixelToYear(x);

    if (this.state === 'awaiting-a') {
      this.pointA = { year, x, y };
      this.renderMarker(this.pointA, 'a');
      this.state = 'awaiting-b';
      return true;
    }

    if (this.state === 'awaiting-b') {
      this.pointB = { year, x, y };
      this.renderMarker(this.pointB, 'b');
      this.renderMeasurement();
      this.state = 'displaying';
      return true;
    }

    if (this.state === 'displaying') {
      this.deactivate();
      return true;
    }

    return false;
  }

  handleKeydown(e: KeyboardEvent): boolean {
    if (e.key === 'Escape' && this.state !== 'idle') {
      this.deactivate();
      return true;
    }
    return false;
  }

  private renderMarker(point: MeasurePoint, id: string): void {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', `${point.x}`);
    line.setAttribute('x2', `${point.x}`);
    line.setAttribute('y1', '0');
    const svgHeight = this.svg.getAttribute('height') || `${this.svg.clientHeight}`;
    line.setAttribute('y2', svgHeight);
    line.classList.add('sabidurian-measure-marker');
    this.svg.appendChild(line);
    if (id === 'a') this.markerA = line;
    else this.markerB = line;
  }

  private renderMeasurement(): void {
    if (!this.pointA || !this.pointB) return;

    const [earlier, later] = this.pointA.year < this.pointB.year
      ? [this.pointA, this.pointB]
      : [this.pointB, this.pointA];

    // Span line between markers
    const midY = Math.min(earlier.y, later.y) - 16;
    const spanLine = document.createElementNS(SVG_NS, 'line');
    spanLine.setAttribute('x1', `${earlier.x}`);
    spanLine.setAttribute('x2', `${later.x}`);
    spanLine.setAttribute('y1', `${midY}`);
    spanLine.setAttribute('y2', `${midY}`);
    spanLine.classList.add('sabidurian-measure-span');
    this.svg.appendChild(spanLine);
    this.spanLine = spanLine;

    // Compute duration text
    const durationText = this.sequenceMode
      ? this.computeSequenceDistance(earlier.year, later.year)
      : this.computeDuration(earlier.year, later.year);

    // Floating label — positioned inside the timeline scroll container
    const overlay = document.createElement('div');
    overlay.classList.add('sabidurian-measure-label');
    overlay.textContent = durationText;
    const midX = (earlier.x + later.x) / 2;
    // Ensure label stays within visible area (min top = 4px)
    const labelTop = Math.max(4, midY - 28);
    overlay.style.left = `${midX}px`;
    overlay.style.top = `${labelTop}px`;
    // Append to the scrollable timeline body so it scrolls with content
    const timelineBody = this.containerEl.querySelector('.sabidurian-timeline-body');
    if (timelineBody) {
      timelineBody.appendChild(overlay);
    } else {
      // Fallback: append to container itself
      this.containerEl.appendChild(overlay);
    }
    this.overlayEl = overlay;
  }

  private computeDuration(yearA: number, yearB: number): string {
    const diff = Math.abs(yearB - yearA);

    if (diff >= 1) {
      const years = Math.floor(diff);
      const remainingMonths = Math.round((diff - years) * 12);
      if (remainingMonths > 0 && years < 100) {
        return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
      }
      return `~${years.toLocaleString()} year${years !== 1 ? 's' : ''}`;
    }

    const months = Math.floor(diff * 12);
    if (months >= 1) {
      const remainingDays = Math.round((diff * 365) - (months * 30.44));
      if (remainingDays > 0) {
        return `${months} month${months !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
      }
      return `${months} month${months !== 1 ? 's' : ''}`;
    }

    const days = Math.round(diff * 365);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  private computeSequenceDistance(posA: number, posB: number): string {
    const diff = Math.abs(Math.round(posB) - Math.round(posA));
    return `${diff} position${diff !== 1 ? 's' : ''}`;
  }

  private clearVisuals(): void {
    this.markerA?.remove();
    this.markerB?.remove();
    this.spanLine?.remove();
    this.overlayEl?.remove();
    this.markerA = this.markerB = this.spanLine = null;
    this.overlayEl = null;
    this.pointA = this.pointB = null;
  }

  destroy(): void {
    this.deactivate();
  }
}
