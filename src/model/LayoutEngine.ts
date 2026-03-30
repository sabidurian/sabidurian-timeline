/**
 * LayoutEngine — Greedy interval scheduling for non-overlapping row assignment.
 * Entries are sorted by start time, then assigned to the lowest row
 * where they don't overlap an existing entry.
 *
 * Phase 6: Supports grouped layout with per-group stacking namespaces.
 */

import type { SabidurianEntry, SabidurianGroup } from './SabidurianEntry';
import { NumericAxis } from '../scale/NumericAxis';

const BAR_HEIGHT = 28;
const ROW_GAP = 4;
const Y_OFFSET = 24;
const POINT_HALF_WIDTH = 30; // Approx pixel space a point marker + label needs
const LABEL_CHAR_WIDTH = 7; // Approx px per character for label text
const LABEL_PADDING = 14; // Extra padding after label text
const MIN_LABEL_WIDTH = 40; // Bar width threshold for inside vs outside label
const GROUP_HEADER_HEIGHT = 32;
const GROUP_GAP = 12; // Gap between groups

export const ROW_HEIGHT = BAR_HEIGHT + ROW_GAP;

export class LayoutEngine {
  /** Maps absolute row index → y pixel position. Used for grouped + ungrouped. */
  private rowYMap: Map<number, number> = new Map();
  private nextAbsoluteRow = 0;

  /**
   * Assign row indices to entries (ungrouped) and compute pixel positions.
   * Mutates entries in place (sets .row, .x, .width).
   * Returns the total height needed.
   */
  layout(entries: SabidurianEntry[], axis: NumericAxis): number {
    if (entries.length === 0) return 0;

    this.rowYMap.clear();
    this.nextAbsoluteRow = 0;

    const totalRows = this.assignRows(entries, axis, 0);

    // Build rowYMap for ungrouped layout (simple sequential)
    for (let r = 0; r < totalRows; r++) {
      this.rowYMap.set(r, Y_OFFSET + r * ROW_HEIGHT);
    }

    return Y_OFFSET + totalRows * ROW_HEIGHT + Y_OFFSET;
  }

  /**
   * Assign rows to entries within groups. Each group gets its own stacking
   * namespace so rows don't overlap across groups.
   * Mutates entries in place and populates group metadata.
   * Returns the total canvas height.
   */
  layoutGrouped(groups: SabidurianGroup[], axis: NumericAxis): number {
    this.rowYMap.clear();
    this.nextAbsoluteRow = 0;

    let currentY = Y_OFFSET;

    for (const group of groups) {
      // Group header
      group.headerY = currentY;
      currentY += GROUP_HEADER_HEIGHT;

      if (group.collapsed) {
        group.totalHeight = GROUP_HEADER_HEIGHT;
        // Don't assign rows for collapsed entries, but still compute x/width
        for (const entry of group.entries) {
          entry.x = axis.yearToPixel(entry.startYear);
          if (entry.isPoint) {
            entry.width = 0;
          } else {
            entry.width = Math.max(axis.yearToPixel(entry.endYear) - entry.x, 4);
          }
          entry.row = -1; // Not visible
        }
        currentY += GROUP_GAP;
        continue;
      }

      // Assign rows within this group's namespace
      const rowsBefore = this.nextAbsoluteRow;
      const groupRows = this.assignRows(group.entries, axis, this.nextAbsoluteRow);

      // Build rowYMap for this group's rows
      for (let r = 0; r < groupRows; r++) {
        const absRow = rowsBefore + r;
        this.rowYMap.set(absRow, currentY + r * ROW_HEIGHT);
      }

      this.nextAbsoluteRow = rowsBefore + groupRows;

      const groupContentHeight = Math.max(groupRows * ROW_HEIGHT, ROW_HEIGHT);
      group.totalHeight = GROUP_HEADER_HEIGHT + groupContentHeight;
      currentY += groupContentHeight + GROUP_GAP;
    }

    return currentY + Y_OFFSET;
  }

  /**
   * Core row assignment algorithm. Assigns absolute row indices starting
   * from `baseRow`. Returns the number of rows used.
   */
  private assignRows(entries: SabidurianEntry[], axis: NumericAxis, baseRow: number): number {
    // Sort by start year, then by duration (longer first for better packing)
    const sorted = [...entries].sort((a, b) => {
      if (a.startYear !== b.startYear) return a.startYear - b.startYear;
      return (b.endYear - b.startYear) - (a.endYear - a.startYear);
    });

    // Track the rightmost pixel edge occupied in each row (relative to group)
    const rowEnds: number[] = [];

    for (const entry of sorted) {
      // Compute pixel positions
      entry.x = axis.yearToPixel(entry.startYear);
      if (entry.isPoint) {
        entry.width = 0;
      } else {
        entry.width = Math.max(axis.yearToPixel(entry.endYear) - entry.x, 4);
      }

      // Determine effective edges for overlap detection
      // Include fuzzy/uncertainty extensions if present
      const effectiveLeft = entry.earliestStartYear != null
        ? axis.yearToPixel(entry.earliestStartYear)
        : entry.x;

      // Estimate label pixel width for outside-bar labels
      const labelPx = entry.label.length * LABEL_CHAR_WIDTH + LABEL_PADDING;
      let barRight: number;
      if (entry.isPoint) {
        barRight = entry.x + POINT_HALF_WIDTH + labelPx;
      } else {
        const fuzzyRight = entry.latestEndYear != null
          ? axis.yearToPixel(entry.latestEndYear)
          : entry.x + entry.width;
        // If bar is narrow, label renders outside to the right
        const labelOverflow = entry.width < MIN_LABEL_WIDTH
          ? entry.x + entry.width + 6 + labelPx
          : 0;
        barRight = Math.max(fuzzyRight, labelOverflow) + 4;
      }
      const effectiveRight = barRight;

      // Find lowest available row
      let assignedRow = -1;
      for (let r = 0; r < rowEnds.length; r++) {
        if (effectiveLeft >= rowEnds[r]) {
          assignedRow = r;
          break;
        }
      }

      if (assignedRow === -1) {
        assignedRow = rowEnds.length;
        rowEnds.push(0);
      }

      entry.row = baseRow + assignedRow;
      rowEnds[assignedRow] = effectiveRight;
    }

    return rowEnds.length;
  }

  /** Get the y pixel position for a given row index. */
  getRowY(row: number): number {
    return this.rowYMap.get(row) ?? (Y_OFFSET + row * ROW_HEIGHT);
  }
}

export { BAR_HEIGHT, Y_OFFSET, GROUP_HEADER_HEIGHT };
