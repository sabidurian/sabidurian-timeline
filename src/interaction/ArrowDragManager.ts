/**
 * ArrowDragManager — Handles drag-to-connect: dragging from arrow handles
 * to create new dependency relationships between bars.
 *
 * Flow:
 *   Hover right edge of bar → arrow handle appears (→○)
 *   Mousedown on handle → begin drag
 *   Drag → provisional dashed arrow follows cursor
 *   Drop on another bar → add wikilink to target's blocked-by property
 *   Drop on empty → cancel (future: create note + dependency)
 */

import type { App } from 'obsidian';
import { Notice } from 'obsidian';
import type { SabidurianEntry } from '../model/SabidurianEntry';
import { BAR_HEIGHT } from '../model/LayoutEngine';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class ArrowDragManager {
  private app: App;
  private svg: SVGSVGElement;
  private entries: SabidurianEntry[] = [];
  private getRowY: (row: number) => number = () => 0;

  private isDragging = false;
  private sourceEntry: SabidurianEntry | null = null;
  private provisionalLine: SVGLineElement | null = null;

  private onConnectComplete: (() => void) | null = null;

  constructor(svg: SVGSVGElement, app: App) {
    this.app = app;
    this.svg = svg;
  }

  /**
   * Attach drag events to arrow handle elements.
   * Call after ArrowRenderer.render().
   */
  attach(
    handles: SVGGElement[],
    entries: SabidurianEntry[],
    getRowY: (row: number) => number,
  ): void {
    this.entries = entries;
    this.getRowY = getRowY;

    // Build lookup: filePath → entry
    const byPath = new Map<string, SabidurianEntry>();
    for (const entry of entries) {
      byPath.set(entry.file.path, entry);
    }

    for (const handle of handles) {
      const filePath = handle.dataset.filePath;
      if (!filePath) continue;
      const entry = byPath.get(filePath);
      if (!entry) continue;

      handle.addEventListener('mousedown', (e) => {
        if ((e as MouseEvent).button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        this.beginDrag(entry, e as MouseEvent);
      });
    }

    // Global move/up
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private beginDrag(entry: SabidurianEntry, e: MouseEvent): void {
    this.isDragging = true;
    this.sourceEntry = entry;
    document.body.classList.add('sabidurian-arrow-dragging');

    // Create provisional dashed line
    const y = this.getRowY(entry.row) + BAR_HEIGHT / 2;
    const x = entry.isPoint ? entry.x + 7 : entry.x + entry.width;

    this.provisionalLine = document.createElementNS(SVG_NS, 'line');
    this.provisionalLine.setAttribute('x1', `${x}`);
    this.provisionalLine.setAttribute('y1', `${y}`);
    this.provisionalLine.setAttribute('x2', `${x}`);
    this.provisionalLine.setAttribute('y2', `${y}`);
    this.provisionalLine.classList.add('sabidurian-provisional-arrow');
    this.svg.appendChild(this.provisionalLine);
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging || !this.provisionalLine) return;

    const svgRect = this.svg.getBoundingClientRect();
    const localX = e.clientX - svgRect.left;
    const localY = e.clientY - svgRect.top;

    this.provisionalLine.setAttribute('x2', `${localX}`);
    this.provisionalLine.setAttribute('y2', `${localY}`);

    // Highlight bar under cursor
    this.clearDropHighlights();
    const target = this.findBarAtPoint(localX, localY);
    if (target && target !== this.sourceEntry) {
      this.highlightDropTarget(target, true);
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const svgRect = this.svg.getBoundingClientRect();
    const localX = e.clientX - svgRect.left;
    const localY = e.clientY - svgRect.top;

    const target = this.findBarAtPoint(localX, localY);
    if (target && target !== this.sourceEntry && this.sourceEntry) {
      this.createDependency(this.sourceEntry, target);
    }

    this.resetDrag();
  };

  /**
   * Find which entry's bar is at the given SVG-local coordinates.
   */
  private findBarAtPoint(x: number, y: number): SabidurianEntry | null {
    for (const entry of this.entries) {
      const entryY = this.getRowY(entry.row);
      if (y < entryY || y > entryY + BAR_HEIGHT) continue;

      if (entry.isPoint) {
        if (Math.abs(x - entry.x) < 10) return entry;
      } else {
        if (x >= entry.x && x <= entry.x + entry.width) return entry;
      }
    }
    return null;
  }

  private highlightDropTarget(entry: SabidurianEntry, highlight: boolean): void {
    const bar = this.svg.querySelector(
      `.sabidurian-bar-group[data-file-path="${CSS.escape(entry.file.path)}"]`
    );
    if (bar) {
      if (highlight) {
        bar.classList.add('sabidurian-arrow-drop-target');
      } else {
        bar.classList.remove('sabidurian-arrow-drop-target');
      }
    }
  }

  private clearDropHighlights(): void {
    this.svg.querySelectorAll('.sabidurian-arrow-drop-target').forEach(el => {
      el.classList.remove('sabidurian-arrow-drop-target');
    });
  }

  /**
   * Add a dependency: source blocks target.
   * Writes `[[source.basename]]` into target's `blocked-by` frontmatter array.
   */
  private async createDependency(source: SabidurianEntry, target: SabidurianEntry): Promise<void> {
    const wikilink = `[[${source.file.basename}]]`;

    await this.app.fileManager.processFrontMatter(target.file, (fm) => {
      let deps: any[] = fm['blocked-by'] ?? [];
      if (!Array.isArray(deps)) deps = [];

      // Check for duplicates
      const exists = deps.some((d: any) => {
        const str = String(d);
        const cleaned = str.replace(/^\[\[/, '').replace(/\]\]$/, '');
        return cleaned === source.file.basename;
      });

      if (!exists) {
        deps.push(wikilink);
        fm['blocked-by'] = deps;
      }
    });

    new Notice(`Added dependency: ${source.label} → ${target.label}`);
    this.onConnectComplete?.();
  }

  private resetDrag(): void {
    this.isDragging = false;
    this.sourceEntry = null;
    if (this.provisionalLine) {
      this.provisionalLine.remove();
      this.provisionalLine = null;
    }
    this.clearDropHighlights();
    document.body.classList.remove('sabidurian-arrow-dragging');
  }

  setConnectCompleteCallback(cb: () => void): void {
    this.onConnectComplete = cb;
  }

  destroy(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.resetDrag();
  }
}
