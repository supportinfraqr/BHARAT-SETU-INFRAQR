/**
 * Industry-standard caps and declaration helpers for Indian payroll TDS (FY Apr–Mar).
 */

const { toCalendarDate, sumMonthDayFactors } = require('../financialYear');

const SECTION_80C_LIMIT = 150000;
const SECTION_80D_COMBINED_LIMIT = 100000;
const SECTION_24_SELF_OCCUPIED_LIMIT = 200000;

/**
 * Statutory ceilings used when Other configuration has no saved number.
 * 80CCD(2): 14% is the new-regime / Central Government rate. Old regime for other
 * employers is 10% of salary (basic + DA).
 */
const DEFAULT_EXEMPTION_LIMITS = {
  section80D: SECTION_80D_COMBINED_LIMIT,
  section80DSelf: 25000,
  section80DSenior: 50000,
  section80DPreventive: 5000,
  section80E: null,
  section80G: null,
  section80CCD1Percent: 10,
  section80CCD1B: 50000,
  section80CCD2Percent: 14,
  section80CCD2PercentOld: 10,
  section80DD: 75000,
  section80DDSevere: 125000,
  section80DDB: 40000,
  section80DDBSenior: 100000,
  section80U: 75000,
  section80USevere: 125000,
  section80EE: 50000,
  section80EEA: 150000,
  section80GGMonthly: 5000,
  section80GGA: null,
  section80GGC: null,
  section80TTA: 10000,
  section80TTB: 50000,
  section24: SECTION_24_SELF_OCCUPIED_LIMIT,
  otherDeductions: null,
  childrenEducationPerMonth: 100,
  childrenEducationMaxChildren: 2,
  childrenEducationAnnualCap: 2400,
  hostelPerMonth: 300,
  hostelMaxChildren: 2,
  hostelAnnualCap: 7200,
  lta: null,
  disabledTransportPerMonth: 3200,
  gratuity: 2000000,
  leaveEncashment: 2500000,
  retrenchment: 500000,
  vrs: 500000,
  officialDuty: null,
  lifeInsurance: null,
};

function readMoneyLimit(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : fallback;
}

function getDefaultExemptionLimits() {
  return { ...DEFAULT_EXEMPTION_LIMITS };
}

function getExemptionLimits(tdsConfig = {}) {
  const saved = tdsConfig?.exemptionLimits || {};
  const defaults = getDefaultExemptionLimits();
  const resolved = {};
  Object.keys(defaults).forEach((key) => {
    resolved[key] = readMoneyLimit(saved[key], defaults[key]);
  });
  return resolved;
}

/** limit null or undefined = no cap. */
function capToLimit(amount, limit) {
  const value = Math.max(0, Number(amount) || 0);
  if (limit === null || limit === undefined || limit === '') return value;
  const cap = Number(limit);
  if (!Number.isFinite(cap)) return value;
  return Math.min(value, Math.max(0, cap));
}

function parseRentDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const ddmmyyyy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(raw);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function monthsInclusive(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return 0;
  return (
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    1
  );
}

function getFinancialYearBounds(fyStartYear) {
  const startYear = Number(fyStartYear);
  if (!Number.isFinite(startYear)) return null;
  return {
    start: new Date(startYear, 3, 1),
    end: new Date(startYear + 1, 2, 31, 23, 59, 59, 999),
  };
}

/**
 * Pro-rate rent entries by rental period within the financial year.
 * periodStart, when set, is the first day that counts (payroll implementation date).
 */
