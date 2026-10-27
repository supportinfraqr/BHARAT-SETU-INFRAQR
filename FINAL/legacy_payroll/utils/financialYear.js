const PAYROLL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthIndex(monthName) {
  return PAYROLL_MONTHS.indexOf(monthName);
}

function getFinancialYearStartFromPayroll(monthName, year) {
  const monthIndex = getMonthIndex(monthName);
  const normalizedYear = Number(year);

  if (monthIndex === -1 || Number.isNaN(normalizedYear)) {
    return null;
  }

  return monthIndex >= 3 ? normalizedYear : normalizedYear - 1;
}

/** Accepts 2025-26, FY2025-26, 2025-2026, FY2025-2026 */
function parseFinancialYearInput(input) {
  if (input == null || input === '') return null;

  const raw = String(input).trim().replace(/^FY/i, '');
  const match = raw.match(/^(\d{4})-(\d{2}|\d{4})$/);
  if (!match) return null;

  const startYear = parseInt(match[1], 10);
  const endToken = match[2];
  const endYear =
    endToken.length === 2
      ? parseInt(`${String(startYear).slice(0, 2)}${endToken}`, 10)
      : parseInt(endToken, 10);

  if (Number.isNaN(startYear) || Number.isNaN(endYear) || endYear !== startYear + 1) {
    return null;
  }

  const endShort = String(endYear).slice(-2);

  return {
    startYear,
    endYear,
    keyShort: `${startYear}-${endShort}`,
    keyLong: `${startYear}-${endYear}`,
    label: `FY ${startYear}-${endYear}`,
  };
}

/** Canonical storage key: 2026-2027 */
function normalizeFinancialYearStorage(input) {
  const parsed = parseFinancialYearInput(input);
  return parsed ? parsed.keyLong : null;
}

function getFinancialYearAliasesFromStartYear(fyStart) {
  const fyEnd = fyStart + 1;
  const endShort = String(fyEnd).slice(-2);

  return [...new Set([
    `${fyStart}-${fyEnd}`,
    `FY${fyStart}-${fyEnd}`,
    `${fyStart}-${endShort}`,
    `FY${fyStart}-${endShort}`,
  ])];
}

function getFinancialYearAliasesFromPayroll(monthName, year) {
  const fyStart = getFinancialYearStartFromPayroll(monthName, year);
  if (fyStart === null) return [];
  return getFinancialYearAliasesFromStartYear(fyStart);
}

function getFinancialYearAliasesFromInput(input) {
  const parsed = parseFinancialYearInput(input);
  if (!parsed) {
    const trimmed = String(input || '').trim();
    return trimmed ? [trimmed] : [];
  }
  return getFinancialYearAliasesFromStartYear(parsed.startYear);
}

function resolveFinancialYearInput(input) {
  const canonical = normalizeFinancialYearStorage(input);
  if (!canonical) {
    return {
      ok: false,
      error: 'Invalid financial year. Use formats like 2025-26 or 2025-2026',
    };
  }

  const parsed = parseFinancialYearInput(input);
  return {
    ok: true,
    canonical,
    aliases: getFinancialYearAliasesFromStartYear(parsed.startYear),
    keyShort: parsed.keyShort,
    label: parsed.label,
    startYear: parsed.startYear,
    endYear: parsed.endYear,
  };
}

/** Apr–Mar payroll periods for Indian financial year */
function buildFinancialYearPayrollQuery(fy) {
  const firstHalfMonths = PAYROLL_MONTHS.slice(3);
  const secondHalfMonths = PAYROLL_MONTHS.slice(0, 3);
  return {
    $or: [
      { year: fy.startYear, month: { $in: firstHalfMonths } },
      { year: fy.endYear, month: { $in: secondHalfMonths } },
    ],
  };
}

function getPayrollPeriodSortKey(monthName, year, fyStart, fyEnd) {
  const monthIndex = getMonthIndex(monthName);
  const normalizedYear = Number(year);

  if (monthIndex === -1 || Number.isNaN(normalizedYear)) {
    return 999;
  }

  if (normalizedYear === fyStart && monthIndex >= 3) {
    return monthIndex - 3;
  }

  if (normalizedYear === fyEnd && monthIndex < 3) {
    return monthIndex + 9;
  }

  return 999;
}

const FULL_MONTH_NAMES = {
  january: 'Jan',
  february: 'Feb',
  march: 'Mar',
  april: 'Apr',
  may: 'May',
  june: 'Jun',
  july: 'Jul',
  august: 'Aug',
  september: 'Sep',
  october: 'Oct',
  november: 'Nov',
  december: 'Dec',
};

function normalizePayrollMonthName(monthName) {
  const raw = String(monthName || '').trim();
  if (!raw) return null;

  const shortIdx = PAYROLL_MONTHS.findIndex((month) => month.toLowerCase() === raw.toLowerCase());
  if (shortIdx !== -1) return PAYROLL_MONTHS[shortIdx];

  const mapped = FULL_MONTH_NAMES[raw.toLowerCase()];
  if (mapped) return mapped;

  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return PAYROLL_MONTHS[numeric - 1];
  }

  return null;
}

