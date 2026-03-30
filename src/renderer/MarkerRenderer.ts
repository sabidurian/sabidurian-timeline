/**
 * MarkerRenderer — Renders calendar markers (vertical lines or shaded bands)
 * on the timeline as persistent visual indicators.
 *
 * Markers are defined in plugin settings (not per-note) and render
 * behind bars but above the grid.
 */

import { parseSabidurianDate, sabidurianDateToYear } from '../utils/dateUtils';
import type { NumericAxis } from '../scale/NumericAxis';
import type { SabidurianMarker } from '../settings';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class MarkerRenderer {
  private markerGroup: SVGGElement | null = null;

  render(
    svg: SVGSVGElement,
    markers: SabidurianMarker[],
    axis: NumericAxis,
    canvasHeight: number,
  ): void {
    // Remove previous marker group
    this.destroy();

    const markerGroup = document.createElementNS(SVG_NS, 'g');
    markerGroup.classList.add('sabidurian-markers-group');

    for (const marker of markers) {
      if (!marker.enabled) continue;

      if (marker.date) {
        // Single date → vertical line
        const parsed = parseSabidurianDate(marker.date);
        if (!parsed) continue;
        const year = sabidurianDateToYear(parsed);
        const x = axis.yearToPixel(year);

        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', `${x}`);
        line.setAttribute('x2', `${x}`);
        line.setAttribute('y1', '0');
        line.setAttribute('y2', `${canvasHeight}`);
        line.style.stroke = marker.color;
        line.classList.add('sabidurian-marker-line');
        markerGroup.appendChild(line);

        // Label at top
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', `${x + 4}`);
        text.setAttribute('y', '12');
        text.textContent = marker.label;
        text.classList.add('sabidurian-marker-label');
        text.style.fill = marker.color;
        markerGroup.appendChild(text);

      } else if (marker.start && marker.end) {
        // Range → shaded band
        const startParsed = parseSabidurianDate(marker.start);
        const endParsed = parseSabidurianDate(marker.end);
        if (!startParsed || !endParsed) continue;

        const x1 = axis.yearToPixel(sabidurianDateToYear(startParsed));
        const x2 = axis.yearToPixel(sabidurianDateToYear(endParsed));

        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', `${Math.min(x1, x2)}`);
        rect.setAttribute('y', '0');
        rect.setAttribute('width', `${Math.abs(x2 - x1)}`);
        rect.setAttribute('height', `${canvasHeight}`);
        rect.style.fill = marker.color;
        rect.classList.add('sabidurian-marker-band');
        markerGroup.appendChild(rect);

        // Label at top-left of band
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', `${Math.min(x1, x2) + 4}`);
        text.setAttribute('y', '12');
        text.textContent = marker.label;
        text.classList.add('sabidurian-marker-label');
        text.style.fill = marker.color;
        markerGroup.appendChild(text);
      }
    }

    // Insert before the bars group so markers render behind bars
    const barsGroup = svg.querySelector('.sabidurian-bars-group');
    if (barsGroup) {
      svg.insertBefore(markerGroup, barsGroup);
    } else {
      svg.appendChild(markerGroup);
    }

    this.markerGroup = markerGroup;
  }

  destroy(): void {
    this.markerGroup?.remove();
    this.markerGroup = null;
  }
}
