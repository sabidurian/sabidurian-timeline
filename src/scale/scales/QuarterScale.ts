import { TimeScale, ColumnBoundary, registerScale } from '../TimeScale';

export const QuarterScale: TimeScale = {
  id: 'quarter',
  label: 'Quarter',
  unitDurationYears: 0.25,
  supportsSubYear: true,
  supportsBCE: false,

  getColumnBoundaries(start: number, end: number): ColumnBoundary[] {
    const cols: ColumnBoundary[] = [];
    let year = Math.floor(start);
    let q = Math.max(0, Math.floor((start - year) * 4));

    while (cols.length < 500) {
      const colStart = year + q * 0.25;
      const colEnd = year + (q + 1) * 0.25;

      if (colStart > end) break;

      cols.push({
        start: colStart,
        end: colEnd,
        label: `Q${q + 1}`,
        tierLabel: `${year}`,
        isTierStart: q === 0,
      });

      q++;
      if (q >= 4) {
        q = 0;
        year++;
      }
    }
    return cols;
  },

  snapToUnit(year: number): number {
    const y = Math.floor(year);
    const q = Math.round((year - y) * 4);
    return y + q * 0.25;
  },
};

registerScale(QuarterScale);
