require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const Institution = require('../models/Institution');
const FDR = require('../models/FDR');
const VerificationCase = require('../models/VerificationCase');
const VerificationFinding = require('../models/VerificationFinding');
const RenewalOrReplacement = require('../models/RenewalOrReplacement');
const ReleaseRequest = require('../models/ReleaseRequest');
const AuditEvent = require('../models/AuditEvent');
const VerificationPassport = require('../models/VerificationPassport');
const { ROLES, INSTITUTION_TYPES, INSTITUTION_STATUS, FDR_STATUS, VERIFICATION_STATUS, CASE_STATUS, CASE_PRIORITY, RENEWAL_TYPE, RENEWAL_STATUS, RELEASE_STATUS, FINDING_SEVERITY, FINDING_CATEGORY } = require('../config/constants');
const { runComplianceChecks } = require('../services/complianceEngine');
const { createPassport, appendDecision } = require('../services/passportService');
const { recordAuditEvent } = require('./audit');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fdr-sentinel';

async function seedDatabase() {
  console.log('[Seed] Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('[Seed] Connected successfully.');

  console.log('[Seed] Cleaning existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Institution.deleteMany({}),
    FDR.deleteMany({}),
    VerificationCase.deleteMany({}),
    VerificationFinding.deleteMany({}),
    RenewalOrReplacement.deleteMany({}),
    ReleaseRequest.deleteMany({}),
    AuditEvent.deleteMany({}),
    VerificationPassport.deleteMany({})
  ]);
  console.log('[Seed] Database cleaned.');

  // 1. Create Institutions
  console.log('[Seed] Seeding institutions...');
  const institutionsData = [
    {
      name: 'Indian Institute of Technology Delhi',
      code: 'IITD',
      type: INSTITUTION_TYPES.UNIVERSITY,
      address: {
        street: 'Hauz Khas',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110016'
      },
      contactEmail: 'registrar@iitd.ac.in',
      contactPhone: '+91-11-2659-7135',
      status: INSTITUTION_STATUS.ACTIVE,
      approvalDate: new Date('2015-06-15')
    },
    {
      name: 'National Institute of Technology Tiruchirappalli',
      code: 'NITT',
      type: INSTITUTION_TYPES.TECHNICAL,
      address: {
        street: 'Tanjore Main Road, National Highway 67',
        city: 'Tiruchirappalli',
        state: 'Tamil Nadu',
        pincode: '620015'
      },
      contactEmail: 'registrar@nitt.edu',
      contactPhone: '+91-431-2503000',
      status: INSTITUTION_STATUS.ACTIVE,
      approvalDate: new Date('2016-08-20')
    },
    {
      name: 'Birla Institute of Technology and Science Pilani',
      code: 'BITS',
      type: INSTITUTION_TYPES.DEEMED,
      address: {
        street: 'Vidya Vihar Campus',
        city: 'Pilani',
        state: 'Rajasthan',
        pincode: '333031'
      },
      contactEmail: 'finance@bits-pilani.ac.in',
      contactPhone: '+91-1596-242210',
      status: INSTITUTION_STATUS.ACTIVE,
      approvalDate: new Date('2017-03-10')
    }
  ];

  const institutions = await Institution.insertMany(institutionsData);
  const [iitd, nitt, bits] = institutions;

  // 2. Create Users
  console.log('[Seed] Seeding users with hashed credentials...');
  const adminPasswordHash = await User.hashPassword('Admin@123');
  const officerPasswordHash = await User.hashPassword('Officer@123');
  const instPasswordHash = await User.hashPassword('Inst@123');

  const usersData = [
    {
      name: 'Central Administrator',
      email: 'admin@fdrsentinel.gov.in',
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      isActive: true
    },
    {
      name: 'Dr. Rajesh Sharma',
      email: 'officer.sharma@fdrsentinel.gov.in',
      passwordHash: officerPasswordHash,
      role: ROLES.OFFICER,
      isActive: true
    },
    {
      name: 'Pooja Verma',
      email: 'officer.verma@fdrsentinel.gov.in',
      passwordHash: officerPasswordHash,
      role: ROLES.OFFICER,
      isActive: true
    },
    {
      name: 'Prof. S. K. Gupta (IIT Delhi)',
      email: 'registrar@iitd.ac.in',
      passwordHash: instPasswordHash,
      role: ROLES.INSTITUTION,
      institutionId: iitd._id,
      isActive: true
    },
    {
      name: 'Dr. K. Ramanathan (NIT Trichy)',
      email: 'registrar@nitt.edu',
      passwordHash: instPasswordHash,
      role: ROLES.INSTITUTION,
      institutionId: nitt._id,
      isActive: true
    },
    {
      name: 'Col. Anand Joshi (BITS Pilani)',
      email: 'finance@bits-pilani.ac.in',
      passwordHash: instPasswordHash,
      role: ROLES.INSTITUTION,
      institutionId: bits._id,
      isActive: true
    }
  ];

  const users = await User.insertMany(usersData);
  const [adminUser, officerSharma, officerVerma, iitdUser, nittUser, bitsUser] = users;

  // 3. Create 15 FDR Instruments with Varied Statuses & Lineages
  console.log('[Seed] Creating 15 realistic FDR instruments and lineages...');
  const now = new Date();

  const helperHash = (seedStr) => crypto.createHash('sha256').update(seedStr).digest('hex');

  // FDR 1: IITD Root (Matured)
  const fdr1 = await new FDR({
    institutionId: iitd._id,
    refNumber: 'SBI-DEL-2022-9011',
    bankName: 'State Bank of India',
    branch: 'IIT Delhi Campus Branch',
    bankAddress: 'Main Administrative Block, IIT Delhi, Hauz Khas',
    amount: 15000000, // 1.5 Cr
    currency: 'INR',
    issueDate: new Date('2022-04-10'),
    maturityDate: new Date('2024-04-10'),
    depositPeriodMonths: 24,
    status: FDR_STATUS.MATURED,
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    docOriginalName: 'sbi_fd_receipt_9011.pdf',
    docHash: helperHash('sbi-del-9011'),
    docMimeType: 'application/pdf',
    submittedBy: iitdUser._id,
    complianceScore: 100
  }).save();

  // FDR 2: IITD Renewal 1 (Verified, Approaching Maturity in 18 days)
  const fdr2Maturity = new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000);
  const fdr2 = await new FDR({
    institutionId: iitd._id,
    refNumber: 'SBI-DEL-2024-9045',
    bankName: 'State Bank of India',
    branch: 'IIT Delhi Campus Branch',
    bankAddress: 'Main Administrative Block, IIT Delhi, Hauz Khas',
    amount: 17500000, // 1.75 Cr
    currency: 'INR',
    issueDate: new Date('2024-04-10'),
    maturityDate: fdr2Maturity,
    depositPeriodMonths: 24,
    status: FDR_STATUS.VERIFIED,
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    parentFdrId: fdr1._id,
    docOriginalName: 'sbi_fd_receipt_9045.pdf',
    docHash: helperHash('sbi-del-9045'),
    docMimeType: 'application/pdf',
    submittedBy: iitdUser._id,
    complianceScore: 95,
    riskFlags: ['RULE_007: Maturity Threshold Alert']
  }).save();

  // FDR 3: IITD Renewal 2 (Submitted, Under Review)
  const fdr3 = await new FDR({
    institutionId: iitd._id,
    refNumber: 'SBI-DEL-2026-9112',
    bankName: 'State Bank of India',
    branch: 'IIT Delhi Campus Branch',
    bankAddress: 'Main Administrative Block, IIT Delhi, Hauz Khas',
    amount: 20000000, // 2.0 Cr
    currency: 'INR',
    issueDate: new Date(),
    maturityDate: new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000),
    depositPeriodMonths: 24,
    status: FDR_STATUS.SUBMITTED,
    verificationStatus: VERIFICATION_STATUS.PENDING,
    parentFdrId: fdr2._id,
    docOriginalName: 'sbi_fd_renewal_9112.pdf',
    docHash: helperHash('sbi-del-9112'),
    docMimeType: 'application/pdf',
    submittedBy: iitdUser._id,
    complianceScore: 100
  }).save();

  // FDR 4: IITD Independent Deposit (Verified)
  const fdr4 = await new FDR({
    institutionId: iitd._id,
    refNumber: 'PNB-DL-2025-1044',
    bankName: 'Punjab National Bank',
    branch: 'Hauz Khas Market',
    amount: 5000000, // 50 Lakh
    currency: 'INR',
    issueDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
    maturityDate: new Date(now.getTime() + 540 * 24 * 60 * 60 * 1000),
    depositPeriodMonths: 24,
    status: FDR_STATUS.VERIFIED,
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    docOriginalName: 'pnb_fd_1044.pdf',
    docHash: helperHash('pnb-1044'),
    docMimeType: 'application/pdf',
    submittedBy: iitdUser._id,
    complianceScore: 100
  }).save();

  // FDR 5: IITD Flagged Deposit (Clarification Required)
  const fdr5 = await new FDR({
    institutionId: iitd._id,
    refNumber: 'HDFC-DEL-2025-8821',
    bankName: 'HDFC Bank',
    branch: 'Green Park Extension',
    amount: 3500000,
    currency: 'INR',
    issueDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    maturityDate: new Date(now.getTime() + 300 * 24 * 60 * 60 * 1000),
    depositPeriodMonths: 12,
    status: FDR_STATUS.CLARIFICATION_REQUIRED,
    verificationStatus: VERIFICATION_STATUS.FLAGGED,
    docOriginalName: 'hdfc_receipt_8821.pdf',
    docHash: helperHash('hdfc-8821'),
    docMimeType: 'application/pdf',
    submittedBy: iitdUser._id,
    complianceScore: 70,
    riskFlags: ['RULE_009: Deposit Period Inconsistency Check']
  }).save();

  // FDR 6: NITT Root (Matured)
  const fdr6 = await new FDR({
    institutionId: nitt._id,
    refNumber: 'CNRB-TRI-2021-3310',
    bankName: 'Canara Bank',
    branch: 'REC Trichy Branch',
    amount: 12000000, // 1.2 Cr
    currency: 'INR',
    issueDate: new Date('2021-08-15'),
    maturityDate: new Date('2024-08-15'),
    depositPeriodMonths: 36,
    status: FDR_STATUS.MATURED,
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    docOriginalName: 'canara_rec_3310.pdf',
    docHash: helperHash('cnrb-3310'),
    docMimeType: 'application/pdf',
    submittedBy: nittUser._id,
    complianceScore: 100
  }).save();

  // FDR 7: NITT Renewal of FDR 6 (Verified)
  const fdr7 = await new FDR({
    institutionId: nitt._id,
    refNumber: 'CNRB-TRI-2024-4422',
    bankName: 'Canara Bank',
    branch: 'REC Trichy Branch',
    amount: 12000000,
    currency: 'INR',
    issueDate: new Date('2024-08-15'),
    maturityDate: new Date('2027-08-15'),
    depositPeriodMonths: 36,
    status: FDR_STATUS.VERIFIED,
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    parentFdrId: fdr6._id,
    docOriginalName: 'canara_rec_4422.pdf',
    docHash: helperHash('cnrb-4422'),
    docMimeType: 'application/pdf',
    submittedBy: nittUser._id,
    complianceScore: 100
  }).save();

  // FDR 8: NITT In Review
  const fdr8 = await new FDR({
    institutionId: nitt._id,
    refNumber: 'SBI-TRY-2025-5590',
    bankName: 'State Bank of India',
    branch: 'BHEL Kailasapuram',
    amount: 8000000, // 80 Lakh
    currency: 'INR',
    issueDate: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
    maturityDate: new Date(now.getTime() + 240 * 24 * 60 * 60 * 1000),
    depositPeriodMonths: 12,
    status: FDR_STATUS.UNDER_REVIEW,
    verificationStatus: VERIFICATION_STATUS.UNDER_REVIEW,
    docOriginalName: 'sbi_bhel_5590.pdf',
    docHash: helperHash('sbi-5590'),
    docMimeType: 'application/pdf',
    submittedBy: nittUser._id,
    complianceScore: 100
  }).save();

  // FDR 9: NITT Released Deposit
  const fdr9 = await new FDR({
    institutionId: nitt._id,
    refNumber: 'BOB-TRI-2023-7711',
    bankName: 'Bank of Baroda',
    branch: 'Thillai Nagar',
    amount: 6000000, // 60 Lakh
    currency: 'INR',
    issueDate: new Date('2023-01-10'),
    maturityDate: new Date('2025-01-10'),
    depositPeriodMonths: 24,
    status: FDR_STATUS.RELEASED,
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    docOriginalName: 'bob_thillai_7711.pdf',
    docHash: helperHash('bob-7711'),
    docMimeType: 'application/pdf',
    submittedBy: nittUser._id,
    complianceScore: 100
  }).save();

  // FDR 10: NITT Approaching Maturity in 12 days
  const fdr10Maturity = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);
  const fdr10 = await new FDR({
    institutionId: nitt._id,
    refNumber: 'IOB-TRI-2026-0099',
    bankName: 'Indian Overseas Bank',
    branch: 'Cantonment Trichy',
    amount: 4500000,
    currency: 'INR',
    issueDate: new Date(now.getTime() - 350 * 24 * 60 * 60 * 1000),
    maturityDate: fdr10Maturity,
    depositPeriodMonths: 12,
    status: FDR_STATUS.VERIFIED,
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    docOriginalName: 'iob_cantonment_0099.pdf',
    docHash: helperHash('iob-0099'),
    docMimeType: 'application/pdf',
    submittedBy: nittUser._id,
    complianceScore: 95,
    riskFlags: ['RULE_007: Maturity Threshold Alert']
  }).save();

  // FDR 11: BITS Root (Matured)
  const fdr11 = await new FDR({
    institutionId: bits._id,
    refNumber: 'ICIC-PIL-2022-7701',
    bankName: 'ICICI Bank',
    branch: 'Pilani Vidya Vihar',
    amount: 25000000, // 2.5 Cr
    currency: 'INR',
    issueDate: new Date('2022-07-01'),
    maturityDate: new Date('2024-07-01'),
    depositPeriodMonths: 24,
    status: FDR_STATUS.MATURED,
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    docOriginalName: 'icici_bits_7701.pdf',
    docHash: helperHash('icici-7701'),
    docMimeType: 'application/pdf',
    submittedBy: bitsUser._id,
    complianceScore: 100
  }).save();

  // FDR 12: BITS Renewal of FDR 11 (Verified)
  const fdr12 = await new FDR({
    institutionId: bits._id,
    refNumber: 'ICIC-PIL-2024-8890',
    bankName: 'ICICI Bank',
    branch: 'Pilani Vidya Vihar',
    amount: 28000000, // 2.8 Cr
    currency: 'INR',
    issueDate: new Date('2024-07-01'),
    maturityDate: new Date('2026-07-01'),
    depositPeriodMonths: 24,
    status: FDR_STATUS.VERIFIED,
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    parentFdrId: fdr11._id,
    docOriginalName: 'icici_bits_8890.pdf',
    docHash: helperHash('icici-8890'),
    docMimeType: 'application/pdf',
    submittedBy: bitsUser._id,
    complianceScore: 100
  }).save();

  // FDR 13: BITS Active Deposit
  const fdr13 = await new FDR({
    institutionId: bits._id,
    refNumber: 'SBI-PIL-2025-1102',
    bankName: 'State Bank of India',
    branch: 'Pilani CEERI Campus',
    amount: 10000000, // 1.0 Cr
    currency: 'INR',
    issueDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    maturityDate: new Date(now.getTime() + 630 * 24 * 60 * 60 * 1000),
    depositPeriodMonths: 24,
    status: FDR_STATUS.VERIFIED,
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    docOriginalName: 'sbi_ceeri_1102.pdf',
    docHash: helperHash('sbi-1102'),
    docMimeType: 'application/pdf',
    submittedBy: bitsUser._id,
    complianceScore: 100
  }).save();

  // FDR 14: BITS Newly Submitted
  const fdr14 = await new FDR({
    institutionId: bits._id,
    refNumber: 'UTIB-JHJ-2026-6641',
    bankName: 'Axis Bank',
    branch: 'Jhunjhunu District Road',
    amount: 7500000, // 75 Lakh
    currency: 'INR',
    issueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    maturityDate: new Date(now.getTime() + 360 * 24 * 60 * 60 * 1000),
    depositPeriodMonths: 12,
    status: FDR_STATUS.SUBMITTED,
    verificationStatus: VERIFICATION_STATUS.PENDING,
    docOriginalName: 'axis_bits_6641.pdf',
    docHash: helperHash('axis-6641'),
    docMimeType: 'application/pdf',
    submittedBy: bitsUser._id,
    complianceScore: 100
  }).save();

  // FDR 15: BITS Rejected Deposit (Due to Date Inconsistency / Invalid Amount)
  const fdr15 = await new FDR({
    institutionId: bits._id,
    refNumber: 'UBIN-PIL-2025-9922',
    bankName: 'Union Bank of India',
    branch: 'Pilani Town Branch',
    amount: 2000000,
    currency: 'INR',
    issueDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    maturityDate: new Date(now.getTime() + 330 * 24 * 60 * 60 * 1000),
    depositPeriodMonths: 12,
    status: FDR_STATUS.REJECTED,
    verificationStatus: VERIFICATION_STATUS.REJECTED,
    docOriginalName: 'union_bank_9922.pdf',
    docHash: helperHash('union-9922'),
    docMimeType: 'application/pdf',
    submittedBy: bitsUser._id,
    complianceScore: 60,
    riskFlags: ['RULE_008: Document Hash Mismatch']
  }).save();

  const allFdrs = [fdr1, fdr2, fdr3, fdr4, fdr5, fdr6, fdr7, fdr8, fdr9, fdr10, fdr11, fdr12, fdr13, fdr14, fdr15];

  // 4. Create RenewalOrReplacement Records
  console.log('[Seed] Seeding Renewal records...');
  await Promise.all([
    new RenewalOrReplacement({
      fdrId: fdr2._id,
      previousFdrId: fdr1._id,
      type: RENEWAL_TYPE.RENEWAL,
      institutionId: iitd._id,
      status: RENEWAL_STATUS.APPROVED,
      submittedBy: iitdUser._id,
      approvedBy: officerSharma._id,
      notes: 'Consecutive biennial renewal approved.'
    }).save(),
    new RenewalOrReplacement({
      fdrId: fdr3._id,
      previousFdrId: fdr2._id,
      type: RENEWAL_TYPE.RENEWAL,
      institutionId: iitd._id,
      status: RENEWAL_STATUS.PENDING,
      submittedBy: iitdUser._id,
      notes: 'Pre-emptive renewal ahead of 18-day maturity window.'
    }).save(),
    new RenewalOrReplacement({
      fdrId: fdr7._id,
      previousFdrId: fdr6._id,
      type: RENEWAL_TYPE.RENEWAL,
      institutionId: nitt._id,
      status: RENEWAL_STATUS.APPROVED,
      submittedBy: nittUser._id,
      approvedBy: officerVerma._id,
      notes: 'Triennial endowment guarantee renewal verified and approved.'
    }).save(),
    new RenewalOrReplacement({
      fdrId: fdr12._id,
      previousFdrId: fdr11._id,
      type: RENEWAL_TYPE.RENEWAL,
      institutionId: bits._id,
      status: RENEWAL_STATUS.APPROVED,
      submittedBy: bitsUser._id,
      approvedBy: officerSharma._id,
      notes: 'Deposit increased from ₹2.5 Cr to ₹2.8 Cr upon renewal.'
    }).save()
  ]);

  // 5. Create ReleaseRequest Records
  console.log('[Seed] Seeding Release request records...');
  await Promise.all([
    new ReleaseRequest({
      fdrId: fdr9._id,
      institutionId: nitt._id,
      requestedBy: nittUser._id,
      reason: 'Completion of 10-year accreditation guarantee obligation with full clearance.',
      status: RELEASE_STATUS.RELEASED,
      amount: 6000000,
      officerId: officerSharma._id,
      officerDecision: RELEASE_STATUS.RELEASED,
      decisionAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      decisionNotes: 'All statutory compliances verified. Refund release sanctioned.',
      documents: [{ docPath: 'uploads/nitt_release_clearance.pdf', docHash: helperHash('rel-9'), docOriginalName: 'clearance.pdf' }]
    }).save(),
    new ReleaseRequest({
      fdrId: fdr4._id,
      institutionId: iitd._id,
      requestedBy: iitdUser._id,
      reason: 'Course expansion guarantee fulfilled; security deposit release requested.',
      status: RELEASE_STATUS.PENDING,
      amount: 5000000,
      documents: []
    }).save()
  ]);

  // 6. Create VerificationCases, Findings, Passports & Audit Trails
  console.log('[Seed] Generating verification cases, passports, and chained audit trails...');

  for (const fdr of allFdrs) {
    // Record initial submission audit event
    const submitAudit = await recordAuditEvent(
      'FDR',
      fdr._id,
      fdr.submittedBy,
      ROLES.INSTITUTION,
      'FDR_SUBMITTED',
      { refNumber: fdr.refNumber, amount: fdr.amount, bankName: fdr.bankName }
    );

    // Create Verification Case
    let caseStatus = CASE_STATUS.OPEN;
    let decision = null;
    let decisionNotes = '';

    if (fdr.status === FDR_STATUS.VERIFIED || fdr.status === FDR_STATUS.MATURED || fdr.status === FDR_STATUS.RELEASED) {
      caseStatus = CASE_STATUS.DECIDED;
      decision = FDR_STATUS.VERIFIED;
      decisionNotes = 'Deposit certificate verified against issuing branch records.';
    } else if (fdr.status === FDR_STATUS.REJECTED) {
      caseStatus = CASE_STATUS.DECIDED;
      decision = FDR_STATUS.REJECTED;
      decisionNotes = 'Cryptographic document integrity check failed.';
    } else if (fdr.status === FDR_STATUS.CLARIFICATION_REQUIRED) {
      caseStatus = CASE_STATUS.CLARIFICATION_SENT;
      decision = FDR_STATUS.CLARIFICATION_REQUIRED;
      decisionNotes = 'Clarification requested regarding stated deposit term discrepancy.';
    } else if (fdr.status === FDR_STATUS.UNDER_REVIEW) {
      caseStatus = CASE_STATUS.IN_REVIEW;
    }

    const priority = fdr.complianceScore < 80 ? CASE_PRIORITY.HIGH : CASE_PRIORITY.NORMAL;
    const vCase = new VerificationCase({
      fdrId: fdr._id,
      assignedTo: officerSharma._id,
      status: caseStatus,
      priority,
      findings: [],
      decision,
      decisionAt: decision ? new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) : null,
      decisionNotes
    });
    await vCase.save();

    // Generate finding if flagged
    const caseFindingIds = [];
    if (fdr.status === FDR_STATUS.CLARIFICATION_REQUIRED) {
      const finding = await new VerificationFinding({
        caseId: vCase._id,
        fdrId: fdr._id,
        rule: 'RULE_009',
        severity: FINDING_SEVERITY.MEDIUM,
        category: FINDING_CATEGORY.DATE_SEQUENCE,
        description: 'Stated deposit period does not match calendar difference between issue and maturity.',
        evidence: { field: 'depositPeriodMonths', value: 12, expected: 10 },
        suggestedAction: 'Obtain updated bank certificate clarifying actual deposit term.',
        officerReviewRequired: true
      }).save();
      caseFindingIds.push(finding._id);
    } else if (fdr.status === FDR_STATUS.REJECTED) {
      const finding = await new VerificationFinding({
        caseId: vCase._id,
        fdrId: fdr._id,
        rule: 'RULE_008',
        severity: FINDING_SEVERITY.CRITICAL,
        category: FINDING_CATEGORY.DOCUMENT,
        description: 'Cryptographic SHA-256 document checksum mismatch with uploaded PDF certificate.',
        evidence: { field: 'docHash', value: 'mismatch', expected: fdr.docHash },
        suggestedAction: 'Require re-submission of authentic uncompressed bank receipt PDF.',
        officerReviewRequired: true
      }).save();
      caseFindingIds.push(finding._id);
    }

    if (caseFindingIds.length > 0) {
      vCase.findings = caseFindingIds;
      await vCase.save();
    }

    // Create Verification Passport
    const passport = await createPassport(vCase._id, fdr._id);

    // If case has decision, append decision to passport
    if (decision) {
      const caseAudit = await recordAuditEvent(
        'VerificationCase',
        vCase._id,
        officerSharma._id,
        ROLES.OFFICER,
        'CASE_DECISION_RECORDED',
        { decision, decisionNotes, fdrId: fdr._id }
      );

      await appendDecision(passport._id, {
        actor: officerSharma._id,
        actorRole: ROLES.OFFICER,
        decision,
        notes: decisionNotes,
        auditEventId: caseAudit._id,
        auditEventHash: caseAudit.currentHash
      });
    }
  }

  console.log('[Seed] Seeding completed successfully!');
  console.log('===========================================================');
  console.log('Institutions created: 3');
  console.log('Users created:');
  console.log('  Admin:       admin@fdrsentinel.gov.in / Admin@123');
  console.log('  Officer 1:   officer.sharma@fdrsentinel.gov.in / Officer@123');
  console.log('  Officer 2:   officer.verma@fdrsentinel.gov.in / Officer@123');
  console.log('  IIT Delhi:   registrar@iitd.ac.in / Inst@123');
  console.log('  NIT Trichy:  registrar@nitt.edu / Inst@123');
  console.log('  BITS Pilani: finance@bits-pilani.ac.in / Inst@123');
  console.log('FDR Instruments: 15 (covers lineages, approaching maturity, releases)');
  console.log('Verification Cases & Passports: 15');
  console.log('===========================================================');

  await mongoose.disconnect();
  console.log('[Seed] Disconnected from database.');
  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error('[Seed] Error seeding database:', err);
  process.exit(1);
});
