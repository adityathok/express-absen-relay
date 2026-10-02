'use strict';

const userModel = require('../models/userModel');

/**
 * Protect dashboard routes. Unauthenticated visitors are redirected to the
 * login page (HTML) or receive 401 (JSON/XHR).
 */
async function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const user = await userModel.findById(req.session.userId);
      if (user) {
        req.user = user;
        res.locals.currentUser = user;
        return next();
      }
    } catch (error) {
      return next(error);
    }
    req.session.destroy(() => {});
  }

  if (req.accepts('html')) {
    const target = req.originalUrl && req.originalUrl !== '/login' ? req.originalUrl : '/';
    return res.redirect(`/login?next=${encodeURIComponent(target)}`);
  }
  return res.status(401).json({ success: false, message: 'Unauthenticated.' });
}

/**
 * Prevent authenticated users from opening the login page again.
 */
function guestOnly(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  return next();
}

module.exports = { requireAuth, guestOnly };
