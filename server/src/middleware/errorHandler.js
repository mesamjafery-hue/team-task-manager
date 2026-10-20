// Centralized Error Handling Middleware
function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  console.error('⚠️ [Error Handler Caught]:', err.message);

  // PostgreSQL unique violation error code: 23505
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A resource with this information already exists.',
      error: process.env.NODE_ENV === 'development' ? err.detail : undefined,
    });
  }

  // PostgreSQL foreign key violation error code: 23503
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced entity does not exist.',
      error: process.env.NODE_ENV === 'development' ? err.detail : undefined,
    });
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload provided.',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected internal server error occurred.'
    : err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

// 404 Not Found Middleware for unhandled API endpoints
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
