import { TimeScale, ColumnBoundary, registerScale } from '../TimeScale';

const WEEK_IN_YEARS = 7 / 365;

export const WeekScale: TimeScale = {
  id: 'week',
  label: 'Week',
  unitDurationYears: WEEK_IN_YEARS,
  supportsSubYear: true,
  supportsBCE: false,

  getColumnBoundaries(start: number, end: number): ColumnBoundary[] {
    const cols: ColumnBoundary[] = [];
    // Start from the Monday on or before the start date
    const startDate = fractionalYearToDate(start);
    const dow = startDate.getDay();
    const diff = dow === 0 ? -6 : 1 - dow; // Monday = 1
    startDate.setDate(startDate.getDate() + diff);
    startDate.setHours(0, 0, 0, 0);

    const endDate = fractionalYearToDate(end);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let cur = new Date(startDate);
    while (cur <= endDate && cols.length < 1000) {
      const next = new Date(cur);
      next.setDate(next.getDate() + 7);

      const colStart = dateToFracYear(cur);
      const colEnd = dateToFracYear(next);
      const label = `${months[cur.getMonth()]} ${cur.getDate()}`;
      const tierLabel = `${months[cur.getMonth()]} ${cur.getFullYear()}`;
      const isTierStart = cur.getDate() <= 7;

      cols.push({ start: colStart, end: colEnd, label, tierLabel, isTierStart });
      cur = next;
    }
    return cols;
  },

  snapToUnit(year: number): number {
    const d = fractionalYearToDate(year);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return dateToFracYear(d);
  },
};

function fractionalYearToDate(fy: number): Date {
  const year = Math.floor(fy);
  const frac = fy - year;
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  return new Date(start + frac * (end - start));
}

function dateToFracYear(d: Date): number {
  const year = d.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  return year + (d.getTime() - start) / (end - start);
}

registerScale(WeekScale);