function computeAnnualRentFromEntries(rentEntries = [], fyStartYear = null, periodStart = null) {
  if (!Array.isArray(rentEntries) || rentEntries.length === 0) {
    return { annualRent: 0, isMetroCity: false, dominantEntry: null };
  }

  const bounds = getFinancialYearBounds(fyStartYear);
  const implementationStart = toCalendarDate(periodStart);
  if (
    bounds &&
    implementationStart &&
    implementationStart > toCalendarDate(bounds.start) &&
    implementationStart <= toCalendarDate(bounds.end)
  ) {
    bounds.start = implementationStart;
  }
  const useDayFactor = Boolean(implementationStart && bounds);
  const periodFactor = useDayFactor ? sumMonthDayFactors(bounds.start, bounds.end) : 12;

  let annualRent = 0;
  let dominantEntry = null;
  let dominantRent = 0;

  rentEntries.forEach((entry) => {
    const monthly = Math.max(0, Number(entry?.rentMonthly) || 0);
    const declaredAnnual = Math.max(0, Number(entry?.rentAnnual) || 0);
    let entryAnnual = declaredAnnual || monthly * 12;

    if (bounds && monthly > 0) {
      const from = parseRentDate(entry?.fromDate);
      const to = parseRentDate(entry?.toDate);
      if (from && to) {
        const overlapStart = from > bounds.start ? from : bounds.start;
        const overlapEnd = to < bounds.end ? to : bounds.end;
        if (overlapStart <= overlapEnd) {
          entryAnnual = useDayFactor
            ? monthly * sumMonthDayFactors(overlapStart, overlapEnd)
            : monthly * monthsInclusive(overlapStart, overlapEnd);
        } else {
          entryAnnual = 0;
        }
      } else if (useDayFactor) {
        entryAnnual = declaredAnnual > 0 ? declaredAnnual * (periodFactor / 12) : monthly * periodFactor;
      }
    } else if (bounds && useDayFactor && declaredAnnual > 0) {
      entryAnnual = declaredAnnual * (periodFactor / 12);
    }

    annualRent += entryAnnual;
    if (entryAnnual > dominantRent) {
      dominantRent = entryAnnual;
      dominantEntry = entry;
    }
  });

  const isMetroCity = Boolean(dominantEntry?.isMetroCity ?? rentEntries[0]?.isMetroCity);

  return {
    annualRent: Math.round(annualRent),
    isMetroCity,
    dominantEntry,
  };
}

function isSectionEnabled(toggles = {}, key, defaultEnabled = true) {
  if (!toggles || typeof toggles !== 'object') return defaultEnabled;
  if (toggles[key] === undefined || toggles[key] === null) return defaultEnabled;
  return toggles[key] !== false && toggles[key] !== 'false' && toggles[key] !== 0;
}

function capSection80C(amount) {
  return Math.min(Math.max(0, Number(amount) || 0), SECTION_80C_LIMIT);
}

function capSection80D(amount) {
  return Math.min(Math.max(0, Number(amount) || 0), SECTION_80D_COMBINED_LIMIT);
}

function capSection24SelfOccupied(amount) {
  return Math.min(Math.max(0, Number(amount) || 0), SECTION_24_SELF_OCCUPIED_LIMIT);
}

/**
 * Build declared deduction totals from employee declaration lines (with statutory caps + toggles).
 */
