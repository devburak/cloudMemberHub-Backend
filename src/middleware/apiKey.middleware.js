const { AppError } = require('./error.middleware');

function apiKeyMiddleware(options = {}) {
  const { required = true } = options;
  const keys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];

  return (req, res, next) => {
    if (keys.length === 0) {
      return next();
    }

    const provided = req.headers['x-api-key'] || req.headers['api-key'];
    const valid = provided && keys.includes(provided);

    if (!valid && required) {
      return next(new AppError('Invalid or missing API key', 401));
    }

    return next();
  };
}

module.exports = apiKeyMiddleware;
