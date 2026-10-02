'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const iclockRoutes = require('./iclockRoutes');

const router = express.Router();

// Fingerprint push listener
router.use('/iclock', iclockRoutes);

// Dashboard authentication
router.use('/', authRoutes);

// Protected dashboard
router.get('/', requireAuth, (req, res) => res.redirect('/admin'));
router.use('/admin', adminRoutes);

module.exports = router;
