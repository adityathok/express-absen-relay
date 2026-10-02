'use strict';

const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

function safeRedirectTarget(value) {
  // Only allow internal paths to avoid open-redirect issues.
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return '/';
}

function showLogin(req, res) {
  res.render('auth/login', {
    title: 'Login',
    error: null,
    username: '',
    next: req.query.next || '',
  });
}

async function login(req, res, next) {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  const redirectTo = safeRedirectTarget(req.body.next || req.query.next);

  const rerender = (error) =>
    res.status(401).render('auth/login', {
      title: 'Login',
      error,
      username,
      next: req.body.next || '',
    });

  if (!username || !password) {
    return rerender('Username dan password wajib diisi.');
  }

  try {
    const user = await userModel.findByUsername(username);
    const passwordMatches = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordMatches) {
      return rerender('Username atau password salah.');
    }

    // Regenerate the session id to prevent session fixation.
    return req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = user.id;
      req.session.username = user.username;
      return res.redirect(redirectTo);
    });
  } catch (error) {
    return next(error);
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
}

module.exports = { showLogin, login, logout };
