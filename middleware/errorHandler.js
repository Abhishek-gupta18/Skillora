function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  const statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === 'production') {
    return res.status(statusCode).json({ success: false, message: 'Something went wrong' });
  }

  return res.status(statusCode).json({ success: false, message: err.message });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

// Wraps async route handlers so errors are passed to next() automatically
// instead of needing try/catch in every controller.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, notFoundHandler, asyncHandler };
