'use strict';

const db = require('../config/database');
const { resolvePagination, paginated } = require('../config/helpers');

const BASE_SELECT = `
  SELECT f.id,
         f.attendance_log_id,
         f.app_id,
         f.status,
         f.http_code,
         f.response_body,
         f.retry_count,
         f.last_attempt_at,
         f.next_retry_at,
         f.created_at,
         f.updated_at,
         a.app_name,
         al.device_sn,
         al.user_id_finger,
         al.timestamp AS attendance_time
  FROM forward_logs f
  JOIN apps a ON a.id = f.app_id
  JOIN attendance_logs al ON al.id = f.attendance_log_id
`;

async function createMany(attendanceLogId, apps) {
  if (!apps.length) return;

  // Build explicit placeholders: mysql2 `execute()` does not support the
  // `VALUES ?` bulk-expansion syntax.
  const placeholders = apps.map(() => '(?, ?)').join(', ');
  const params = apps.flatMap((app) => [attendanceLogId, app.id]);

  await db.query(
    `INSERT INTO forward_logs (attendance_log_id, app_id) VALUES ${placeholders}`,
    params
  );
}

async function listByAttendance(attendanceLogId) {
  return db.query(
    `SELECT f.*, a.app_name, a.webhook_url
     FROM forward_logs f JOIN apps a ON a.id = f.app_id
     WHERE f.attendance_log_id = ? ORDER BY f.id ASC`,
    [attendanceLogId]
  );
}

async function findById(id) {
  const rows = await db.query(`${BASE_SELECT} WHERE f.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function list({ status = '', appId = '', search = '', page = 1, perPage = 20 } = {}) {
  const where = [];
  const params = [];

  if (status) {
    where.push('f.status = ?');
    params.push(status);
  }
  if (appId) {
    where.push('f.app_id = ?');
    params.push(appId);
  }
  if (search) {
    where.push('(al.device_sn LIKE ? OR al.user_id_finger LIKE ? OR a.app_name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pagination = resolvePagination({ page, perPage });

  const [{ total }] = await db.query(
    `SELECT COUNT(*) AS total
     FROM forward_logs f
     JOIN apps a ON a.id = f.app_id
     JOIN attendance_logs al ON al.id = f.attendance_log_id
     ${whereSql}`,
    params
  );
  const rows = await db.query(
    `${BASE_SELECT} ${whereSql} ORDER BY f.id DESC LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    params
  );

  return paginated(rows, total, pagination);
}

async function updateResult(id, { status, http_code = null, response_body = null, retry_count, next_retry_at = null }) {
  await db.query(
    `UPDATE forward_logs
     SET status = ?, http_code = ?, response_body = ?, retry_count = ?, last_attempt_at = NOW(), next_retry_at = ?
     WHERE id = ?`,
    [status, http_code, response_body, retry_count, next_retry_at, id]
  );
}

/**
 * Failed rows that are still eligible for an automatic retry.
 */
async function findDueForRetry(maxRetry, limit = 50) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 50);
  return db.query(
    `SELECT f.id, f.attendance_log_id, f.app_id, f.retry_count
     FROM forward_logs f
     WHERE f.status = 'FAILED'
       AND f.retry_count < ?
       AND (f.next_retry_at IS NULL OR f.next_retry_at <= NOW())
     ORDER BY f.id ASC
     LIMIT ${safeLimit}`,
    [maxRetry]
  );
}

async function countByStatus() {
  const rows = await db.query(
    `SELECT
        SUM(status = 'SUCCESS') AS success,
        SUM(status = 'FAILED')  AS failed,
        SUM(status = 'PENDING') AS pending
     FROM forward_logs`
  );
  const stats = rows[0] || {};
  return {
    success: Number(stats.success || 0),
    failed: Number(stats.failed || 0),
    pending: Number(stats.pending || 0),
  };
}

module.exports = {
  createMany,
  listByAttendance,
  findById,
  list,
  updateResult,
  findDueForRetry,
  countByStatus,
};
