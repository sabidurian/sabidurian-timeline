/**
 * SabidurianEntry — Wraps a BasesEntry with computed timeline layout data.
 */

import type { TFile } from 'obsidian';
import type { SabidurianDate } from '../utils/dateUtils';

export interface SabidurianEntry {
  /** Reference to the underlying Bases entry's file. */
  file: TFile;
  /** Display name for the bar. */
  label: string;
  /** Parsed start date. */
  start: SabidurianDate;
  /** Parsed end date, or null for point events. */
  end: SabidurianDate | null;
  /** Start as fractional year (for axis positioning). */
  startYear: number;
  /** End as fractional year (for axis positioning). Equals startYear for point events. */
  endYear: number;
  /** Whether this is a point event (no end date or same-day). */
  isPoint: boolean;
  /** CSS color for this entry's bar. */
  color: string;
  /** The raw color property value (e.g., "Engineering"). */
  colorValue: string;
  /** Computed row index after layout stacking. */
  row: number;
  /** Computed pixel x position. */
  x: number;
  /** Computed pixel width. */
  width: number;
  /** Dependencies: file paths this entry is blocked by. */
  dependencies: string[];
  /** Additional properties for tooltip display. */
  properties: Record<string, string>;
  /** Group key this entry belongs to (set when grouped). */
  groupKey?: string;
  /** Whether this entry is ongoing (has start but no end — extends to today). */
  isOngoing: boolean;
  /** Whether this entry is locked (cannot be dragged/resized). */
  locked: boolean;
  /** Whether this entry has only fuzzy dates (no primary start/end). */
  fuzzyOnly?: boolean;
  /** Earliest possible start date (uncertainty window). */
  earliestStart?: SabidurianDate;
  /** Latest possible end date (uncertainty window). */
  latestEnd?: SabidurianDate;
  /** Earliest start as fractional year. */
  earliestStartYear?: number;
  /** Latest end as fractional year. */
  latestEndYear?: number;
}

/**
 * SabidurianGroup — A group of entries (from Bases groupBy).
 */
export interface SabidurianGroup {
  /** Group display name (the value of the groupBy property). */
  name: string;
  /** Entries in this group. */
  entries: SabidurianEntry[];
  /** Whether the group is collapsed. */
  collapsed: boolean;
  /** Y offset of the group header in the SVG canvas. */
  headerY: number;
  /** Total height of this group (header + rows). */
  totalHeight: number;
}
