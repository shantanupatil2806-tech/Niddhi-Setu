/**
 * Centralized Application Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || undefined;

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Failed';
    details = Object.keys(err.errors).map((key) => ({
      field: key,
      message: err.errors[key].message
    }));
  }

  // Handle Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}': ${err.value}`;
  }

  // Handle MongoDB Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedFields = Object.keys(err.keyValue || {});
    message = `Duplicate field value: ${duplicatedFields.join(', ')} already exists in the database.`;
    details = err.keyValue;
  }

  // Handle Multer Upload Errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file exceeds the maximum permitted size limit of 10MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded in a single request.';
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Handle JsonWebToken Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token signature.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please authenticate again.';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details ? { details } : {})
  });
};

module.exports = errorHandler;
