'use strict';

/**
 * Thin wrapper around the Socket.IO server so other modules (services,
 * controllers) can broadcast realtime events without importing app.js.
 */
let io = null;

function init(server) {
  io = server;
}

function emit(event, payload) {
  if (io) {
    io.emit(event, payload);
  }
}

function emitAttendance(attendance) {
  emit('new-attendance', attendance);
}

module.exports = { init, emit, emitAttendance };
