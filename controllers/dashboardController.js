'use strict';

const deviceModel = require('../models/deviceModel');
const appModel = require('../models/appModel');
const mappingModel = require('../models/mappingModel');
const attendanceLogModel = require('../models/attendanceLogModel');
const forwardLogModel = require('../models/forwardLogModel');

async function index(req, res, next) {
  try {
    const [attendanceStats, forwardStats, activeDevices, totalDevices, totalApps, totalMappings, latestLogs] =
      await Promise.all([
        attendanceLogModel.statsToday(),
        forwardLogModel.countByStatus(),
        deviceModel.countActive(),
        deviceModel.countAll(),
        appModel.countAll(),
        mappingModel.countAll(),
        attendanceLogModel.latest(10),
      ]);

    res.render('dashboard', {
      title: 'Dashboard',
      active: 'dashboard',
      attendanceStats,
      forwardStats,
      activeDevices,
      totalDevices,
      totalApps,
      totalMappings,
      latestLogs,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { index };
