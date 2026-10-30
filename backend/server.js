require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/auth');
const institutionRoutes = require('./src/routes/institutions');
const fdrRoutes = require('./src/routes/fdrs');
const verificationRoutes = require('./src/routes/verification');
const passportRoutes = require('./src/routes/passport');
const graphRoutes = require('./src/routes/graph');
const renewalRoutes = require('./src/routes/renewals');
const releaseRoutes = require('./src/routes/releases');
const dashboardRoutes = require('./src/routes/dashboard');
const reportsRoutes = require('./src/routes/reports');
const complianceRoutes = require('./src/routes/compliance');
const notificationRoutes = require('./src/routes/notifications');
const clearanceRoutes = require('./src/routes/clearance');
const { monitorDeadlinesAndEscalate } = require('./src/services/bottleneckService');

// Model references for scheduled job
const FDR = require('./src/models/FDR');
const { FDR_STATUS } = require('./src/config/constants');
const { recordAuditEvent } = require('./src/utils/audit');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allow media/uploads preview
}));

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Dev-friendly permissive CORS
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request Logger
app.use(morgan('dev'));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this client. Please retry later.'
  }
});
app.use('/api', apiLimiter);

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Document Upload Storage
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// System Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    system: 'Niddhi Setu Backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    system: 'Niddhi Setu API Gateway',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/fdrs', fdrRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/passport', passportRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/releases', releaseRoutes);
app.use('/api/release-requests', releaseRoutes); // Alias for compatibility with spec
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/clearance', clearanceRoutes);

// Scheduled Jobs: Daily Maturity Alerts and Status Transitions (Runs daily at 8:00 AM)
cron.schedule('0 8 * * *', async () => {
  console.log('[Scheduled Job] Running Daily Maturity Surveillance Scan...');
  try {
    const now = new Date();
    const threshold30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Scan for instruments approaching maturity within 30 days
    const approachingFdrs = await FDR.find({
      maturityDate: { $gte: now, $lte: threshold30Days },
      status: { $in: [FDR_STATUS.VERIFIED, FDR_STATUS.UNDER_REVIEW] }
    });

    for (const fdr of approachingFdrs) {
      const alertTag = 'APPROACHING_MATURITY_30_DAYS';
      if (!fdr.riskFlags.includes(alertTag)) {
        fdr.riskFlags.push(alertTag);
        await fdr.save();
        await recordAuditEvent(
          'FDR',
          fdr._id,
          null,
          'system',
          'MATURITY_THRESHOLD_FLAGGED',
          { maturityDate: fdr.maturityDate, daysRemaining: Math.ceil((fdr.maturityDate - now) / (1000 * 60 * 60 * 24)) }
        );
      }
    }

    // 2. Scan for instruments that have passed maturity date without renewal
    const overdueFdrs = await FDR.find({
      maturityDate: { $lt: now },
      status: FDR_STATUS.VERIFIED
    });

    for (const fdr of overdueFdrs) {
      fdr.status = FDR_STATUS.MATURED;
      if (!fdr.riskFlags.includes('MATURED_UNRENEWED')) {
        fdr.riskFlags.push('MATURED_UNRENEWED');
      }
      await fdr.save();
      await recordAuditEvent(
        'FDR',
        fdr._id,
        null,
        'system',
        'FDR_AUTO_MATURED',
        { maturityDate: fdr.maturityDate }
      );
    }

    console.log(`[Scheduled Job] Scan complete. Flagged: ${approachingFdrs.length}, Auto-matured: ${overdueFdrs.length}.`);

    // 3. Monitor Interdepartmental Clearance SLAs and trigger escalations
    console.log('[Scheduled Job] Running Clearance Orchestrator SLA Monitoring...');
    const escalatedAlerts = await monitorDeadlinesAndEscalate();
    console.log(`[Scheduled Job] Clearance SLA monitoring complete. Alerts created: ${escalatedAlerts.length}.`);
  } catch (error) {
    console.error('[Scheduled Job] Error during maturity scan:', error.message);
  }
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Serve Frontend SPA if built, or redirect root requests
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads') || req.originalUrl.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  });
}

// 404 Route Catch-All for API
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`  Niddhi Setu Backend Service running         `);
    console.log(`  Port: ${PORT} (0.0.0.0)                      `);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Local IP Check: http://192.168.1.35:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

module.exports = app;
