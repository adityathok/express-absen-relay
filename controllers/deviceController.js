'use strict';

const deviceModel = require('../models/deviceModel');
const { validateDeviceInput } = require('../middleware/validate');

async function index(req, res, next) {
  try {
    const { search = '', status = '', page = 1 } = req.query;
    const result = await deviceModel.list({ search, status, page, perPage: 15 });

    res.render('devices/index', {
      title: 'Manajemen Mesin',
      active: 'devices',
      ...result,
      filters: { search, status },
    });
  } catch (error) {
    next(error);
  }
}

function create(req, res) {
  res.render('devices/form', {
    title: 'Tambah Mesin',
    active: 'devices',
    device: { sn: '', name: '', ip_address: '', location: '', status: 'ACTIVE' },
    errors: [],
    action: '/admin/devices',
    method: 'POST',
  });
}

async function store(req, res, next) {
  const { valid, errors, data } = validateDeviceInput(req.body);

  try {
    if (valid) {
      const existing = await deviceModel.findBySn(data.sn);
      if (existing) errors.push('Serial number sudah terdaftar.');
    }

    if (errors.length) {
      return res.status(422).render('devices/form', {
        title: 'Tambah Mesin',
        active: 'devices',
        device: data,
        errors,
        action: '/admin/devices',
        method: 'POST',
      });
    }

    await deviceModel.create(data);
    req.flash('success', `Mesin "${data.name}" berhasil ditambahkan.`);
    return res.redirect('/admin/devices');
  } catch (error) {
    return next(error);
  }
}

async function edit(req, res, next) {
  try {
    const device = await deviceModel.findById(req.params.id);
    if (!device) {
      req.flash('error', 'Mesin tidak ditemukan.');
      return res.redirect('/admin/devices');
    }

    return res.render('devices/form', {
      title: 'Edit Mesin',
      active: 'devices',
      device,
      errors: [],
      action: `/admin/devices/${device.id}?_method=PUT`,
      method: 'POST',
    });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  const { id } = req.params;
  const { valid, errors, data } = validateDeviceInput(req.body);

  try {
    const device = await deviceModel.findById(id);
    if (!device) {
      req.flash('error', 'Mesin tidak ditemukan.');
      return res.redirect('/admin/devices');
    }

    if (valid) {
      const existing = await deviceModel.findBySn(data.sn);
      if (existing && String(existing.id) !== String(id)) {
        errors.push('Serial number sudah dipakai mesin lain.');
      }
    }

    if (errors.length) {
      return res.status(422).render('devices/form', {
        title: 'Edit Mesin',
        active: 'devices',
        device: { ...data, id },
        errors,
        action: `/admin/devices/${id}?_method=PUT`,
        method: 'POST',
      });
    }

    await deviceModel.update(id, data);
    req.flash('success', `Mesin "${data.name}" berhasil diperbarui.`);
    return res.redirect('/admin/devices');
  } catch (error) {
    return next(error);
  }
}

async function destroy(req, res, next) {
  try {
    await deviceModel.remove(req.params.id);
    req.flash('success', 'Mesin berhasil dihapus.');
    res.redirect('/admin/devices');
  } catch (error) {
    next(error);
  }
}

module.exports = { index, create, store, edit, update, destroy };