function buildDeclaredDeductionsFromDeclaration({
  lines80C = [],
  lines80D = [],
  itDeclaration = {},
  prevDeductions = {},
  tdsConfig = {},
  touchedHomeLoan = false,
  touchedOtherInv = false,
  declaredDeductionsOverride = null,
}) {
  const toggles = itDeclaration?.toggles || {};
  const standardDeduction =
    Number(prevDeductions.standardDeduction) ||
    Number(tdsConfig.standardDeduction) ||
    50000;

  const section80CEnabled = isSectionEnabled(toggles, 'section80C', true);
  const section80DEnabled = isSectionEnabled(toggles, 'section80D', true);
  const otherInvestmentsEnabled = isSectionEnabled(toggles, 'otherInvestments', true);

  const limits = getExemptionLimits(tdsConfig);
  const section80CLimit = readMoneyLimit(tdsConfig.section80CLimit, SECTION_80C_LIMIT);
  const hl = itDeclaration?.homeLoanSelfOccupied || {};
  const homeLoanEnabled = section80CEnabled && hl.enabled;
  const homeLoanPrincipal = homeLoanEnabled ? Math.max(0, Number(hl.principalPaid) || 0) : 0;

  let section24 = Number(prevDeductions.section24) || 0;
  if (touchedHomeLoan) {
    section24 = hl.enabled ? Math.max(0, Number(hl.interestPaid) || 0) : 0;
  }

  const raw80C = section80CEnabled ? sumLineAmounts(lines80C) + homeLoanPrincipal : 0;
  const section80DBuckets = section80DEnabled ? aggregate80DFromLines(lines80D) : empty80DBuckets();
  const raw80D = section80DBuckets.declared;

  const otherLines = Array.isArray(itDeclaration?.investmentsOther)
    ? itDeclaration.investmentsOther
    : [];
  let otherDeductions = Number(prevDeductions.otherDeductions) || 0;
  if (touchedOtherInv) {
    otherDeductions = otherInvestmentsEnabled ? sumLineAmounts(otherLines) : 0;
  } else if (!otherInvestmentsEnabled) {
    otherDeductions = 0;
  }

  const merged = {
    section80C: Math.max(0, raw80C),
    section80D: Math.max(0, raw80D),
    section80DSelf: section80DBuckets.selfPremium,
    section80DParents: section80DBuckets.parentsPremium,
    section80DPreventiveSelf: section80DBuckets.preventiveSelf,
    section80DPreventiveParents: section80DBuckets.preventiveParents,
    section80DMedicalSelf: section80DBuckets.medicalSelf,
    section80DMedicalParents: section80DBuckets.medicalParents,
    section80DSelfSenior: section80DBuckets.selfSenior,
    section80DParentsSenior: section80DBuckets.parentsSenior,
    section80E: Number(prevDeductions.section80E) || 0,
    section80G: Number(prevDeductions.section80G) || 0,
    section24,
    professionalTax: Number(prevDeductions.professionalTax) || 0,
    otherDeductions,
    standardDeduction,
    total: 0,
  };

  if (declaredDeductionsOverride && typeof declaredDeductionsOverride === 'object') {
    const n = declaredDeductionsOverride;
    if (n.section80E !== undefined) merged.section80E = Math.max(0, Number(n.section80E) || 0);
    if (n.section80G !== undefined) merged.section80G = Math.max(0, Number(n.section80G) || 0);
    if (n.professionalTax !== undefined) merged.professionalTax = Math.max(0, Number(n.professionalTax) || 0);
    if (n.section24 !== undefined && !touchedHomeLoan) {
      merged.section24 = Math.max(0, Number(n.section24) || 0);
    }
    if (n.otherDeductions !== undefined && !touchedOtherInv) {
      merged.otherDeductions = otherInvestmentsEnabled
        ? Math.max(0, Number(n.otherDeductions) || 0)
        : 0;
    }
  }

  const chapter = itDeclaration?.chapterVIA || {};
  [
    'section80CCC',
    'section80CCD1',
    'section80CCD1B',
    'section80CCD2',
    'section80DD',
    'section80DDB',
    'section80EE',
    'section80EEA',
    'section80GG',
    'section80GGA',
    'section80GGC',
    'section80TTA',
  ].forEach((key) => {
    if (chapter[key] !== undefined && chapter[key] !== null && chapter[key] !== '') {
      merged[key] = Math.max(0, Number(chapter[key]) || 0);
    }
  });
  if (chapter.section80DDSevere !== undefined) {
    merged.section80DDSevere = chapter.section80DDSevere === true
      || chapter.section80DDSevere === 'true'
      || chapter.section80DDSevere === 1;
  }

  merged.section80C = capToLimit(merged.section80C, section80CLimit);
  merged.section80D = capToLimit(merged.section80D, limits.section80D);
  merged.section80E = capToLimit(merged.section80E, limits.section80E);
  merged.section80G = capToLimit(merged.section80G, limits.section80G);
  merged.section24 = capToLimit(merged.section24, limits.section24);
  merged.otherDeductions = capToLimit(merged.otherDeductions, limits.otherDeductions);

  merged.total =
    merged.section80C +
    (Number(merged.section80CCC) || 0) +
    (Number(merged.section80CCD1) || 0) +
    (Number(merged.section80CCD1B) || 0) +
    (Number(merged.section80CCD2) || 0) +
    merged.section80D +
    (Number(merged.section80DD) || 0) +
    (Number(merged.section80DDB) || 0) +
    merged.section80E +
    (Number(merged.section80EE) || 0) +
    (Number(merged.section80EEA) || 0) +
    merged.section80G +
    (Number(merged.section80GG) || 0) +
    (Number(merged.section80GGA) || 0) +
    (Number(merged.section80GGC) || 0) +
    (Number(merged.section80TTA) || 0) +
    merged.section24 +
    merged.professionalTax +
    merged.otherDeductions +
    merged.standardDeduction;

  return merged;
}

