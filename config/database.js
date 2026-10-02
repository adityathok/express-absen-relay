'use strict';

const mysql = require('mysql2/promise');
const config = require('./index');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  dateStrings: true,
  charset: 'utf8mb4_general_ci',
});

/**
 * Run a query using the shared pool.
 * @param {string} sql
 * @param {Array} [params]
 * @returns {Promise<import('mysql2').QueryResult>}
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Borrow a connection from the pool (remember to release it).
 */
function getConnection() {
  return pool.getConnection();
}

/**
 * Verify that the database is reachable.
 */
async function ping() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, getConnection, ping, close };
