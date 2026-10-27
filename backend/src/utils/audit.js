const AuditEvent = require('../models/AuditEvent');

/**
 * Appends a tamper-evident cryptographic audit event linked to preceding event
 * @param {string} entityType - e.g., 'FDR', 'VerificationCase', 'Institution'
 * @param {string|mongoose.Types.ObjectId} entityId
 * @param {string|mongoose.Types.ObjectId|null} actor - User ID
 * @param {string} actorRole - e.g., 'admin', 'officer', 'institution', 'system'
 * @param {string} action - e.g., 'FDR_SUBMITTED', 'VERIFICATION_DECISION', 'STATUS_CHANGE'
 * @param {Object} payload - Change details / metadata
 * @param {mongoose.ClientSession|null} session - Optional transaction session
 * @returns {Promise<AuditEvent>}
 */
async function recordAuditEvent(entityType, entityId, actor, actorRole, action, payload = {}, session = null) {
  try {
    // Find the most recent event for this entity to chain hash
    const query = AuditEvent.findOne({ entityType, entityId }).sort({ timestamp: -1, _id: -1 });
    if (session) {
      query.session(session);
    }
    const lastEvent = await query.exec();

    const previousHash = lastEvent && lastEvent.currentHash
      ? lastEvent.currentHash
      : '0000000000000000000000000000000000000000000000000000000000000000';

    const event = new AuditEvent({
      entityType,
      entityId,
      actor: actor || null,
      actorRole: actorRole || 'system',
      action,
      payload,
      previousHash
    });

    const savedEvent = session ? await event.save({ session }) : await event.save();
    return savedEvent;
  } catch (error) {
    console.error(`[Audit] Failed to record audit event for ${entityType}:${entityId}:`, error.message);
    throw error;
  }
}

module.exports = {
  recordAuditEvent
};
