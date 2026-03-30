import { TimeScale, ColumnBoundary, registerScale } from '../TimeScale';
import { formatYear } from '../../utils/dateUtils';

export const DecadeScale: TimeScale = {
  id: 'decade',
  label: 'Decade',
  unitDurationYears: 10,
  supportsSubYear: false,
  supportsBCE: true,

  getColumnBoundaries(start: number, end: number): ColumnBoundary[] {
    const cols: ColumnBoundary[] = [];
    let decade = Math.floor(start / 10) * 10;

    while (decade <= Math.ceil(end) && cols.length < 500) {
      const label = `${formatYear(decade)}s`;
      const centuryStart = Math.floor(decade / 100) * 100;
      const tierLabel = decade <= 0
        ? `${Math.ceil((1 - centuryStart) / 100)} cent. BCE`
        : `${Math.floor(centuryStart / 100) + 1}th cent.`;

      cols.push({
        start: decade,
        end: decade + 10,
        label,
        tierLabel,
        isTierStart: decade % 100 === 0,
      });
      decade += 10;
    }
    return cols;
  },

  snapToUnit(year: number): number {
    return Math.round(year / 10) * 10;
  },
};

export const CenturyScale: TimeScale = {
  id: 'century',
  label: 'Century',
  unitDurationYears: 100,
  supportsSubYear: false,
  supportsBCE: true,

  getColumnBoundaries(start: number, end: number): ColumnBoundary[] {
    const cols: ColumnBoundary[] = [];
    let century = Math.floor(start / 100) * 100;

    while (century <= Math.ceil(end) && cols.length < 200) {
      let label: string;
      if (century <= 0) {
        label = `${Math.ceil((1 - century) / 100)} cent. BCE`;
      } else {
        const num = Math.floor(century / 100) + 1;
        label = `${num}th cent.`;
      }

      const milStart = Math.floor(century / 1000) * 1000;
      const tierLabel = century <= 0
        ? `${Math.ceil((1 - milStart) / 1000)} mil. BCE`
        : `${Math.floor(milStart / 1000) + 1} millennium`;

      cols.push({
        start: century,
        end: century + 100,
        label,
        tierLabel,
        isTierStart: century % 1000 === 0,
      });
      century += 100;
    }
    return cols;
  },

  snapToUnit(year: number): number {
    return Math.round(year / 100) * 100;
  },
};

export const MillenniumScale: TimeScale = {
  id: 'millennium',
  label: 'Millennium',
  unitDurationYears: 1000,
  supportsSubYear: false,
  supportsBCE: true,

  getColumnBoundaries(start: number, end: number): ColumnBoundary[] {
    const cols: ColumnBoundary[] = [];
    let mil = Math.floor(start / 1000) * 1000;

    while (mil <= Math.ceil(end) && cols.length < 100) {
      let label: string;
      if (mil <= 0) {
        label = `${Math.ceil((1 - mil) / 1000)} mil. BCE`;
      } else {
        const num = Math.floor(mil / 1000) + 1;
        label = `${num} millennium`;
      }

      cols.push({
        start: mil,
        end: mil + 1000,
        label,
      });
      mil += 1000;
    }
    return cols;
  },

  snapToUnit(year: number): number {
    return Math.round(year / 1000) * 1000;
  },
};

registerScale(DecadeScale);
registerScale(CenturyScale);
registerScale(MillenniumScale);
