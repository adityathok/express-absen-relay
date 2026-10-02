'use strict';

const rateLimit = require('express-rate-limit');

const passThrough = (req, res) => res.status(429).send('ERROR: TOO MANY REQUESTS');

/**
 * Guard the fingerprint receiver endpoint against floods. Devices push very
 * frequently, so the ceiling is generous but still bounded.
 */
const deviceLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: passThrough,
});

/**
 * Strict limiter for the login form to slow down brute-force attempts.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).render('auth/login', {
      title: 'Login',
      error: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.',
      username: '',
      next: req.query.next || '',
    }),
});

/**
 * Broad safety net applied to the whole application.
 */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Too many requests.' }),
});

module.exports = { deviceLimiter, loginLimiter, globalLimiter };
