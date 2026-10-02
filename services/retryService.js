'use strict';

const cron = require('node-cron');
const config = require('../config');
const forwardLogModel = require('../models/forwardLogModel');
const forwardService = require('./forwardService');

let task = null;

/**
 * Find failed forward rows that are due and retry them one by one.
 */
async function runDueRetries() {
  try {
    const rows = await forwardLogModel.findDueForRetry(config.relay.maxRetry);

    if (!rows.length) return;

    console.log(`[retry] Retrying ${rows.length} failed forward log(s)...`);

    const affectedAttendances = new Set();
    for (const row of rows) {
      // Sequential to avoid hammering a target that is still down.
      await forwardService.retryForward(row.id);
      affectedAttendances.add(row.attendance_log_id);
    }

    for (const attendanceId of affectedAttendances) {
      await forwardService.recomputeAttendanceStatus(attendanceId);
    }
  } catch (error) {
    console.error('[retry] scheduled retry failed:', error.message);
  }
}

function start() {
  if (task) return;

  if (!cron.validate(config.relay.retryCron)) {
    console.error(`[retry] Invalid RELAY_RETRY_CRON "${config.relay.retryCron}", scheduler disabled.`);
    return;
  }

  task = cron.schedule(config.relay.retryCron, runDueRetries);
  console.log(`[retry] Scheduler started (cron: ${config.relay.retryCron}, max retry: ${config.relay.maxRetry}).`);
}

function stop() {
  if (task) {
    task.stop();
    task = null;
  }
}

module.exports = { start, stop, runDueRetries };
