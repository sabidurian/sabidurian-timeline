/**
 * ArrowRenderer — Renders dependency arrows between bars as SVG cubic Bezier paths.
 *
 * Phase 5: Dependency Arrows
 * - Parses "blocked-by" frontmatter (wikilinks) to build a dependency graph
 * - Draws arrows from blocker's right edge to blocked's left edge
 * - Colors: green/yellow when satisfied (blocker ends before blocked starts), red on conflict
 * - Hover: highlights both connected bars
 * - Right-click: "Remove dependency" context menu
 * - Arrow handle on bar right edge for drag-to-connect
 */

import type { App, TFile } from 'obsidian';
import { Notice, Menu } from 'obsidian';
import type { SabidurianEntry } from '../model/SabidurianEntry';
import { BAR_HEIGHT } from '../model/LayoutEngine';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ARROW_HEAD_SIZE = 8;
const ARROW_STROKE_WIDTH = 2;
const ARROW_HOVER_STROKE_WIDTH = 3.5;

export interface DependencyEdge {
  /** The blocker entry (the one that must finish first). */
  from: SabidurianEntry;
  /** The blocked entry (depends on `from`). */
  to: SabidurianEntry;
  /** Whether the dependency is satisfied (from ends before to starts). */
  satisfied: boolean;
}

export class ArrowRenderer {
  private app: App;
  private svg: SVGSVGElement;
  private arrowGroup: SVGGElement;
  private edges: DependencyEdge[] = [];
  private getRowY: (row: number) => number = () => 0;

  // Arrow handle overlay elements
  private handleGroup: SVGGElement;

  // Hover state
  private hoveredEdgeIndex: number | null = null;

  constructor(svg: SVGSVGElement, app: App) {
    this.app = app;
    this.svg = svg;

    // Arrow group rendered BELOW bars (insert before the bars group)
    this.arrowGroup = document.createElementNS(SVG_NS, 'g');
    this.arrowGroup.classList.add('sabidurian-arrows-group');
    const barsGroup = svg.querySelector('.sabidurian-bars-group');
    if (barsGroup) {
      svg.insertBefore(this.arrowGroup, barsGroup);
    } else {
      svg.appendChild(this.arrowGroup);
    }

    // Handle group rendered ON TOP of bars
    this.handleGroup = document.createElementNS(SVG_NS, 'g');
    this.handleGroup.classList.add('sabidurian-arrow-handles-group');
    svg.appendChild(this.handleGroup);
  }

  /**
   * Parse dependencies from entries and render arrows.
   * Each entry's `dependencies` array should already contain resolved file paths
   * of the blocker notes.
   */
  render(
    entries: SabidurianEntry[],
    getRowY: (row: number) => number,
  ): DependencyEdge[] {
    this.getRowY = getRowY;
    this.edges = [];

    // Build lookup: filePath → entry
    const byPath = new Map<string, SabidurianEntry>();
    for (const entry of entries) {
      byPath.set(entry.file.path, entry);
    }

    // Build edges from each entry's dependencies
    for (const entry of entries) {
      for (const depPath of entry.dependencies) {
        const blocker = byPath.get(depPath);
        if (!blocker) continue; // Dependency target not in current view
        if (blocker === entry) continue; // Self-reference

        const satisfied = blocker.endYear <= entry.startYear;
        this.edges.push({ from: blocker, to: entry, satisfied });
      }
    }

    // Render
    this.renderEdges();
    this.renderHandles(entries);

    return this.edges;
  }