/** Calendar date for a stored date or YYYY-MM-DD value, without UTC day-shift. */
function toCalendarDate(value) {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const isUtcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (isUtcMidnight) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getFinancialYearBounds(startYear) {
  const year = Number(startYear);
  if (!Number.isFinite(year)) return null;
  return {
    start: new Date(year, 3, 1),
    end: new Date(year + 1, 2, 31),
  };
}

/** April = 0 … March = 11. */
function getFinancialYearMonthIndexFromDate(date) {
  const month = date.getMonth();
  return month >= 3 ? month - 3 : month + 9;
}

function inclusiveCalendarDays(start, end) {
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utcEnd - utcStart) / 86400000) + 1;
}

/** Share of a calendar month that falls inside [rangeStart, rangeEnd], both inclusive. */
function getMonthDayFactor(year, monthIndex, rangeStart, rangeEnd) {
  const start = toCalendarDate(rangeStart);
  const end = toCalendarDate(rangeEnd);
  if (!start || !end || start > end) return 0;

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const overlapStart = start > monthStart ? start : monthStart;
  const overlapEnd = end < monthEnd ? end : monthEnd;
  if (overlapStart > overlapEnd) return 0;

  return inclusiveCalendarDays(overlapStart, overlapEnd) / monthEnd.getDate();
}

