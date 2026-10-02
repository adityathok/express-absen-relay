'use strict';

const config = require('../config');
const deviceModel = require('../models/deviceModel');
const appModel = require('../models/appModel');

/**
 * Render the API documentation page. Registered devices and target apps are
 * loaded so the examples can use real (but non-sensitive) values.
 */
async function index(req, res, next) {
  try {
    const [devices, apps] = await Promise.all([
      deviceModel.findAllActive(),
      appModel.findAllActive(),
    ]);

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.render('docs/index', {
      title: 'Dokumentasi API',
      active: 'docs',
      baseUrl,
      host: req.hostname,
      port: config.port,
      devices,
      apps,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { index };
