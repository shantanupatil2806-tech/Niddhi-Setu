const fs = require('fs');
const crypto = require('crypto');

/**
 * Computes SHA-256 hex hash of file contents on disk
 * @param {string} filePath - Absolute or relative path to file
 * @returns {string} SHA-256 hex string
 */
function computeFileHash(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (err) {
    console.error(`[Hash] Error computing file hash for ${filePath}:`, err.message);
    throw err;
  }
}

/**
 * Computes SHA-256 hex hash of an in-memory Buffer
 * @param {Buffer} buffer
 * @returns {string} SHA-256 hex string
 */
function computeBufferHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Deterministically computes SHA-256 hex hash of an object
 * Keys are sorted recursively to ensure reproducible digests
 * @param {Object} obj
 * @returns {string} SHA-256 hex string
 */
function computeObjectHash(obj) {
  const normalize = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val !== 'object') return val;
    if (val instanceof Date) return val.toISOString();
    if (Array.isArray(val)) return val.map(normalize);
    return Object.keys(val)
      .sort()
      .reduce((res, key) => {
        res[key] = normalize(val[key]);
        return res;
      }, {});
  };

  const normalizedString = JSON.stringify(normalize(obj));
  return crypto.createHash('sha256').update(normalizedString).digest('hex');
}

/**
 * Computes SHA-256 hex hash of a string
 * @param {string} str
 * @returns {string} SHA-256 hex string
 */
function computeStringHash(str) {
  return crypto.createHash('sha256').update(String(str)).digest('hex');
}

module.exports = {
  computeFileHash,
  computeBufferHash,
  computeObjectHash,
  computeStringHash
};
