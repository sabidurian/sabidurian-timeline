import { TimeScale, ColumnBoundary, registerScale } from '../TimeScale';

const DAY_IN_YEARS = 1 / 365;

export const DayScale: TimeScale = {
  id: 'day',
  label: 'Day',
  unitDurationYears: DAY_IN_YEARS,
  supportsSubYear: true,
  supportsBCE: false,

  getColumnBoundaries(start: number, end: number): ColumnBoundary[] {
    const cols: ColumnBoundary[] = [];
    const startYear = Math.floor(start);
    const startFrac = start - startYear;
    const startDayOfYear = Math.floor(startFrac * 365);
    const startDate = new Date(startYear, 0, 1 + startDayOfYear);

    const endYear = Math.ceil(end);
    const endDate = new Date(endYear, 0, 1);

    let cur = new Date(startDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    while (cur <= endDate && cols.length < 3000) {
      const next = new Date(cur);
      next.setDate(next.getDate() + 1);

      const colStart = dateToFracYear(cur);
      const colEnd = dateToFracYear(next);

      const dayNum = cur.getDate();
      const label = `${dayNum}`;
      const tierLabel = `${months[cur.getMonth()]} ${cur.getFullYear()}`;
      const isTierStart = dayNum === 1;

      cols.push({ start: colStart, end: colEnd, label, tierLabel, isTierStart });
      cur = next;
    }
    return cols;
  },

  snapToUnit(year: number): number {
    const y = Math.floor(year);
    const frac = year - y;
    const day = Math.round(frac * 365);
    return y + day / 365;
  },
};

function dateToFracYear(d: Date): number {
  const year = d.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  return year + (d.getTime() - start) / (end - start);
}

registerScale(DayScale);
