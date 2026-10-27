const { computeObjectHash, computeStringHash, computeBufferHash } = require('../utils/hash');

describe('Cryptographic Hash Utilities', () => {
  it('should compute consistent SHA-256 string hash', () => {
    const hash1 = computeStringHash('test-fdr-instrument');
    const hash2 = computeStringHash('test-fdr-instrument');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should compute deterministic object hash regardless of key order', () => {
    const objA = { amount: 100000, bank: 'SBI', active: true };
    const objB = { active: true, bank: 'SBI', amount: 100000 };
    const hashA = computeObjectHash(objA);
    const hashB = computeObjectHash(objB);
    expect(hashA).toBe(hashB);
  });

  it('should compute buffer hash', () => {
    const buf = Buffer.from('hello-fdr-sentinel');
    const hash = computeBufferHash(buf);
    expect(hash).toHaveLength(64);
  });
});
