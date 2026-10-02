'use strict';

const express = require('express');
const controller = require('../controllers/authController');
const { guestOnly, requireAuth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/login', guestOnly, controller.showLogin);
router.post('/login', guestOnly, loginLimiter, controller.login);
router.post('/logout', requireAuth, controller.logout);

module.exports = router;
