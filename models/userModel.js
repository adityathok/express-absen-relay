'use strict';

const db = require('../config/database');

const SELECTABLE = 'id, username, created_at';

async function findByUsername(username) {
  const rows = await db.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] || null;
}

async function findById(id) {
  const rows = await db.query(`SELECT ${SELECTABLE} FROM users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function create({ username, password }) {
  const result = await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [
    username,
    password,
  ]);
  return result.insertId;
}

async function updateUsername(id, username) {
  await db.query('UPDATE users SET username = ? WHERE id = ?', [username, id]);
}

async function updatePassword(id, password) {
  await db.query('UPDATE users SET password = ? WHERE id = ?', [password, id]);
}

async function count() {
  const rows = await db.query('SELECT COUNT(*) AS total FROM users');
  return rows[0].total;
}

module.exports = { findByUsername, findById, create, updateUsername, updatePassword, count };
