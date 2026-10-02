'use strict';

const db = require('../config/database');

const BASE_SELECT = `
  SELECT m.id,
         m.device_id,
         m.app_id,
         m.created_at,
         d.sn AS device_sn,
         d.name AS device_name,
         d.status AS device_status,
         a.app_name,
         a.webhook_url,
         a.status AS app_status
  FROM device_app_mappings m
  JOIN devices d ON d.id = m.device_id
  JOIN apps a ON a.id = m.app_id
`;

async function listAll({ search = '' } = {}) {
  const params = [];
  let whereSql = '';

  if (search) {
    whereSql = 'WHERE d.sn LIKE ? OR d.name LIKE ? OR a.app_name LIKE ?';
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  return db.query(`${BASE_SELECT} ${whereSql} ORDER BY m.created_at DESC`, params);
}

async function findById(id) {
  const rows = await db.query(`${BASE_SELECT} WHERE m.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function findDuplicate(deviceId, appId) {
  const rows = await db.query(
    'SELECT id FROM device_app_mappings WHERE device_id = ? AND app_id = ? LIMIT 1',
    [deviceId, appId]
  );
  return rows[0] || null;
}

async function create({ device_id, app_id }) {
  const result = await db.query(
    'INSERT INTO device_app_mappings (device_id, app_id) VALUES (?, ?)',
    [device_id, app_id]
  );
  return result.insertId;
}

async function remove(id) {
  await db.query('DELETE FROM device_app_mappings WHERE id = ?', [id]);
}

/**
 * Return the active target apps for a device serial number.
 * Used by the relay to decide where to forward an incoming attendance log.
 */
async function findActiveAppsByDeviceSn(sn) {
  return db.query(
    `SELECT a.id, a.app_name, a.webhook_url, a.secret_key
     FROM device_app_mappings m
     JOIN devices d ON d.id = m.device_id
     JOIN apps a ON a.id = m.app_id
     WHERE d.sn = ? AND d.status = 'ACTIVE' AND a.status = 'ACTIVE'`,
    [sn]
  );
}

async function countAll() {
  const rows = await db.query('SELECT COUNT(*) AS total FROM device_app_mappings');
  return rows[0].total;
}

module.exports = {
  listAll,
  findById,
  findDuplicate,
  create,
  remove,
  findActiveAppsByDeviceSn,
  countAll,
};
