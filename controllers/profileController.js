'use strict';

const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const { validateProfileInput, validatePasswordInput } = require('../middleware/validate');

const SALT_ROUNDS = 10;

/**
 * Render the profile page, restoring the active tab and any validation errors
 * so a failed submit keeps the user on the form they were editing.
 */
function renderProfile(req, res, options = {}) {
  const {
    status = 200,
    profileErrors = [],
    passwordErrors = [],
    form = { username: req.user.username },
    openTab = 'profile',
  } = options;

  return res.status(status).render('profile/index', {
    title: 'Profil Saya',
    active: 'profile',
    user: req.user,
    profileErrors,
    passwordErrors,
    form,
    openTab,
  });
}

function show(req, res) {
  renderProfile(req, res);
}

async function updateProfile(req, res, next) {
  const { valid, errors, data } = validateProfileInput(req.body);

  try {
    if (valid && data.username !== req.user.username) {
      const existing = await userModel.findByUsername(data.username);
      if (existing && String(existing.id) !== String(req.user.id)) {
        errors.push('Username sudah dipakai pengguna lain.');
      }
    }

    if (errors.length) {
      return renderProfile(req, res, {
        status: 422,
        profileErrors: errors,
        form: { username: data.username },
      });
    }

    if (data.username !== req.user.username) {
      await userModel.updateUsername(req.user.id, data.username);
      req.session.username = data.username;
    }

    req.flash('success', 'Profil berhasil diperbarui.');
    return res.redirect('/admin/profile');
  } catch (error) {
    return next(error);
  }
}

async function updatePassword(req, res, next) {
  const { errors, data } = validatePasswordInput(req.body);

  try {
    if (!errors.length) {
      const user = await userModel.findByUsername(req.user.username);
      const matches = user ? await bcrypt.compare(data.current_password, user.password) : false;
      if (!matches) errors.push('Password saat ini salah.');
    }

    if (errors.length) {
      return renderProfile(req, res, {
        status: 422,
        passwordErrors: errors,
        openTab: 'password',
      });
    }

    const hash = await bcrypt.hash(data.new_password, SALT_ROUNDS);
    await userModel.updatePassword(req.user.id, hash);

    // Start a fresh session so credentials bound to the old password are dropped.
    return req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = req.user.id;
      req.session.username = req.user.username;
      req.flash('success', 'Password berhasil diubah.');
      return res.redirect('/admin/profile');
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { show, updateProfile, updatePassword };
