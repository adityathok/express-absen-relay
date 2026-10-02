'use strict';

const attendanceLogModel = require('../models/attendanceLogModel');
const forwardLogModel = require('../models/forwardLogModel');
const deviceModel = require('../models/deviceModel');
const appModel = require('../models/appModel');
const forwardService = require('../services/forwardService');

async function attendanceIndex(req, res, next) {
  try {
    const { device_sn = '', status = '', user = '', dateFrom = '', dateTo = '', page = 1 } = req.query;
    const [result, devices] = await Promise.all([
      attendanceLogModel.list({ device_sn, status, user, dateFrom, dateTo, page, perPage: 20 }),
      deviceModel.findAllActive(),
    ]);

    res.render('logs/attendance', {
      title: 'Log Absensi',
      active: 'logs-attendance',
      ...result,
      devices,
      filters: { device_sn, status, user, dateFrom, dateTo },
    });
  } catch (error) {
    next(error);
  }
}

async function attendanceShow(req, res, next) {
  try {
    const log = await attendanceLogModel.findById(req.params.id);
    if (!log) {
      req.flash('error', 'Log absensi tidak ditemukan.');
      return res.redirect('/admin/attendance-logs');
    }

    const forwards = await forwardLogModel.listByAttendance(log.id);
    return res.render('logs/attendance-show', {
      title: `Detail Log #${log.id}`,
      active: 'logs-attendance',
      log,
      forwards,
    });
  } catch (error) {
    return next(error);
  }
}

async function forwardIndex(req, res, next) {
  try {
    const { status = '', appId = '', search = '', page = 1 } = req.query;
    const [result, apps] = await Promise.all([
      forwardLogModel.list({ status, appId, search, page, perPage: 20 }),
      appModel.findAllActive(),
    ]);

    res.render('logs/forward', {
      title: 'Log Pengiriman',
      active: 'logs-forward',
      ...result,
      apps,
      filters: { status, appId, search },
    });
  } catch (error) {
    next(error);
  }
}

async function retryForward(req, res, next) {
  try {
    const ok = await forwardService.retryForward(req.params.id);
    if (ok) {
      req.flash('success', 'Pengiriman berhasil dikirim ulang.');
    } else {
      req.flash('error', 'Pengiriman ulang gagal. Silakan cek detail respons.');
    }
    return res.redirect('/admin/forward-logs');
  } catch (error) {
    return next(error);
  }
}

module.exports = { attendanceIndex, attendanceShow, forwardIndex, retryForward };
