'use strict';

const crypto = require('crypto');
const config = require('../config');
const appModel = require('../models/appModel');
const deviceModel = require('../models/deviceModel');
const attendanceLogModel = require('../models/attendanceLogModel');
const forwardLogModel = require('../models/forwardLogModel');
const realtime = require('./realtime');

/**
 * Format a Date as a MySQL DATETIME string in local time.
 */
function toMysqlDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * HMAC-SHA256 signature over the raw request body, so the receiving Laravel
 * app can verify request integrity using the shared secret.
 */
function signPayload(secret, rawBody) {
  return `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

function buildPayload(attendance, device) {
  return {
    event: 'attendance.created',
    device: {
      sn: attendance.device_sn,
      name: device ? device.name : null,
      location: device ? device.location : null,
    },
    attendance: {
      id: attendance.id,
      user_id: attendance.user_id_finger,
      timestamp: attendance.timestamp,
      verify_mode: attendance.verify_mode,
      in_out_mode: attendance.in_out_mode,
    },
    received_at: attendance.created_at,
  };
}

/**
 * POST the payload to the target app. Never throws: failures are reported
 * through the resolved result object so the local log is always preserved.
 */
async function postWebhook(app, payload) {
  const rawBody = JSON.stringify(payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.relay.timeoutMs);

  try {
    const response = await fetch(app.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'express-absen-relay/1.0',
        'X-Relay-Event': payload.event,
        'X-Relay-Secret': app.secret_key,
        'X-Relay-Signature': signPayload(app.secret_key, rawBody),
      },
      body: rawBody,
      signal: controller.signal,
    });

    const text = await response.text();
    return {
      ok: response.ok,
      httpCode: String(response.status),
      body: text.slice(0, 2000),
    };
  } catch (error) {
    return {
      ok: false,
      httpCode: error.name === 'AbortError' ? 'TIMEOUT' : 'ERROR',
      body: error.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

function backoffSeconds(attempt) {
  const base = Math.max(1, config.relay.retryIntervalSeconds);
  const delay = base * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(delay, 3600); // cap at 1 hour
}

/**
 * Attempt a single forward row (one attendance x one app).
 * @returns {Promise<boolean>} true when delivered successfully.
 */
async function processForward(row, attendance) {
  const app = await appModel.findById(row.app_id);

  if (!app) {
    await forwardLogModel.updateResult(row.id, {
      status: 'FAILED',
      http_code: 'NO_APP',
      response_body: 'Target application no longer exists.',
      retry_count: row.retry_count || 0,
      next_retry_at: null,
    });
    return false;
  }

  if (app.status !== 'ACTIVE') {
    await forwardLogModel.updateResult(row.id, {
      status: 'FAILED',
      http_code: 'APP_INACTIVE',
      response_body: 'Target application is inactive.',
      retry_count: row.retry_count || 0,
      next_retry_at: null,
    });
    return false;
  }

  const device = await deviceModel.findBySn(attendance.device_sn);
  const payload = buildPayload(attendance, device);
  const result = await postWebhook(app, payload);
  const attempt = (row.retry_count || 0) + 1;

  if (result.ok) {
    await forwardLogModel.updateResult(row.id, {
      status: 'SUCCESS',
      http_code: result.httpCode,
      response_body: result.body,
      retry_count: attempt,
      next_retry_at: null,
    });
    return true;
  }

  const nextRetry = new Date(Date.now() + backoffSeconds(attempt) * 1000);
  await forwardLogModel.updateResult(row.id, {
    status: 'FAILED',
    http_code: result.httpCode,
    response_body: result.body,
    retry_count: attempt,
    next_retry_at: attempt < config.relay.maxRetry ? toMysqlDateTime(nextRetry) : null,
  });
  return false;
}

/**
 * Recompute the aggregate forward_status of an attendance log from its
 * per-target forward rows.
 */
async function recomputeAttendanceStatus(attendanceLogId) {
  const rows = await forwardLogModel.listByAttendance(attendanceLogId);

  if (!rows.length) {
    await attendanceLogModel.updateForwardStatus(attendanceLogId, 'SUCCESS', 'NO_TARGET');
    return;
  }

  const success = rows.filter((r) => r.status === 'SUCCESS').length;
  const failed = rows.filter((r) => r.status === 'FAILED').length;
  const pending = rows.filter((r) => r.status === 'PENDING').length;

  let status;
  if (pending > 0) status = 'PENDING';
  else if (success === rows.length) status = 'SUCCESS';
  else if (failed === rows.length) status = 'FAILED';
  else status = 'PARTIAL';

  const code = `S:${success} F:${failed} P:${pending}`;
  await attendanceLogModel.updateForwardStatus(attendanceLogId, status, code);
}

/**
 * Forward a freshly received attendance log to every mapped app.
 * Runs detached from the device request so the device is answered fast.
 */
async function dispatchAttendance(attendanceLogId) {
  try {
    const attendance = await attendanceLogModel.findById(attendanceLogId);
    if (!attendance) return;

    const rows = await forwardLogModel.listByAttendance(attendanceLogId);
    const pending = rows.filter((r) => r.status === 'PENDING');

    if (pending.length) {
      await Promise.all(pending.map((row) => processForward(row, attendance)));
    }

    await recomputeAttendanceStatus(attendanceLogId);
    realtime.emit('attendance-updated', { id: attendanceLogId });
  } catch (error) {
    console.error('[forward] dispatch failed:', error.message);
  }
}

/**
 * Retry a single forward row (manual button or scheduled retry).
 */
async function retryForward(forwardLogId) {
  const row = await forwardLogModel.findById(forwardLogId);
  if (!row) return false;

  const attendance = await attendanceLogModel.findById(row.attendance_log_id);
  if (!attendance) return false;

  const ok = await processForward(row, attendance);
  await recomputeAttendanceStatus(row.attendance_log_id);
  realtime.emit('attendance-updated', { id: row.attendance_log_id });
  return ok;
}

module.exports = {
  dispatchAttendance,
  retryForward,
  processForward,
  recomputeAttendanceStatus,
  toMysqlDateTime,
};
