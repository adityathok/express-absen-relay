'use strict';

/**
 * Update a dashboard user's password.
 *
 * Usage:
 *   npm run reset-password -- <username> <newPassword>
 */

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const userModel = require('../models/userModel');

const SALT_ROUNDS = 10;
const MIN_LENGTH = 8;

async function main() {
  const [, , username, password] = process.argv;

  if (!username || !password) {
    console.error('Usage: npm run reset-password -- <username> <newPassword>');
    process.exit(1);
  }

  if (password.length < MIN_LENGTH) {
    console.error(`Password must be at least ${MIN_LENGTH} characters.`);
    process.exit(1);
  }

  const user = await userModel.findByUsername(username);
  if (!user) {
    console.error(`User "${username}" not found.`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  await userModel.updatePassword(user.id, hash);
  console.log(`Password updated for "${username}".`);
}

main()
  .catch((error) => {
    console.error('Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => db.close().catch(() => {}));
