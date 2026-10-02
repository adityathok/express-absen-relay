'use strict';

const express = require('express');
const controller = require('../controllers/iclockController');
const { deviceLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Fingerprint devices are high-frequency clients; apply a dedicated limiter.
router.use(deviceLimiter);

router.get('/cdata', controller.handshake);
router.post('/cdata', controller.cdata);
router.get('/getrequest', controller.getRequest);
router.post('/devicecmd', controller.deviceCmd);
router.post('/ping', controller.ping);

module.exports = router;