function sumLineAmounts(lines = []) {
  if (!Array.isArray(lines)) return 0;
  return lines.reduce((sum, line) => sum + (Math.max(0, Number(line?.amount) || 0)), 0);
}

function money(value) {
  return Math.max(0, Number(value) || 0);
}

function empty80DBuckets() {
  return {
    declared: 0,
    selfPremium: 0,
    parentsPremium: 0,
    preventiveSelf: 0,
    preventiveParents: 0,
    medicalSelf: 0,
    medicalParents: 0,
    selfSenior: false,
    parentsSenior: false,
  };
}

function classify80DType(investmentType) {
  const type = String(investmentType || '').toLowerCase();
  return {
    parents: type.includes('parent'),
    senior: type.includes('senior'),
    preventive: type.includes('prevent') || type.includes('check-up') || type.includes('checkup') || type.includes('check up'),
    medical: type.includes('medical exp') || type.includes('expenditure') || type.includes('medical bill'),
  };
}

function aggregate80DFromLines(lines = []) {
  const buckets = empty80DBuckets();
  if (!Array.isArray(lines)) return buckets;
  lines.forEach((line) => {
    const amount = money(line?.amount);
    if (!amount) return;
    const kind = classify80DType(line?.investmentType);
    if (kind.parents) {
      buckets.parentsSenior = buckets.parentsSenior || kind.senior || kind.medical;
      if (kind.preventive) buckets.preventiveParents += amount;
      else if (kind.medical) buckets.medicalParents += amount;
      else buckets.parentsPremium += amount;
    } else {
      buckets.selfSenior = buckets.selfSenior || kind.senior || kind.medical;
      if (kind.preventive) buckets.preventiveSelf += amount;
      else if (kind.medical) buckets.medicalSelf += amount;
      else buckets.selfPremium += amount;
    }
    buckets.declared += amount;
  });
  return buckets;
}

/** Completed years up to asOf. Months of 6 or more count as one more year when roundSixMonths is set (Gratuity Act). */
function completedServiceYears(doj, asOf, roundSixMonths = false) {
  const start = new Date(doj);
  const end = new Date(asOf);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (roundSixMonths && months >= 6) years += 1;
  return Math.max(0, years);
}

function leastPositive(values) {
  const nums = values.filter((value) => Number.isFinite(value)).map((value) => Math.max(0, value));
  if (!nums.length) return 0;
  return Math.round(Math.min(...nums));
}

function gratuityExempt(actual, cap, monthlySalary, years, coveredUnderAct = true) {
  const received = money(actual);
  if (!received) return 0;
  const ceiling = cap == null ? received : Math.min(received, money(cap));
  if (!(monthlySalary > 0) || years == null) return Math.round(ceiling);
  const formula = coveredUnderAct
    ? (monthlySalary * 15 / 26) * years
    : (monthlySalary / 2) * years;
  return leastPositive([received, cap == null ? received : money(cap), formula]);
}

