const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Missing or malformed authorization token.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Token not provided.'
      });
    }

    const secret = process.env.JWT_SECRET || 'fdr_sentinel_super_secret_jwt_key_2026_backend_production';
    const decoded = jwt.verify(token, secret);

    req.user = {
      id: decoded.id,
      _id: decoded.id,
      role: decoded.role,
      institutionId: decoded.institutionId || null,
      email: decoded.email,
      name: decoded.name
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Authorization token has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid authorization token.'
    });
  }
};

module.exports = auth;
