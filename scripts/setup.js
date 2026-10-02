'use strict';

/**
 * Bootstrap script:
 *   1. Creates the database if it does not exist.
 *   2. Applies `database/schema.sql`.
 *   3. Seeds the default dashboard admin (from .env) when no user exists.
 *
 * Usage: npm run setup
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('../config');

const SALT_ROUNDS = 10;

async function main() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const rootConnection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });

  try {
    console.log(`[setup] Creating database \`${config.db.database}\` if not exists...`);
    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
    );

    await rootConnection.changeUser({ database: config.db.database });

    console.log('[setup] Applying schema...');
    await rootConnection.query(schema);

    const [rows] = await rootConnection.query('SELECT COUNT(*) AS total FROM users');
    if (rows[0].total === 0) {
      const hash = await bcrypt.hash(config.admin.password, SALT_ROUNDS);
      await rootConnection.query('INSERT INTO users (username, password) VALUES (?, ?)', [
        config.admin.username,
        hash,
      ]);
      console.log(`[setup] Seeded admin user "${config.admin.username}" (change the password after login).`);
    } else {
      console.log('[setup] Users already exist, skipping admin seed.');
    }

    console.log('[setup] Done.');
  } finally {
    await rootConnection.end();
  }
}

main().catch((error) => {
  console.error('[setup] Failed:', error.message);
  process.exit(1);
});