function leaveEncashmentExempt(actual, cap, monthlySalary) {
  const received = money(actual);
  if (!received) return 0;
  if (!(monthlySalary > 0)) return leastPositive([received, cap == null ? received : money(cap)]);
  return leastPositive([received, cap == null ? received : money(cap), monthlySalary * 10]);
}

function retrenchmentExempt(actual, cap, monthlySalary, years) {
  const received = money(actual);
  if (!received) return 0;
  if (!(monthlySalary > 0) || years == null) return leastPositive([received, cap == null ? received : money(cap)]);
  return leastPositive([received, cap == null ? received : money(cap), (monthlySalary * 15 / 26) * years]);
}

function vrsExempt(actual, cap, monthlySalary, years) {
  const received = money(actual);
  if (!received) return 0;
  if (!(monthlySalary > 0) || years == null) return leastPositive([received, cap == null ? received : money(cap)]);
  return leastPositive([received, cap == null ? received : money(cap), monthlySalary * 3 * years]);
}

function allow80DBucket(premium, medical, preventiveRequested, senior, limits, preventivePool) {
  const limit = senior ? money(limits.section80DSenior || 50000) : money(limits.section80DSelf || 25000);
  const premiumAmt = money(premium);
  const medicalAmt = premiumAmt > 0 ? 0 : money(medical);
  const base = Math.min(premiumAmt > 0 ? premiumAmt : medicalAmt, limit);
  const room = Math.max(0, limit - base);
  const checkup = Math.min(money(preventiveRequested), room, preventivePool.left);
  preventivePool.left -= checkup;
  return base + checkup;
}

function resolve80D(declared, limits, age) {
  const selfField = money(declared.section80DSelf);
  const parents = money(declared.section80DParents);
  const preventiveSelf = money(declared.section80DPreventiveSelf) + money(declared.section80DPreventive);
  const preventiveParents = money(declared.section80DPreventiveParents);
  const medicalSelf = money(declared.section80DMedicalSelf);
  const medicalParents = money(declared.section80DMedicalParents);
  const split = selfField + parents + preventiveSelf + preventiveParents + medicalSelf + medicalParents;
  const selfPremium = split > 0 ? selfField : money(declared.section80D);
  const selfSenior = declared.section80DSelfSenior === true
    || declared.section80DSelfSenior === 'true'
    || (Number.isFinite(age) && age >= 60);
  const parentsSenior = declared.section80DParentsSenior === true
    || declared.section80DParentsSenior === 'true';
  const pool = { left: money(limits.section80DPreventive ?? 5000) };
  const selfAllowed = allow80DBucket(selfPremium, medicalSelf, preventiveSelf, selfSenior, limits, pool);
  const parentsAllowed = allow80DBucket(parents, medicalParents, preventiveParents, parentsSenior, limits, pool);
  const combined = money(limits.section80D ?? SECTION_80D_COMBINED_LIMIT);
  const total = Math.min(selfAllowed + parentsAllowed, combined);
  const selfLimit = selfSenior ? money(limits.section80DSenior || 50000) : money(limits.section80DSelf || 25000);
  const parentsLimit = parentsSenior ? money(limits.section80DSenior || 50000) : money(limits.section80DSelf || 25000);
  const parts = [`Self, spouse and children ₹${selfAllowed.toLocaleString('en-IN')} of ₹${selfLimit.toLocaleString('en-IN')}`];
  if (parents > 0 || medicalParents > 0 || preventiveParents > 0) {
    parts.push(`Parents ₹${Math.max(0, total - selfAllowed).toLocaleString('en-IN')} of ₹${parentsLimit.toLocaleString('en-IN')}`);
  } else if (money(declared.section80D) + selfPremium > selfLimit && parents === 0) {
    parts.push('Parents were not declared, so only the self limit applies');
  }
  parts.push('Preventive checkup of ₹5,000 sits inside these limits');
  if ((medicalSelf > 0 && selfPremium > 0) || (medicalParents > 0 && parents > 0)) {
    parts.push('Medical bills are ignored where insurance premium is paid');
  }
  return { amount: total, note: parts.join('. ') + '.' };
}

