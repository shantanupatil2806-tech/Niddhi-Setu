const { runComplianceChecks } = require('../services/complianceEngine');
const FDR = require('../models/FDR');

// Mock Mongoose model methods
jest.mock('../models/FDR', () => ({
  findOne: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(null)
  }),
  findById: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(null)
  })
}));

describe('Compliance Engine Tests', () => {
  it('should flag temporal sequence violations (issueDate >= maturityDate)', async () => {
    const invalidFdr = {
      refNumber: 'TEST-FDR-001',
      bankName: 'Test Bank',
      amount: 500000,
      issueDate: new Date('2026-05-01'),
      maturityDate: new Date('2025-05-01'), // Maturity before issue!
      depositPeriodMonths: 12
    };

    const result = await runComplianceChecks(invalidFdr);
    expect(result.findings.some((f) => f.rule === 'RULE_003')).toBe(true);
    expect(result.complianceScore).toBeLessThan(100);
  });

  it('should detect missing mandatory fields', async () => {
    const incompleteFdr = {
      bankName: 'Test Bank'
      // Missing refNumber, amount, issueDate, maturityDate
    };

    const result = await runComplianceChecks(incompleteFdr);
    expect(result.findings.some((f) => f.rule === 'RULE_002')).toBe(true);
  });

  it('should pass cleanly with perfect score on valid instrument', async () => {
    const now = new Date();
    const validFdr = {
      refNumber: 'PERFECT-FDR-999',
      bankName: 'State Bank of India',
      amount: 1000000,
      issueDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      maturityDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      depositPeriodMonths: 13
    };

    const result = await runComplianceChecks(validFdr);
    expect(result.findings.length).toBe(0);
    expect(result.complianceScore).toBe(100);
  });
});
