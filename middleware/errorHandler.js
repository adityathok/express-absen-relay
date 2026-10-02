'use strict';

const config = require('../config');

/**
 * 404 handler.
 */
function notFound(req, res) {
  res.status(404);

  if (req.accepts('html')) {
    return res.render('errors/404', { title: 'Not Found' });
  }
  return res.json({ success: false, message: 'Not found.' });
}

/**
 * Central error handler.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err.message);

  const status = err.status || err.statusCode || 500;
  res.status(status);

  if (req.accepts('html')) {
    return res.render('errors/500', {
      title: 'Terjadi Kesalahan',
      status,
      message: config.env === 'production' ? 'Terjadi kesalahan pada server.' : err.message,
    });
  }

  return res.json({
    success: false,
    message: config.env === 'production' ? 'Internal server error.' : err.message,
  });
}

module.exports = { notFound, errorHandler };
