require('dotenv').config({ path: 'C:/Users/Shantanu/.gemini/antigravity/scratch/fdr-sentinel/backend/.env' });
const mongoose = require('mongoose');
const User = require('C:/Users/Shantanu/.gemini/antigravity/scratch/fdr-sentinel/backend/src/models/User');
const Institution = require('C:/Users/Shantanu/.gemini/antigravity/scratch/fdr-sentinel/backend/src/models/Institution');
const { ROLES } = require('C:/Users/Shantanu/.gemini/antigravity/scratch/fdr-sentinel/backend/src/config/constants');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fdr-sentinel';

async function syncUsers() {
  try {
    console.log('Connecting to:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB.');

    let inst = await Institution.findOne();
    if (!inst) {
      inst = await Institution.create({
        name: 'Government Engineering College Raipur',
        code: 'GECR',
        type: 'technical',
        contactEmail: 'principal@gec-raipur.edu.in',
        address: { street: 'Sejbahar', city: 'Raipur', state: 'Chhattisgarh', pincode: '492015' }
      });
      console.log('Created sample institution GEC Raipur');
    }

    const adminHash = await User.hashPassword('Admin@123');
    const officerHash = await User.hashPassword('Officer@123');
    const instHash = await User.hashPassword('Inst@123');

    const accounts = [
      { name: 'Central Admin (AICTE)', email: 'admin@aicte.gov.in', passwordHash: adminHash, role: ROLES.ADMIN },
      { name: 'Administrative Officer', email: 'admin.officer@aicte.gov.in', passwordHash: officerHash, role: ROLES.OFFICER_ADMIN },
      { name: 'Finance / FDR Officer', email: 'finance.officer@aicte.gov.in', passwordHash: officerHash, role: ROLES.OFFICER_FINANCE },
      { name: 'PGRC Officer', email: 'pgrc.officer@aicte.gov.in', passwordHash: officerHash, role: ROLES.OFFICER_PGRC },
      { name: 'Vigilance Officer (CVO)', email: 'vigilance.officer@aicte.gov.in', passwordHash: officerHash, role: ROLES.OFFICER_VIGILANCE },
      { name: 'Approval Bureau Officer', email: 'approval.officer@aicte.gov.in', passwordHash: officerHash, role: ROLES.OFFICER_APPROVAL },
      { name: 'Principal (GEC Raipur)', email: 'principal@gec-raipur.edu.in', passwordHash: instHash, role: ROLES.INSTITUTION, institutionId: inst._id }
    ];

    for (const acc of accounts) {
      await User.findOneAndUpdate(
        { email: acc.email },
        { $set: { ...acc, isActive: true } },
        { upsert: true, new: true }
      );
      console.log(`Synced account: ${acc.email} (${acc.role})`);
    }

    console.log('All departmental accounts successfully synced into database!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error syncing users:', err.message);
    process.exit(1);
  }
}

syncUsers();
