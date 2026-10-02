'use strict';

const db = require('../config/database');
const { resolvePagination, paginated } = require('../config/helpers');

async function list({ search = '', status = '', page = 1, perPage = 15 } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(sn LIKE ? OR name LIKE ? OR location LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pagination = resolvePagination({ page, perPage });

  const [{ total }] = await db.query(
    `SELECT COUNT(*) AS total FROM devices ${whereSql}`,
    params
  );
  const rows = await db.query(
    `SELECT * FROM devices ${whereSql} ORDER BY created_at DESC LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    params
  );

  return paginated(rows, total, pagination);
}

async function findAllActive() {
  return db.query("SELECT * FROM devices WHERE status = 'ACTIVE' ORDER BY name ASC");
}

async function findById(id) {
  const rows = await db.query('SELECT * FROM devices WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findBySn(sn) {
  const rows = await db.query('SELECT * FROM devices WHERE sn = ? LIMIT 1', [sn]);
  return rows[0] || null;
}

async function create({ sn, name, ip_address, location, status }) {
  const result = await db.query(
    'INSERT INTO devices (sn, name, ip_address, location, status) VALUES (?, ?, ?, ?, ?)',
    [sn, name, ip_address || null, location || null, status || 'ACTIVE']
  );
  return result.insertId;
}

async function update(id, { sn, name, ip_address, location, status }) {
  await db.query(
    'UPDATE devices SET sn = ?, name = ?, ip_address = ?, location = ?, status = ? WHERE id = ?',
    [sn, name, ip_address || null, location || null, status || 'ACTIVE', id]
  );
}

async function remove(id) {
  await db.query('DELETE FROM devices WHERE id = ?', [id]);
}

async function touchLastSeen(sn, ipAddress) {
  await db.query(
    'UPDATE devices SET last_seen_at = NOW(), ip_address = COALESCE(?, ip_address) WHERE sn = ?',
    [ipAddress || null, sn]
  );
}

async function countActive() {
  const rows = await db.query("SELECT COUNT(*) AS total FROM devices WHERE status = 'ACTIVE'");
  return rows[0].total;
}

async function countAll() {
  const rows = await db.query('SELECT COUNT(*) AS total FROM devices');
  return rows[0].total;
}

module.exports = {
  list,
  findAllActive,
  findById,
  findBySn,
  create,
  update,
  remove,
  touchLastSeen,
  countActive,
  countAll,
};