/** Sum of month-day factors from rangeStart through rangeEnd, both inclusive. */
function sumMonthDayFactors(rangeStart, rangeEnd) {
  const start = toCalendarDate(rangeStart);
  const end = toCalendarDate(rangeEnd);
  if (!start || !end || start > end) return 0;

  let factor = 0;
  let year = start.getFullYear();
  let month = start.getMonth();
  while (year < end.getFullYear() || (year === end.getFullYear() && month <= end.getMonth())) {
    factor += getMonthDayFactor(year, month, start, end);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return factor;
}

/**
 * TDS window inside one financial year.
 * Starts on the payroll implementation date (inclusive) when that date is after 1 April.
 * Ends on 31 March (inclusive). Days before the implementation date are excluded.
 * A later financial year starts again on 1 April.
 * equivalentMonths prorates the implementation month by calendar days.
 */
function getTdsCalculationPeriod(fy, implementationDate = null) {
  if (!fy?.startYear) {
    return {
      periodStart: null,
      periodEnd: null,
      applicableMonths: 12,
      equivalentMonths: 12,
      startMonthIndex: 0,
    };
  }

  const bounds = getFinancialYearBounds(fy.startYear);
  const implementation = toCalendarDate(implementationDate);

  if (implementation && implementation > bounds.end) {
    return {
      periodStart: null,
      periodEnd: bounds.end,
      applicableMonths: 0,
      equivalentMonths: 0,
      startMonthIndex: 12,
    };
  }

  const periodStart =
    implementation && implementation > bounds.start ? implementation : bounds.start;
  const startMonthIndex = getFinancialYearMonthIndexFromDate(periodStart);
  const equivalentMonths = sumMonthDayFactors(periodStart, bounds.end);

  return {
    periodStart,
    periodEnd: bounds.end,
    applicableMonths: equivalentMonths,
    equivalentMonths,
    startMonthIndex,
  };
}

/**
 * Remaining salary-month factor used to spread TDS, including the current month.
 * The implementation date is included. Earlier days in that month are not.
 */
function getRemainingPayrollMonthsInTdsPeriod(fy, implementationDate = null, asOfDate = new Date()) {
  const period = getTdsCalculationPeriod(fy, implementationDate);
  if (!fy?.startYear) return 12;
  if (!period.periodStart || period.equivalentMonths <= 0) return 0;

  const asOf = toCalendarDate(asOfDate) || toCalendarDate(new Date());
  if (asOf < period.periodStart) return period.equivalentMonths;
  if (asOf > period.periodEnd) return 1;

  const monthStart = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  const remainingStart = monthStart > period.periodStart ? monthStart : period.periodStart;
  return sumMonthDayFactors(remainingStart, period.periodEnd);
}

/**
 * Fraction of this payroll month's TDS that falls on or after the implementation date.
 * 0 when the month ends before that date. 1 when the whole month is inside the window.
 */
function getPayrollMonthTdsFactor(monthName, year, implementationDate = null) {
  const implementation = toCalendarDate(implementationDate);
  if (!implementation) return 1;

  const normalizedMonth = normalizePayrollMonthName(monthName);
  const monthIndex = getMonthIndex(normalizedMonth);
  const normalizedYear = Number(year);
  if (monthIndex === -1 || Number.isNaN(normalizedYear)) return 1;

  const fyStart = getFinancialYearStartFromPayroll(normalizedMonth, normalizedYear);
  if (fyStart === null) return 1;

  const period = getTdsCalculationPeriod(
    { startYear: fyStart, endYear: fyStart + 1 },
    implementation
  );
  if (!period.periodStart) return 0;

  return getMonthDayFactor(normalizedYear, monthIndex, period.periodStart, period.periodEnd);
}

/**
 * Month rows for salary counted from the implementation date through 31 March.
 * Each amount is monthly gross × (counted days / days in that month).
 * The last row absorbs rounding so the rows add up to salaryIncomeTarget.
 */
function buildTdsIncomeMonths(periodStart, periodEnd, monthlyGross, salaryIncomeTarget = null) {
  const start = toCalendarDate(periodStart);
  const end = toCalendarDate(periodEnd);
  const gross = Number(monthlyGross) || 0;
  if (!start || !end || start > end) return [];

  const months = [];
  let year = start.getFullYear();
  let month = start.getMonth();
  while (year < end.getFullYear() || (year === end.getFullYear() && month <= end.getMonth())) {
    const factor = getMonthDayFactor(year, month, start, end);
    if (factor > 0) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const applicableDays = Math.round(factor * daysInMonth);
      const isOpening = year === start.getFullYear() && month === start.getMonth();
      months.push({
        label: `${PAYROLL_MONTHS[month]} ${year}`,
        daysInMonth,
        applicableDays,
        excludedBefore: isOpening ? start.getDate() - 1 : 0,
        partial: factor < 0.999999,
        amount: Math.round(gross * factor),
      });
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  const target = Number.isFinite(Number(salaryIncomeTarget))
    ? Math.round(Number(salaryIncomeTarget))
    : Math.round(gross * sumMonthDayFactors(start, end));
  const roundedSum = months.reduce((sum, row) => sum + row.amount, 0);
  if (months.length && roundedSum !== target) {
    months[months.length - 1].amount += target - roundedSum;
  }
  return months;
}

/** First month of the TDS window, including how many days are excluded before the start date. */
function getTdsOpeningMonth(period) {
  if (!period?.periodStart || !period?.periodEnd) return null;
  const start = toCalendarDate(period.periodStart);
  const periodEnd = toCalendarDate(period.periodEnd);
  if (!start || !periodEnd || start > periodEnd) return null;

  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const countedToDate = periodEnd < monthEnd ? periodEnd : monthEnd;
  const countedFrom = start.getDate();
  const countedTo = countedToDate.getDate();
  const daysInMonth = monthEnd.getDate();

  return {
    label: `${PAYROLL_MONTHS[start.getMonth()]} ${start.getFullYear()}`,
    daysInMonth,
    applicableDays: countedTo - countedFrom + 1,
    excludedBefore: countedFrom - 1,
    countedFrom,
    countedTo,
  };
}

/** True when the payroll month finishes before payroll was implemented. */
function isPayrollMonthBeforeImplementation(monthName, year, implementationDate = null) {
  const implementation = toCalendarDate(implementationDate);
  if (!implementation) return false;

  const normalizedMonth = normalizePayrollMonthName(monthName);
  const monthIndex = getMonthIndex(normalizedMonth);
  const normalizedYear = Number(year);
  if (monthIndex === -1 || Number.isNaN(normalizedYear)) return false;

  const payrollMonthEnd = new Date(normalizedYear, monthIndex + 1, 0);
  return payrollMonthEnd < implementation;
}

/** Apr–Mar accounting-year periods from FY start through the given payroll month. */
function getAccountingYearPeriodsUpTo(monthName, year) {
  const fyStart = getFinancialYearStartFromPayroll(monthName, year);
  if (fyStart === null) return [];

  const fyEnd = fyStart + 1;
  const allPeriods = [
    ...PAYROLL_MONTHS.slice(3).map((month) => ({ month, year: fyStart })),
    ...PAYROLL_MONTHS.slice(0, 3).map((month) => ({ month, year: fyEnd })),
  ];

  const currentSortKey = getPayrollPeriodSortKey(monthName, year, fyStart, fyEnd);
  if (currentSortKey === 999) return [];

  return allPeriods.filter(
    (period) =>
      getPayrollPeriodSortKey(period.month, period.year, fyStart, fyEnd) <= currentSortKey
  );
}

module.exports = {
  PAYROLL_MONTHS,
  getMonthIndex,
  getFinancialYearStartFromPayroll,
  parseFinancialYearInput,
  normalizeFinancialYearStorage,
  getFinancialYearAliasesFromStartYear,
  getFinancialYearAliasesFromPayroll,
  getFinancialYearAliasesFromInput,
  resolveFinancialYearInput,
  buildFinancialYearPayrollQuery,
  getPayrollPeriodSortKey,
  getAccountingYearPeriodsUpTo,
  toCalendarDate,
  getFinancialYearBounds,
  getTdsCalculationPeriod,
  getRemainingPayrollMonthsInTdsPeriod,
  isPayrollMonthBeforeImplementation,
  getMonthDayFactor,
  sumMonthDayFactors,
  getPayrollMonthTdsFactor,
  getTdsOpeningMonth,
  buildTdsIncomeMonths,
};
