import { TimeScale, ColumnBoundary, registerScale } from '../TimeScale';

export const MonthScale: TimeScale = {
  id: 'month',
  label: 'Month',
  unitDurationYears: 1 / 12,
  supportsSubYear: true,
  supportsBCE: false,

  getColumnBoundaries(start: number, end: number): ColumnBoundary[] {
    const cols: ColumnBoundary[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let year = Math.floor(start);
    let month = Math.max(0, Math.floor((start - year) * 12));

    while (cols.length < 1000) {
      const colStart = year + month / 12;
      const nextMonth = month + 1;
      const nextYear = nextMonth >= 12 ? year + 1 : year;
      const nm = nextMonth % 12;
      const colEnd = nextYear + nm / 12;

      if (colStart > end) break;

      cols.push({
        start: colStart,
        end: colEnd,
        label: months[month],
        tierLabel: `${year}`,
        isTierStart: month === 0,
      });

      year = nextYear;
      month = nm;
    }
    return cols;
  },

  snapToUnit(year: number): number {
    const y = Math.floor(year);
    const m = Math.round((year - y) * 12);
    return y + m / 12;
  },
};

registerScale(MonthScale);
