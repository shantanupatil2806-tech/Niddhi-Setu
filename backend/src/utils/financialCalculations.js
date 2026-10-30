/**
 * Financial Calculation Utilities for Fixed Deposit Receipts (FDRs)
 * Strictly conforms to Indian Scheduled Commercial Banking & AICTE statutory norms.
 */

/**
 * Computes compound interest and maturity values.
 * Standard Indian Banking Formula for term deposits:
 * A = P * (1 + r / n)^(n * t)
 *
 * @param {number} principal - Principal guaranteed deposit amount (INR)
 * @param {number} annualRate - Annual interest rate percentage (e.g. 7.1 for 7.1% p.a.)
 * @param {number} tenureMonths - Total tenure in calendar months
 * @param {'quarterly' | 'monthly' | 'half_yearly' | 'annual' | 'simple'} compounding - Frequency
 * @returns {{ maturityAmount: number, totalInterest: number, effectiveYield: number }}
 */
function calculateMaturityValuation(principal, annualRate = 7.1, tenureMonths = 96, compounding = 'quarterly') {
  const p = Number(principal) || 0;
  const r = (Number(annualRate) || 7.1) / 100;
  const t = (Number(tenureMonths) || 96) / 12; // in years

  if (p <= 0) {
    return { maturityAmount: 0, totalInterest: 0, effectiveYield: 0 };
  }

  let maturityAmount = 0;

  if (compounding === 'simple') {
    const interest = p * r * t;
    maturityAmount = Math.round(p + interest);
  } else {
    let n = 4; // quarterly by default in Indian CBS systems
    if (compounding === 'monthly') n = 12;
    if (compounding === 'half_yearly') n = 2;
    if (compounding === 'annual') n = 1;

    maturityAmount = Math.round(p * Math.pow(1 + r / n, n * t));
  }

  const totalInterest = Math.max(0, maturityAmount - p);
  const effectiveYield = t > 0 ? Number(((totalInterest / p / t) * 100).toFixed(2)) : Number((r * 100).toFixed(2));

  return {
    maturityAmount,
    totalInterest,
    effectiveYield
  };
}

/**
 * Computes interest accumulated to date since deposit issue date.
 *
 * @param {number} principal
 * @param {number} annualRate
 * @param {Date|string} issueDate
 * @param {Date|string} [asOfDate]
 * @param {'quarterly' | 'monthly' | 'half_yearly' | 'annual' | 'simple'} [compounding]
 * @returns {{ accruedInterest: number, currentValue: number, elapsedMonths: number }}
 */
function calculateAccruedInterest(principal, annualRate = 7.1, issueDate, asOfDate = new Date(), compounding = 'quarterly') {
  const p = Number(principal) || 0;
  if (p <= 0 || !issueDate) {
    return { accruedInterest: 0, currentValue: p, elapsedMonths: 0 };
  }

  const start = new Date(issueDate);
  const end = new Date(asOfDate);
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const elapsedMonths = Math.max(0, Number((diffMs / (1000 * 60 * 60 * 24 * 30.4375)).toFixed(1)));

  const val = calculateMaturityValuation(p, annualRate, elapsedMonths, compounding);

  return {
    accruedInterest: val.totalInterest,
    currentValue: val.maturityAmount,
    elapsedMonths
  };
}

module.exports = {
  calculateMaturityValuation,
  calculateAccruedInterest
};
