'use strict';

const mappingModel = require('../models/mappingModel');
const deviceModel = require('../models/deviceModel');
const appModel = require('../models/appModel');
const { validateMappingInput } = require('../middleware/validate');

async function index(req, res, next) {
  try {
    const { search = '' } = req.query;
    const [mappings, devices, apps] = await Promise.all([
      mappingModel.listAll({ search }),
      deviceModel.findAllActive(),
      appModel.findAllActive(),
    ]);

    res.render('mappings/index', {
      title: 'Mapping Device ke Aplikasi',
      active: 'mappings',
      mappings,
      devices,
      apps,
      filters: { search },
      errors: [],
    });
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  const { valid, errors, data } = validateMappingInput(req.body);

  try {
    if (valid) {
      const duplicate = await mappingModel.findDuplicate(data.device_id, data.app_id);
      if (duplicate) errors.push('Mapping device ke aplikasi tersebut sudah ada.');
    }

    if (errors.length) {
      const [mappings, devices, apps] = await Promise.all([
        mappingModel.listAll({ search: '' }),
        deviceModel.findAllActive(),
        appModel.findAllActive(),
      ]);

      return res.status(422).render('mappings/index', {
        title: 'Mapping Device ke Aplikasi',
        active: 'mappings',
        mappings,
        devices,
        apps,
        filters: { search: '' },
        errors,
      });
    }

    await mappingModel.create(data);
    req.flash('success', 'Mapping berhasil ditambahkan.');
    return res.redirect('/admin/mappings');
  } catch (error) {
    return next(error);
  }
}

async function destroy(req, res, next) {
  try {
    await mappingModel.remove(req.params.id);
    req.flash('success', 'Mapping berhasil dihapus.');
    res.redirect('/admin/mappings');
  } catch (error) {
    next(error);
  }
}

module.exports = { index, store, destroy };
