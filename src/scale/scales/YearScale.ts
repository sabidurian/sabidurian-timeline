import { TimeScale, ColumnBoundary, registerScale } from '../TimeScale';
import { formatYear } from '../../utils/dateUtils';

export const YearScale: TimeScale = {
  id: 'year',
  label: 'Year',
  unitDurationYears: 1,
  supportsSubYear: false,
  supportsBCE: true,

  getColumnBoundaries(start: number, end: number): ColumnBoundary[] {
    const cols: ColumnBoundary[] = [];
    let year = Math.floor(start);

    while (year <= Math.ceil(end) && cols.length < 500) {
      cols.push({
        start: year,
        end: year + 1,
        label: formatYear(year),
        tierLabel: `${Math.floor(year / 10) * 10}s`,
        isTierStart: year % 10 === 0,
      });
      year++;
    }
    return cols;
  },

  snapToUnit(year: number): number {
    return Math.round(year);
  },
};

registerScale(YearScale);
