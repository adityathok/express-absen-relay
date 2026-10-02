'use strict';

/**
 * Minimal request logger: method, path, status and duration.
 */
function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const stamp = new Date().toISOString();
    console.log(
      `[${stamp}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs.toFixed(1)}ms)`
    );
  });

  next();
}

module.exports = { requestLogger };
