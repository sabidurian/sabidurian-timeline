/**
 * KeyboardManager — Keyboard navigation for the timeline view.
 *
 * Keys:
 *   Arrow Left/Right — move selection between bars (sorted by start date)
 *   Arrow Up/Down — move selection between rows
 *   Enter — open selected entry
 *   Delete/Backspace — delete selected entry (with confirmation)
 *   T — scroll to today
 *   +/= — zoom in (next finer scale)
 *   - — zoom out (next coarser scale)
 *   1-7 — jump to scale by index
 *   Tab — move selection forward, Shift+Tab backward
 *   Escape — clear selection
 *   Ctrl/Cmd+A — select all
 */

import type { App } from 'obsidian';
import { Notice } from 'obsidian';
import type { SabidurianEntry } from '../model/SabidurianEntry';
import { SCALES } from '../scale/TimeScale';
import type { SelectionManager } from './SelectionManager';

type ScrollToTodayCallback = () => void;
type ChangeScaleCallback = (scaleId: string) => void;
type DeleteEntryCallback = (entry: SabidurianEntry) => void;
type RefreshCallback = () => void;
type MeasureToggleCallback = () => void;

export class KeyboardManager {
  private app: App;
  private container: HTMLElement;
  private entries: SabidurianEntry[] = [];
  private selectionManager: SelectionManager;
  private currentScaleId: string = '';

  // Sorted indices for left/right navigation (by startYear)
  private sortedByStart: number[] = [];

  // Callbacks
  private onScrollToToday: ScrollToTodayCallback | null = null;
  private onChangeScale: ChangeScaleCallback | null = null;
  private onDeleteEntry: DeleteEntryCallback | null = null;
  private onRefresh: RefreshCallback | null = null;
  private onMeasureToggle: MeasureToggleCallback | null = null;

  private boundKeyHandler: (e: KeyboardEvent) => void;

  constructor(
    container: HTMLElement,
    app: App,
    selectionManager: SelectionManager,
    currentScaleId: string,
  ) {
    this.app = app;
    this.container = container;
    this.selectionManager = selectionManager;
    this.currentScaleId = currentScaleId;

    this.boundKeyHandler = this.onKeyDown.bind(this);
  }

