/**
 * SequenceScale — Ordinal column layout for non-temporal sequence views.
 *
 * Each column represents one integer step (1, 2, 3, …).
 * Does NOT register with the global SCALES registry since it's only
 * used by SequenceView, not the time-based SabidurianView.
 */

import type { TimeScale, ColumnBoundary } from './TimeScale';

/**
 * Create a SequenceScale for the given range of ordinal positions.
 * In "sparse" mode, every integer from min to max gets a column (showing gaps).
 * In "dense" mode, only occupied positions appear (no gaps).
 */
export function createSequenceScale(
  occupiedPositions?: number[],
  dense = false,
): TimeScale {
  // In dense mode, build a mapping from occupied positions to dense indices
  let densePositions: number[] | null = null;
  if (dense && occupiedPositions && occupiedPositions.length > 0) {
    densePositions = [...new Set(occupiedPositions)].sort((a, b) => a - b);
  }

  return {
    id: 'sequence',
    label: 'Sequence',
    unitDurationYears: 1, // Each step = 1 unit in axis space
    supportsSubYear: false,
    supportsBCE: false,

    getColumnBoundaries(start: number, end: number): ColumnBoundary[] {
      const cols: ColumnBoundary[] = [];

      if (densePositions) {
        // Dense: columns at sequential 1-based indices, labeled with original positions.
        // The axis is remapped to [0.5, N+0.5] in SequenceView, so columns
        // sit at [1,2), [2,3), … [N, N+1) — one STEP_WIDTH_PX each.
        for (let i = 0; i < densePositions.length; i++) {
          const denseIdx = i + 1; // 1-based dense index
          if (denseIdx + 1 < start) continue;
          if (denseIdx > end) break;
          cols.push({
            start: denseIdx,
            end: denseIdx + 1,
            label: String(densePositions[i]), // Original order as label
          });
          if (cols.length > 500) break;
        }
      } else {
        // Sparse: every integer from floor(start) to ceil(end)
        let step = Math.max(1, Math.floor(start));
        const maxStep = Math.ceil(end);

        while (step <= maxStep && cols.length < 500) {
          cols.push({
            start: step,
            end: step + 1,
            label: String(step),
          });
          step++;
        }
      }

      return cols;
    },

    snapToUnit(pos: number): number {
      return Math.round(pos);
    },
  };
}
