'use strict';

const db = require('../config/database');
const { resolvePagination, paginated } = require('../config/helpers');

async function create({
  device_sn,
  user_id_finger,
  timestamp,
  verify_mode = null,
  in_out_mode = null,
  raw_payload = null,
}) {
  const result = await db.query(
    `INSERT INTO attendance_logs
       (device_sn, user_id_finger, timestamp, verify_mode, in_out_mode, raw_payload, forward_status)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
    [device_sn, user_id_finger, timestamp, verify_mode, in_out_mode, raw_payload]
  );
  return result.insertId;
}

async function findById(id) {
  const rows = await db.query('SELECT * FROM attendance_logs WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function list({
  device_sn = '',
  status = '',
  user = '',
  dateFrom = '',
  dateTo = '',
  page = 1,
  perPage = 20,
} = {}) {
  const where = [];
  const params = [];

  if (device_sn) {
    where.push('device_sn = ?');
    params.push(device_sn);
  }
  if (status) {
    where.push('forward_status = ?');
    params.push(status);
  }
  if (user) {
    where.push('user_id_finger LIKE ?');
    params.push(`%${user}%`);
  }
  if (dateFrom) {
    where.push('timestamp >= ?');
    params.push(`${dateFrom} 00:00:00`);
  }
  if (dateTo) {
    where.push('timestamp <= ?');
    params.push(`${dateTo} 23:59:59`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pagination = resolvePagination({ page, perPage });

  const [{ total }] = await db.query(
    `SELECT COUNT(*) AS total FROM attendance_logs ${whereSql}`,
    params
  );
  const rows = await db.query(
    `SELECT * FROM attendance_logs ${whereSql} ORDER BY id DESC LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    params
  );

  return paginated(rows, total, pagination);
}

async function updateForwardStatus(id, status, responseCode = null) {
  await db.query('UPDATE attendance_logs SET forward_status = ?, response_code = ? WHERE id = ?', [
    status,
    responseCode,
    id,
  ]);
}

/**
 * Aggregate counters used by the dashboard overview (today only).
 */
async function statsToday() {
  const rows = await db.query(
    `SELECT
        COUNT(*) AS total_today,
        SUM(forward_status = 'SUCCESS') AS success_today,
        SUM(forward_status = 'FAILED')  AS failed_today,
        SUM(forward_status = 'PENDING') AS pending_today,
        SUM(forward_status = 'PARTIAL') AS partial_today
     FROM attendance_logs
     WHERE DATE(created_at) = CURDATE()`
  );
  const stats = rows[0] || {};
  return {
    total_today: Number(stats.total_today || 0),
    success_today: Number(stats.success_today || 0),
    failed_today: Number(stats.failed_today || 0),
    pending_today: Number(stats.pending_today || 0),
    partial_today: Number(stats.partial_today || 0),
  };
}

async function countAll() {
  const rows = await db.query('SELECT COUNT(*) AS total FROM attendance_logs');
  return rows[0].total;
}

/**
 * Last N logs for the live dashboard feed.
 */
async function latest(limit = 10) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 10);
  return db.query(
    `SELECT id, device_sn, user_id_finger, timestamp, verify_mode, in_out_mode, forward_status, created_at
     FROM attendance_logs ORDER BY id DESC LIMIT ${safeLimit}`
  );
}

module.exports = {
  create,
  findById,
  list,
  updateForwardStatus,
  statsToday,
  countAll,
  latest,
};
