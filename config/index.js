'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function int(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 3331),
  sessionSecret: process.env.SESSION_SECRET || 'insecure-dev-secret-change-me',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: int(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'express_absen_relay',
    connectionLimit: int(process.env.DB_POOL_LIMIT, 10),
  },

  // Only consumed by `npm run setup` to bootstrap the first dashboard user.
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },

  relay: {
    timeoutMs: int(process.env.RELAY_TIMEOUT_MS, 10000),
    maxRetry: int(process.env.RELAY_MAX_RETRY, 5),
    retryIntervalSeconds: int(process.env.RELAY_RETRY_INTERVAL_SECONDS, 60),
    retryCron: process.env.RELAY_RETRY_CRON || '* * * * *',
  },
};

module.exports = config;
