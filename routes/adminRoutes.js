'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');

const dashboardController = require('../controllers/dashboardController');
const deviceController = require('../controllers/deviceController');
const appController = require('../controllers/appController');
const mappingController = require('../controllers/mappingController');
const logController = require('../controllers/logController');
const docsController = require('../controllers/docsController');
const profileController = require('../controllers/profileController');

const router = express.Router();

// Every route below requires an authenticated session.
router.use(requireAuth);

// Overview
router.get('/', dashboardController.index);

// Devices
router.get('/devices', deviceController.index);
router.get('/devices/create', deviceController.create);
router.post('/devices', deviceController.store);
router.get('/devices/:id/edit', deviceController.edit);
router.put('/devices/:id', deviceController.update);
router.delete('/devices/:id', deviceController.destroy);

// Target apps
router.get('/apps', appController.index);
router.get('/apps/create', appController.create);
router.post('/apps', appController.store);
router.get('/apps/:id/edit', appController.edit);
router.put('/apps/:id', appController.update);
router.delete('/apps/:id', appController.destroy);
router.post('/apps/:id/regenerate-secret', appController.regenerateSecret);

// Mappings
router.get('/mappings', mappingController.index);
router.post('/mappings', mappingController.store);
router.delete('/mappings/:id', mappingController.destroy);

// Logs
router.get('/attendance-logs', logController.attendanceIndex);
router.get('/attendance-logs/:id', logController.attendanceShow);
router.get('/forward-logs', logController.forwardIndex);
router.post('/forward-logs/:id/retry', logController.retryForward);

// Profile & password
router.get('/profile', profileController.show);
router.put('/profile', profileController.updateProfile);
router.put('/profile/password', profileController.updatePassword);

// Documentation
router.get('/docs', docsController.index);

module.exports = router;
