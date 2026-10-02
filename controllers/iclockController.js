'use strict';

const deviceModel = require('../models/deviceModel');
const mappingModel = require('../models/mappingModel');
const attendanceLogModel = require('../models/attendanceLogModel');
const forwardLogModel = require('../models/forwardLogModel');
const iclockService = require('../services/iclockService');
const forwardService = require('../services/forwardService');
const realtime = require('../services/realtime');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || null;
}

function text(res, statusCode, body) {
  return res.status(statusCode).type('text/plain').send(body);
}

/**
 * Validate the `SN` query parameter against registered, active devices.
 * Sends the appropriate response and returns null when validation fails.
 */
async function resolveDevice(req, res) {
  const sn = String(req.query.SN || req.query.sn || '').trim();

  if (!sn) {
    text(res, 400, 'ERROR: MISSING_SN');
    return null;
  }

  const device = await deviceModel.findBySn(sn);

  if (!device) {
    console.warn(`[iclock] Rejected push from unregistered SN: ${sn}`);
    text(res, 403, 'ERROR: DEVICE_NOT_REGISTERED');
    return null;
  }

  if (device.status !== 'ACTIVE') {
    console.warn(`[iclock] Rejected push from inactive device: ${sn}`);
    text(res, 403, 'ERROR: DEVICE_INACTIVE');
    return null;
  }

  return device;
}

/**
 * GET /iclock/cdata - handshake / heartbeat.
 */
async function handshake(req, res, next) {
  try {
    const device = await resolveDevice(req, res);
    if (!device) return;

    await deviceModel.touchLastSeen(device.sn, getClientIp(req));
    realtime.emit('device-seen', { sn: device.sn, at: new Date().toISOString() });

    return text(res, 200, iclockService.handshakeResponse(device));
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /iclock/cdata - attendance push (table=ATTLOG) and other tables.
 */
async function cdata(req, res, next) {
  try {
    const device = await resolveDevice(req, res);
    if (!device) return;

    await deviceModel.touchLastSeen(device.sn, getClientIp(req));

    const table = String(req.query.table || '').toUpperCase();
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || '');

    if (table !== 'ATTLOG') {
      // OPERLOG and other tables are acknowledged but not relayed.
      return text(res, 200, 'OK');
    }

    const records = iclockService.parseAttLog(rawBody);
    if (!records.length) {
      return text(res, 200, 'OK');
    }

    const apps = await mappingModel.findActiveAppsByDeviceSn(device.sn);
    const attendanceIds = [];

    for (const record of records) {
      const id = await attendanceLogModel.create({
        device_sn: device.sn,
        user_id_finger: record.user_id_finger,
        timestamp: record.timestamp,
        verify_mode: record.verify_mode,
        in_out_mode: record.in_out_mode,
        raw_payload: record.raw_line,
      });

      attendanceIds.push(id);

      realtime.emitAttendance({
        id,
        device_sn: device.sn,
        user_id_finger: record.user_id_finger,
        timestamp: record.timestamp,
        verify_mode: record.verify_mode,
        in_out_mode: record.in_out_mode,
        forward_status: 'PENDING',
      });
    }

    if (apps.length) {
      for (const id of attendanceIds) {
        await forwardLogModel.createMany(id, apps);
      }
    }

    // Answer the device immediately; forwarding happens detached so the
    // device never waits on a slow/offline Laravel target.
    text(res, 200, 'OK');

    setImmediate(() => {
      for (const id of attendanceIds) {
        forwardService.dispatchAttendance(id);
      }
    });

    return undefined;
  } catch (error) {
    console.error('[iclock] Failed to process push:', error.message);
    // Acknowledge anyway so the device does not stall on a transient DB error.
    if (!res.headersSent) {
      return text(res, 200, 'OK');
    }
    return next(error);
  }
}

/**
 * GET /iclock/getrequest - command poll (no outbound commands in v1).
 */
async function getRequest(req, res, next) {
  try {
    const device = await resolveDevice(req, res);
    if (!device) return;
    return text(res, 200, 'OK');
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /iclock/devicecmd - device command acknowledgement.
 */
async function deviceCmd(req, res, next) {
  try {
    const device = await resolveDevice(req, res);
    if (!device) return;
    return text(res, 200, 'OK');
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /iclock/ping - lightweight connectivity check.
 */
async function ping(req, res) {
  const sn = String(req.query.SN || req.query.sn || '').trim();
  if (sn) {
    deviceModel.touchLastSeen(sn, getClientIp(req)).catch(() => {});
  }
  return text(res, 200, 'OK');
}

module.exports = { handshake, cdata, getRequest, deviceCmd, ping };
