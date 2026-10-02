'use strict';

const db = require('../config/database');
const { resolvePagination, paginated } = require('../config/helpers');

const SELECTABLE = 'id, app_name, webhook_url, secret_key, status, created_at, updated_at';

async function list({ search = '', status = '', page = 1, perPage = 15 } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(app_name LIKE ? OR webhook_url LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pagination = resolvePagination({ page, perPage });

  const [{ total }] = await db.query(`SELECT COUNT(*) AS total FROM apps ${whereSql}`, params);
  const rows = await db.query(
    `SELECT ${SELECTABLE} FROM apps ${whereSql} ORDER BY created_at DESC LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    params
  );

  return paginated(rows, total, pagination);
}

async function findAllActive() {
  return db.query("SELECT id, app_name, webhook_url, status FROM apps WHERE status = 'ACTIVE' ORDER BY app_name ASC");
}

async function findById(id) {
  const rows = await db.query(`SELECT ${SELECTABLE} FROM apps WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function create({ app_name, webhook_url, secret_key, status }) {
  const result = await db.query(
    'INSERT INTO apps (app_name, webhook_url, secret_key, status) VALUES (?, ?, ?, ?)',
    [app_name, webhook_url, secret_key, status || 'ACTIVE']
  );
  return result.insertId;
}

async function update(id, { app_name, webhook_url, secret_key, status }) {
  await db.query(
    'UPDATE apps SET app_name = ?, webhook_url = ?, secret_key = ?, status = ? WHERE id = ?',
    [app_name, webhook_url, secret_key, status || 'ACTIVE', id]
  );
}

async function remove(id) {
  await db.query('DELETE FROM apps WHERE id = ?', [id]);
}

async function countAll() {
  const rows = await db.query('SELECT COUNT(*) AS total FROM apps');
  return rows[0].total;
}

module.exports = { list, findAllActive, findById, create, update, remove, countAll };
