function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
}

// For asynchronous errors, we can use asyncWrapper (see utils/asyncWrapper.js)
// But we'll keep this simple for now.

export { errorHandler };

export default {
  errorHandler
};

