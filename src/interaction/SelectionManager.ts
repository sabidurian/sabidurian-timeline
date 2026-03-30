/**
 * SelectionManager — Tracks selected entries and renders selection highlights.
 *
 * Supports single selection, Shift+click range select, and Ctrl/Cmd+A select all.
 * Emits callbacks when selection changes so keyboard/context menu can react.
 */

import type { SabidurianEntry } from '../model/SabidurianEntry';

export class SelectionManager {
  private svg: SVGSVGElement;
  private entries: SabidurianEntry[] = [];
  private selectedIndices: Set<number> = new Set();
  private onSelectionChange: ((indices: number[]) => void) | null = null;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
  }

  attach(entries: SabidurianEntry[]): void {
    this.entries = entries;
    this.selectedIndices.clear();

    const groups = this.svg.querySelectorAll('.sabidurian-bar-group');
    groups.forEach((group, idx) => {
      if (idx >= entries.length) return;

      group.addEventListener('click', (e) => {
        const ev = e as MouseEvent;
        // Don't interfere with drag completions
        if (ev.detail === 0) return;

        if (ev.shiftKey && this.selectedIndices.size > 0) {
          // Range select: from last selected to this
          const lastSelected = Math.max(...this.selectedIndices);
          const lo = Math.min(lastSelected, idx);
          const hi = Math.max(lastSelected, idx);
          for (let i = lo; i <= hi; i++) this.selectedIndices.add(i);
        } else if (ev.ctrlKey || ev.metaKey) {
          // Toggle this entry
          if (this.selectedIndices.has(idx)) {
            this.selectedIndices.delete(idx);
          } else {
            this.selectedIndices.add(idx);
          }
        } else {
          // Single select (handled by normal click — don't override open behavior)
          // We'll only set selection on keyboard nav, not regular click
          return;
        }
        e.stopPropagation();
        this.renderHighlights();
        this.emitChange();
      });
    });
  }

  /** Select a single entry by index (used by keyboard nav). */
  select(index: number): void {
    this.selectedIndices.clear();
    if (index >= 0 && index < this.entries.length) {
      this.selectedIndices.add(index);
    }
    this.renderHighlights();
    this.scrollToSelected(index);
    this.emitChange();
  }

  /** Add to selection (Shift behavior). */
  addRange(from: number, to: number): void {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    for (let i = lo; i <= hi; i++) this.selectedIndices.add(i);
    this.renderHighlights();
    this.emitChange();
  }

  /** Select all entries. */
  selectAll(): void {
    for (let i = 0; i < this.entries.length; i++) this.selectedIndices.add(i);
    this.renderHighlights();
    this.emitChange();
  }

  /** Clear all selection. */
  clear(): void {
    this.selectedIndices.clear();
    this.renderHighlights();
    this.emitChange();
  }

  /** Get currently selected entry (first, for single-selection commands). */
  getSelectedEntry(): SabidurianEntry | null {
    if (this.selectedIndices.size === 0) return null;
    const idx = Math.min(...this.selectedIndices);
    return this.entries[idx] ?? null;
  }

  /** Get all selected entries. */
  getSelectedEntries(): SabidurianEntry[] {
    return [...this.selectedIndices]
      .sort((a, b) => a - b)
      .map(i => this.entries[i])
      .filter(Boolean);
  }

  /** Get the index of the single selected entry, or -1. */
  getSelectedIndex(): number {
    if (this.selectedIndices.size !== 1) return -1;
    return [...this.selectedIndices][0];
  }

  /** Number of entries for bounds checking. */
  get count(): number {
    return this.entries.length;
  }

  setSelectionChangeCallback(cb: (indices: number[]) => void): void {
    this.onSelectionChange = cb;
  }

  private emitChange(): void {
    this.onSelectionChange?.([...this.selectedIndices].sort((a, b) => a - b));
  }

  private renderHighlights(): void {
    const groups = this.svg.querySelectorAll('.sabidurian-bar-group');
    groups.forEach((group, idx) => {
      if (this.selectedIndices.has(idx)) {
        group.classList.add('sabidurian-bar-selected');
      } else {
        group.classList.remove('sabidurian-bar-selected');
      }
    });
  }

  /** Scroll the timeline so a selected bar is visible. */
  private scrollToSelected(index: number): void {
    const groups = this.svg.querySelectorAll('.sabidurian-bar-group');
    const group = groups[index] as SVGGElement | undefined;
    if (!group) return;

    const svgWrapper = this.svg.parentElement;
    if (!svgWrapper) return;

    const bbox = group.getBBox();
    const wrapperRect = svgWrapper.getBoundingClientRect();
    const currentScroll = svgWrapper.scrollLeft;

    // If bar is out of horizontal view, scroll to it
    if (bbox.x < currentScroll || bbox.x + bbox.width > currentScroll + wrapperRect.width) {
      svgWrapper.scrollLeft = bbox.x - wrapperRect.width / 4;
    }

    // Vertical scroll
    const currentScrollTop = svgWrapper.scrollTop;
    if (bbox.y < currentScrollTop || bbox.y + bbox.height > currentScrollTop + wrapperRect.height) {
      svgWrapper.scrollTop = bbox.y - wrapperRect.height / 4;
    }
  }

  destroy(): void {
    this.selectedIndices.clear();
    this.onSelectionChange = null;
  }
}