  attach(entries: SabidurianEntry[]): void {
    this.entries = entries;

    // Pre-sort entry indices by start year for left/right navigation
    this.sortedByStart = entries.map((_, i) => i)
      .sort((a, b) => entries[a].startYear - entries[b].startYear);

    // Make the container focusable and listen for keyboard events
    this.container.setAttribute('tabindex', '0');
    this.container.style.outline = 'none';
    this.container.addEventListener('keydown', this.boundKeyHandler);

    // Focus the container on any interaction so keyboard shortcuts work.
    // Use mousedown (fires before click, before stopPropagation in bar handlers).
    // Also use capture phase so we get the event even if a child stops propagation.
    // IMPORTANT: Skip focus-steal when clicking form elements (select, input, etc.)
    // or their focus will be yanked away, closing native dropdowns.
    this.container.addEventListener('mousedown', (e) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'OPTION') return;
      // Defer focus slightly so it doesn't interfere with drag initiation
      requestAnimationFrame(() => this.container.focus());
    }, true);
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Don't capture if focus is on an input/select/textarea
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        this.moveSelection(1);
        break;

      case 'ArrowLeft':
        e.preventDefault();
        this.moveSelection(-1);
        break;

      case 'ArrowDown':
        e.preventDefault();
        this.moveSelectionVertical(1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.moveSelectionVertical(-1);
        break;

      case 'Enter':
        e.preventDefault();
        this.openSelected();
        break;

      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        this.deleteSelected();
        break;

      case 't':
      case 'T':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this.onScrollToToday?.();
        }
        break;

      case '+':
      case '=':
        e.preventDefault();
        this.zoomIn();
        break;

      case '-':
        e.preventDefault();
        this.zoomOut();
        break;

      case '1': case '2': case '3': case '4':
      case '5': case '6': case '7':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this.jumpToScale(parseInt(e.key) - 1);
        }
        break;

      case 'Tab':
        e.preventDefault();
        this.moveSelection(e.shiftKey ? -1 : 1);
        break;

      case 'Escape':
        e.preventDefault();
        this.selectionManager.clear();
        break;

      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.selectionManager.selectAll();
        }
        break;

      case 'm':
      case 'M':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this.onMeasureToggle?.();
        }
        break;

      default:
        break;
    }
  }

  /** Move selection left/right through entries sorted by start date. */
  private moveSelection(delta: number): void {
    if (this.sortedByStart.length === 0) return;

    const currentIdx = this.selectionManager.getSelectedIndex();
    if (currentIdx < 0) {
      // Nothing selected — select first
      this.selectionManager.select(this.sortedByStart[0]);
      return;
    }

    // Find current position in sorted order
    const sortedPos = this.sortedByStart.indexOf(currentIdx);
    const newSortedPos = Math.max(0, Math.min(this.sortedByStart.length - 1, sortedPos + delta));
    this.selectionManager.select(this.sortedByStart[newSortedPos]);
  }

  /** Move selection up/down between rows. */
  private moveSelectionVertical(delta: number): void {
    if (this.entries.length === 0) return;

    const currentIdx = this.selectionManager.getSelectedIndex();
    if (currentIdx < 0) {
      this.selectionManager.select(0);
      return;
    }

    const currentRow = this.entries[currentIdx].row;
    const currentX = this.entries[currentIdx].x;
    const targetRow = currentRow + delta;

    // Find entry in target row closest to current X position
    let bestIdx = currentIdx;
    let bestDist = Infinity;
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].row === targetRow) {
        const dist = Math.abs(this.entries[i].x - currentX);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
    }

    if (bestIdx !== currentIdx) {
      this.selectionManager.select(bestIdx);
    }
  }

  /** Open the currently selected entry. */
  private openSelected(): void {
    const entry = this.selectionManager.getSelectedEntry();
    if (!entry) return;
    this.app.workspace.getLeaf(false).openFile(entry.file);
  }

  /** Delete the selected entry (with confirmation). */
  private deleteSelected(): void {
    const entry = this.selectionManager.getSelectedEntry();
    if (!entry) return;
    this.onDeleteEntry?.(entry);
  }

  /** Zoom in to a finer scale. */
  private zoomIn(): void {
    const currentScaleIdx = SCALES.findIndex(s => s.id === this.currentScaleId);
    if (currentScaleIdx > 0) {
      this.onChangeScale?.(SCALES[currentScaleIdx - 1].id);
    }
  }

  /** Zoom out to a coarser scale. */
  private zoomOut(): void {
    const currentScaleIdx = SCALES.findIndex(s => s.id === this.currentScaleId);
    if (currentScaleIdx < SCALES.length - 1) {
      this.onChangeScale?.(SCALES[currentScaleIdx + 1].id);
    }
  }

  /** Jump to a scale by index (1-7 keys). */
  private jumpToScale(index: number): void {
    if (index >= 0 && index < SCALES.length) {
      this.onChangeScale?.(SCALES[index].id);
    }
  }

  // ── Callback setters ──

  setScrollToTodayCallback(cb: ScrollToTodayCallback): void {
    this.onScrollToToday = cb;
  }

  setChangeScaleCallback(cb: ChangeScaleCallback): void {
    this.onChangeScale = cb;
  }

  setDeleteEntryCallback(cb: DeleteEntryCallback): void {
    this.onDeleteEntry = cb;
  }

  setRefreshCallback(cb: RefreshCallback): void {
    this.onRefresh = cb;
  }

  setMeasureToggleCallback(cb: MeasureToggleCallback): void {
    this.onMeasureToggle = cb;
  }

  destroy(): void {
    this.container.removeEventListener('keydown', this.boundKeyHandler);
    this.onScrollToToday = null;
    this.onChangeScale = null;
    this.onDeleteEntry = null;
    this.onRefresh = null;
    this.onMeasureToggle = null;
  }
}
