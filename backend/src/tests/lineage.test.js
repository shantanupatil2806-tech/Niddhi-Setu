const { validateLineage } = require('../services/lineageService');
const FDR = require('../models/FDR');

jest.mock('../models/FDR');

describe('Temporal Lineage Verification Tests', () => {
  it('should flag amount regression across renewals', async () => {
    // Child FDR has lower amount than parent FDR
    const mockChild = {
      _id: 'child123',
      refNumber: 'FDR-RENEWAL-002',
      amount: 1000000, // 10 Lakhs
      parentFdrId: 'parent123',
      issueDate: new Date('2024-01-01'),
      maturityDate: new Date('2026-01-01')
    };

    const mockParent = {
      _id: 'parent123',
      refNumber: 'FDR-PARENT-001',
      amount: 1500000, // 15 Lakhs (higher than child!)
      issueDate: new Date('2022-01-01'),
      maturityDate: new Date('2024-01-01'),
      parentFdrId: null
    };

    FDR.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      })
    });

    FDR.findById.mockImplementation((id) => ({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockImplementation(() => {
          if (id === 'child123') return Promise.resolve(mockChild);
          if (id === 'parent123') return Promise.resolve(mockParent);
          return Promise.resolve(null);
        })
      }),
      lean: jest.fn().mockImplementation(() => {
        if (id === 'child123') return Promise.resolve(mockChild);
        if (id === 'parent123') return Promise.resolve(mockParent);
        return Promise.resolve(null);
      })
    }));

    const findings = await validateLineage('child123');
    expect(findings.some((f) => f.rule === 'LINEAGE_AMOUNT_DECREASE')).toBe(true);
  });
});