function capCombined80C(declared = {}, limit) {
  let room = Math.max(0, Number(limit) || 0);
  const take = (key) => {
    const allowed = Math.min(Math.max(0, Number(declared[key]) || 0), room);
    room -= allowed;
    return allowed;
  };
  return {
    section80C: take('section80C'),
    section80CCC: take('section80CCC'),
    section80CCD1: take('section80CCD1'),
  };
}

function applyCappedDeductionsForTax(declaredDeductions = {}, tdsConfig = {}, options = {}) {
  const limits = getExemptionLimits(tdsConfig);
  const notes = {};
  const section80CLimit = readMoneyLimit(tdsConfig.section80CLimit, SECTION_80C_LIMIT);
  const severe = declaredDeductions.section80DDSevere === true
    || declaredDeductions.section80DDSevere === 'true'
    || declaredDeductions.section80DDSevere === 1;
  const age = Number(options.age);
  const knownAge = Number.isFinite(age);
  const senior = knownAge && age >= 60;
  const ddbLimit = senior
    ? limits.section80DDBSenior
    : (!knownAge
      ? Math.max(Number(limits.section80DDB) || 0, Number(limits.section80DDBSenior) || 0)
      : limits.section80DDB);
  const months = Number(options.payrollMonths);
  const ggMonths = Number.isFinite(months) && months > 0 ? months : 12;
  const salary = money(options.annualBasic) + money(options.annualDa);
  const regime = String(options.taxRegime || 'old').toLowerCase() === 'new' ? 'new' : 'old';
  const ccd1Percent = money(limits.section80CCD1Percent ?? 10);
  const ccd2Percent = regime === 'new'
    ? money(limits.section80CCD2Percent ?? 14)
    : money(limits.section80CCD2PercentOld ?? 10);

  let section80CCD1 = money(declaredDeductions.section80CCD1);
  if (salary > 0) {
    const salaryCap = Math.round((salary * ccd1Percent) / 100);
    section80CCD1 = Math.min(section80CCD1, salaryCap);
    notes.section80CCD1 = `${ccd1Percent}% of salary ₹${salary.toLocaleString('en-IN')}, then the combined 80C room.`;
  }
  const combined = capCombined80C({ ...declaredDeductions, section80CCD1 }, section80CLimit);

  let section80CCD2 = money(declaredDeductions.section80CCD2);
  if (salary > 0) {
    const salaryCap = Math.round((salary * ccd2Percent) / 100);
    section80CCD2 = Math.min(section80CCD2, salaryCap);
  }
  notes.section80CCD2 = regime === 'new'
    ? `New regime: ${ccd2Percent}% of salary ₹${Math.round(salary).toLocaleString('en-IN')}.`
    : `Old regime: ${ccd2Percent}% of salary ₹${Math.round(salary).toLocaleString('en-IN')}. Central Government employers use 14%.`;

  const section80DResult = resolve80D(declaredDeductions, limits, knownAge ? age : null);
  notes.section80D = section80DResult.note;

  const ddClaimed = money(declaredDeductions.section80DD) > 0 || severe;
  const section80DD = ddClaimed ? money(severe ? limits.section80DDSevere : limits.section80DD) : 0;
  notes.section80DD = ddClaimed
    ? `Fixed deduction ₹${section80DD.toLocaleString('en-IN')}. 80DD is not limited to the amount typed.`
    : 'Not claimed.';

  const assesseeDisabled = options.assesseeDisabled === true;
  const section80U = assesseeDisabled
    ? money(options.assesseeSevere ? limits.section80USevere : limits.section80U)
    : 0;
  notes.section80U = assesseeDisabled
    ? `Fixed deduction because disability is marked on the employee.`
    : 'Not claimed. Mark disability on the employee to allow 80U.';

  const ddbNet = Math.max(0, money(declaredDeductions.section80DDB) - money(declaredDeductions.section80DDBReimbursed));
  const section80DDB = capToLimit(ddbNet, ddbLimit);
  notes.section80DDB = senior
    ? `Senior citizen ceiling ₹${money(ddbLimit).toLocaleString('en-IN')}, after insurance reimbursement.`
    : `Ceiling ₹${money(ddbLimit).toLocaleString('en-IN')} below age 60, after insurance reimbursement.`;

  let section80E = capToLimit(declaredDeductions.section80E, limits.section80E);
  const startYear = Number(declaredDeductions.section80EStartYear);
  const fyStart = Number(options.fyStartYear);
  if (section80E > 0 && Number.isFinite(startYear) && startYear > 0 && Number.isFinite(fyStart)) {
    const claimYear = fyStart - startYear + 1;
    if (claimYear < 1 || claimYear > 8) {
      section80E = 0;
      notes.section80E = 'Interest is outside the 8-year deduction window.';
    } else {
      notes.section80E = `Year ${claimYear} of 8. No rupee ceiling.`;
    }
  } else {
    notes.section80E = 'No rupee ceiling. The 8-year window applies when the starting financial year is entered.';
  }

  const section80EE = capToLimit(declaredDeductions.section80EE, limits.section80EE);
  let section80EEA = capToLimit(declaredDeductions.section80EEA, limits.section80EEA);
  if (section80EE > 0 && section80EEA > 0) {
    section80EEA = 0;
    notes.section80EEA = 'Not allowed in a year when Section 80EE is claimed. Clear 80EE to use 80EEA.';
  } else {
    notes.section80EEA = `Ceiling ₹${money(limits.section80EEA).toLocaleString('en-IN')}. Loan must be sanctioned from 1 Apr 2019 to 31 Mar 2022.`;
  }
  notes.section80EE = `Ceiling ₹${money(limits.section80EE).toLocaleString('en-IN')}. Loan must be sanctioned in FY 2016-17.`;

  const section24 = capToLimit(declaredDeductions.section24, limits.section24);
  notes.section24 = `Self-occupied ceiling ₹${money(limits.section24).toLocaleString('en-IN')}. A let-out loss can also be set off only up to this amount.`;

  const incomeBeforeSection24 = Number(options.incomeBeforeSection24);
  const gti = Number.isFinite(incomeBeforeSection24) ? Math.max(0, incomeBeforeSection24 - section24) : null;

  const section80CCD1B = capToLimit(declaredDeductions.section80CCD1B, limits.section80CCD1B);
  const section80GGA = capToLimit(declaredDeductions.section80GGA, limits.section80GGA);
  const section80GGC = capToLimit(declaredDeductions.section80GGC, limits.section80GGC);
  const otherDeductions = capToLimit(declaredDeductions.otherDeductions, limits.otherDeductions);

  let section80TTA = 0;
  let section80TTB = 0;
  const interestClaim = money(declaredDeductions.section80TTA);
  if (senior) {
    let base = interestClaim;
    const reported = money(options.interestSavings) + money(options.interestFD);
    if (reported > 0) base = Math.min(base, reported);
    section80TTB = Math.min(base, money(limits.section80TTB ?? 50000));
    notes.section80TTA = '80TTA does not apply from age 60. Section 80TTB is used.';
    notes.section80TTB = `Senior-citizen interest ceiling ₹${money(limits.section80TTB ?? 50000).toLocaleString('en-IN')}.`;
  } else {
    let base = interestClaim;
    if (money(options.interestSavings) > 0) base = Math.min(base, money(options.interestSavings));
    section80TTA = Math.min(base, money(limits.section80TTA ?? 10000));
    notes.section80TTA = `Savings interest only, ceiling ₹${money(limits.section80TTA ?? 10000).toLocaleString('en-IN')}. Fixed-deposit interest is not eligible.`;
  }

  const viaExceptRentAndDonation =
    combined.section80C +
    combined.section80CCC +
    combined.section80CCD1 +
    section80CCD1B +
    section80CCD2 +
    section80DResult.amount +
    section80DD +
    section80U +
    section80DDB +
    section80E +
    section80EE +
    section80EEA +
    section80GGA +
    section80GGC +
    section80TTA +
    section80TTB +
    otherDeductions;

  const adjustedForRent = gti == null ? null : Math.max(0, gti - viaExceptRentAndDonation);
  let section80GG = 0;
  const annualHra = money(options.annualHra);
  if (money(declaredDeductions.section80GG) > 0 && annualHra > 0) {
    notes.section80GG = 'Not available when HRA is received.';
  } else if (money(declaredDeductions.section80GG) > 0) {
    const monthlyCap = money(limits.section80GGMonthly ?? 5000) * ggMonths;
    const rent = money(options.annualRent);
    const adjusted = adjustedForRent == null ? money(declaredDeductions.section80GG) : adjustedForRent;
    const rentMinusTen = Math.max(0, rent - (adjusted * 0.1));
    const quarter = adjusted * 0.25;
    const statutory = Math.min(monthlyCap, rentMinusTen, quarter);
    section80GG = Math.min(money(declaredDeductions.section80GG), Math.max(0, statutory));
    notes.section80GG = rent > 0
      ? `Least of ₹${money(limits.section80GGMonthly ?? 5000).toLocaleString('en-IN')} × ${ggMonths} months, 25% of adjusted income, and rent minus 10% of adjusted income.`
      : 'Rent is zero, so 80GG is zero.';
  }

  const adjustedForDonation = gti == null
    ? null
    : Math.max(0, gti - viaExceptRentAndDonation - section80GG);
  const qualifyingRoom = adjustedForDonation == null ? Number.POSITIVE_INFINITY : adjustedForDonation * 0.1;
  const limited100 = Math.min(money(declaredDeductions.section80G100Limited), qualifyingRoom);
  const limited50Base = Math.min(
    money(declaredDeductions.section80G50Limited),
    Math.max(0, qualifyingRoom - limited100)
  );
  let section80G = money(declaredDeductions.section80G)
    + (money(declaredDeductions.section80G50) * 0.5)
    + limited100
    + (limited50Base * 0.5);
  section80G = capToLimit(section80G, limits.section80G);
  section80G = Math.round(section80G);
  notes.section80G = '100% donations are allowed in full. 50% donations are halved. Donations marked as subject to the qualifying limit stay within 10% of adjusted total income.';

  return {
    ...declaredDeductions,
    ...combined,
    section80CCD1B,
    section80CCD2,
    section80D: section80DResult.amount,
    section80DD,
    section80DDSevere: severe,
    section80U,
    section80DDB,
    section80E,
    section80EE,
    section80EEA,
    section80G,
    section80GG: Math.round(section80GG),
    section80GGA,
    section80GGC,
    section80TTA,
    section80TTB,
    section24,
    otherDeductions,
    statutoryNotes: notes,
  };
}

module.exports = {
  SECTION_80C_LIMIT,
  SECTION_80D_COMBINED_LIMIT,
  SECTION_24_SELF_OCCUPIED_LIMIT,
  computeAnnualRentFromEntries,
  buildDeclaredDeductionsFromDeclaration,
  applyCappedDeductionsForTax,
  aggregate80DFromLines,
  completedServiceYears,
  gratuityExempt,
  leaveEncashmentExempt,
  retrenchmentExempt,
  vrsExempt,
  getDefaultExemptionLimits,
  getExemptionLimits,
  capToLimit,
  capSection80C,
  capSection80D,
  capSection24SelfOccupied,
  isSectionEnabled,
  sumLineAmounts,
};