  private renderEdges(): void {
    // Clear previous
    while (this.arrowGroup.firstChild) {
      this.arrowGroup.removeChild(this.arrowGroup.firstChild);
    }

    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i];
      this.renderArrow(edge, i);
    }
  }

  private renderArrow(edge: DependencyEdge, index: number): void {
    const fromY = this.getRowY(edge.from.row) + BAR_HEIGHT / 2;
    const toY = this.getRowY(edge.to.row) + BAR_HEIGHT / 2;

    // From: right edge of blocker bar
    const fromX = edge.from.isPoint
      ? edge.from.x + 7  // Point marker radius
      : edge.from.x + edge.from.width;

    // To: left edge of blocked bar
    const toX = edge.to.isPoint
      ? edge.to.x - 7
      : edge.to.x;

    // Cubic Bezier control points
    const dx = Math.abs(toX - fromX);
    const cpOffset = Math.max(dx * 0.4, 30);

    const cp1x = fromX + cpOffset;
    const cp1y = fromY;
    const cp2x = toX - cpOffset;
    const cp2y = toY;

    // Path group (path + arrowhead)
    const group = document.createElementNS(SVG_NS, 'g');
    group.classList.add('sabidurian-arrow-group');
    group.dataset.edgeIndex = `${index}`;

    // CSS class for color
    const colorClass = edge.satisfied ? 'sabidurian-arrow-ok' : 'sabidurian-arrow-conflict';
    group.classList.add(colorClass);

    // Path
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d',
      `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`
    );
    path.classList.add('sabidurian-arrow-path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', `${ARROW_STROKE_WIDTH}`);
    group.appendChild(path);

    // Invisible wider hit area for hover/click
    const hitPath = document.createElementNS(SVG_NS, 'path');
    hitPath.setAttribute('d',
      `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`
    );
    hitPath.classList.add('sabidurian-arrow-hit');
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '12');
    group.appendChild(hitPath);

    // Arrowhead triangle at endpoint
    const angle = Math.atan2(toY - cp2y, toX - cp2x);
    const headX1 = toX - ARROW_HEAD_SIZE * Math.cos(angle - Math.PI / 6);
    const headY1 = toY - ARROW_HEAD_SIZE * Math.sin(angle - Math.PI / 6);
    const headX2 = toX - ARROW_HEAD_SIZE * Math.cos(angle + Math.PI / 6);
    const headY2 = toY - ARROW_HEAD_SIZE * Math.sin(angle + Math.PI / 6);

    const arrowHead = document.createElementNS(SVG_NS, 'polygon');
    arrowHead.setAttribute('points',
      `${toX},${toY} ${headX1},${headY1} ${headX2},${headY2}`
    );
    arrowHead.classList.add('sabidurian-arrow-head');
    group.appendChild(arrowHead);

    // Interactions
    this.addArrowInteractions(group, edge, index);

    this.arrowGroup.appendChild(group);
  }

  private addArrowInteractions(
    group: SVGGElement,
    edge: DependencyEdge,
    index: number,
  ): void {
    // Hover: highlight arrow and both bars
    group.addEventListener('mouseenter', () => {
      this.hoveredEdgeIndex = index;
      group.classList.add('sabidurian-arrow-hover');
      this.highlightConnectedBars(edge, true);
    });

    group.addEventListener('mouseleave', () => {
      this.hoveredEdgeIndex = null;
      group.classList.remove('sabidurian-arrow-hover');
      this.highlightConnectedBars(edge, false);
    });

    // Right-click: context menu to remove dependency
    group.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showRemoveMenu(e as MouseEvent, edge);
    });
  }

  private highlightConnectedBars(edge: DependencyEdge, highlight: boolean): void {
    if (highlight) {
      // Find bar groups by data-file-path attribute
      const fromPath = edge.from.file.path;
      const toPath = edge.to.file.path;
      const fromBar = this.svg.querySelector(`.sabidurian-bar-group[data-file-path="${CSS.escape(fromPath)}"]`);
      const toBar = this.svg.querySelector(`.sabidurian-bar-group[data-file-path="${CSS.escape(toPath)}"]`);
      fromBar?.classList.add('sabidurian-bar-dep-highlight');
      toBar?.classList.add('sabidurian-bar-dep-highlight');
    } else {
      this.svg.querySelectorAll('.sabidurian-bar-dep-highlight').forEach(el => {
        el.classList.remove('sabidurian-bar-dep-highlight');
      });
    }
  }

  private showRemoveMenu(e: MouseEvent, edge: DependencyEdge): void {
    const menu = new Menu();
    menu.addItem((item) => {
      item
        .setTitle(`Remove dependency: ${edge.from.label} → ${edge.to.label}`)
        .setIcon('trash-2')
        .onClick(async () => {
          await this.removeDependency(edge);
        });
    });
    menu.showAtMouseEvent(e);
  }

  private async removeDependency(edge: DependencyEdge): Promise<void> {
    const targetFile = edge.to.file;
    const blockerBasename = edge.from.file.basename;

    await this.app.fileManager.processFrontMatter(targetFile, (fm) => {
      const deps: any[] = fm['blocked-by'] ?? [];
      if (!Array.isArray(deps)) return;

      // Filter out the wikilink matching the blocker
      fm['blocked-by'] = deps.filter((d: any) => {
        const str = String(d);
        // Match "[[Name]]" or "Name"
        const cleaned = str.replace(/^\[\[/, '').replace(/\]\]$/, '');
        return cleaned !== blockerBasename;
      });

      // Clean up empty array
      if (fm['blocked-by'].length === 0) {
        delete fm['blocked-by'];
      }
    });

    new Notice(`Removed dependency: ${blockerBasename} → ${edge.to.label}`);
  }

  /**
   * Render arrow handles (→○) on the right edge of each bar.
   * These are the drag-to-connect start points.
   */
  private renderHandles(entries: SabidurianEntry[]): void {
    while (this.handleGroup.firstChild) {
      this.handleGroup.removeChild(this.handleGroup.firstChild);
    }

    for (const entry of entries) {
      if (entry.isPoint) continue; // No handles on point events

      const y = this.getRowY(entry.row) + BAR_HEIGHT / 2;
      const x = entry.x + entry.width;

      const handle = document.createElementNS(SVG_NS, 'g');
      handle.classList.add('sabidurian-arrow-handle');
      handle.dataset.filePath = entry.file.path;

      // Circle
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', `${x + 10}`);
      circle.setAttribute('cy', `${y}`);
      circle.setAttribute('r', '5');
      circle.classList.add('sabidurian-arrow-handle-circle');
      handle.appendChild(circle);

      // Small arrow indicator
      const arrow = document.createElementNS(SVG_NS, 'path');
      arrow.setAttribute('d', `M ${x + 2} ${y} L ${x + 7} ${y}`);
      arrow.classList.add('sabidurian-arrow-handle-stem');
      handle.appendChild(arrow);

      handle.style.cursor = 'crosshair';
      this.handleGroup.appendChild(handle);
    }
  }

  /** Get the arrow handle elements for ArrowDragManager to attach events to. */
  get handles(): SVGGElement[] {
    return Array.from(this.handleGroup.querySelectorAll('.sabidurian-arrow-handle'));
  }

  /** Get current edges. */
  getEdges(): DependencyEdge[] {
    return this.edges;
  }

  destroy(): void {
    this.arrowGroup.remove();
    this.handleGroup.remove();
  }
}
