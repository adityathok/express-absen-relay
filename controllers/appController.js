'use strict';

const crypto = require('crypto');
const appModel = require('../models/appModel');
const { validateAppInput } = require('../middleware/validate');

function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

async function index(req, res, next) {
  try {
    const { search = '', status = '', page = 1 } = req.query;
    const result = await appModel.list({ search, status, page, perPage: 15 });

    res.render('apps/index', {
      title: 'Aplikasi Target',
      active: 'apps',
      ...result,
      filters: { search, status },
    });
  } catch (error) {
    next(error);
  }
}

function create(req, res) {
  res.render('apps/form', {
    title: 'Tambah Aplikasi',
    active: 'apps',
    app: { app_name: '', webhook_url: '', secret_key: generateSecret(), status: 'ACTIVE' },
    errors: [],
    action: '/admin/apps',
  });
}

async function store(req, res, next) {
  const { valid, errors, data } = validateAppInput(req.body);

  try {
    if (errors.length) {
      return res.status(422).render('apps/form', {
        title: 'Tambah Aplikasi',
        active: 'apps',
        app: data,
        errors,
        action: '/admin/apps',
      });
    }

    await appModel.create(data);
    req.flash('success', `Aplikasi "${data.app_name}" berhasil ditambahkan.`);
    return res.redirect('/admin/apps');
  } catch (error) {
    return next(error);
  }
}

async function edit(req, res, next) {
  try {
    const app = await appModel.findById(req.params.id);
    if (!app) {
      req.flash('error', 'Aplikasi tidak ditemukan.');
      return res.redirect('/admin/apps');
    }

    return res.render('apps/form', {
      title: 'Edit Aplikasi',
      active: 'apps',
      app,
      errors: [],
      action: `/admin/apps/${app.id}?_method=PUT`,
    });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  const { id } = req.params;
  const { valid, errors, data } = validateAppInput(req.body);

  try {
    if (errors.length) {
      return res.status(422).render('apps/form', {
        title: 'Edit Aplikasi',
        active: 'apps',
        app: { ...data, id },
        errors,
        action: `/admin/apps/${id}?_method=PUT`,
      });
    }

    await appModel.update(id, data);
    req.flash('success', `Aplikasi "${data.app_name}" berhasil diperbarui.`);
    return res.redirect('/admin/apps');
  } catch (error) {
    return next(error);
  }
}

async function destroy(req, res, next) {
  try {
    await appModel.remove(req.params.id);
    req.flash('success', 'Aplikasi berhasil dihapus.');
    res.redirect('/admin/apps');
  } catch (error) {
    next(error);
  }
}

async function regenerateSecret(req, res, next) {
  try {
    const app = await appModel.findById(req.params.id);
    if (!app) {
      req.flash('error', 'Aplikasi tidak ditemukan.');
      return res.redirect('/admin/apps');
    }

    const secret = generateSecret();
    await appModel.update(app.id, { ...app, secret_key: secret });
    req.flash('success', `Secret key "${app.app_name}" berhasil diregenerasi.`);
    return res.redirect('/admin/apps');
  } catch (error) {
    return next(error);
  }
}

module.exports = { index, create, store, edit, update, destroy, regenerateSecret };
