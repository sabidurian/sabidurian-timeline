import { TimeScale, ColumnBoundary, registerScale } from '../TimeScale';

const HOUR_IN_YEARS = 1 / 8760;

export const HourScale: TimeScale = {
  id: 'hour',
  label: 'Hour',
  unitDurationYears: HOUR_IN_YEARS,
  supportsSubYear: true,
  supportsBCE: false,

  getColumnBoundaries(start: number, end: number): ColumnBoundary[] {
    const cols: ColumnBoundary[] = [];
    const startDate = fractionalYearToDate(start);
    startDate.setMinutes(0, 0, 0);
    const endDate = fractionalYearToDate(end);

    let cur = new Date(startDate);
    while (cur <= endDate && cols.length < 2000) {
      const next = new Date(cur);
      next.setHours(next.getHours() + 1);

      const colStart = dateToFractionalYear(cur);
      const colEnd = dateToFractionalYear(next);

      const h = cur.getHours();
      const label = `${h}:00`;
      const dayStr = `${cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      cols.push({
        start: colStart,
        end: colEnd,
        label,
        tierLabel: dayStr,
        isTierStart: h === 0,
      });

      cur = next;
    }
    return cols;
  },

  snapToUnit(year: number): number {
    const d = fractionalYearToDate(year);
    d.setMinutes(0, 0, 0);
    return dateToFractionalYear(d);
  },
};

function fractionalYearToDate(fy: number): Date {
  const year = Math.floor(fy);
  const frac = fy - year;
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  return new Date(start + frac * (end - start));
}

function dateToFractionalYear(d: Date): number {
  const year = d.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  return year + (d.getTime() - start) / (end - start);
}

registerScale(HourScale);
