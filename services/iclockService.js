'use strict';

/**
 * ZKTeco / iClock push-protocol helpers.
 *
 * The device sends attendance as tab-separated lines in the request body:
 *   PIN \t DateTime \t Status \t Verify \t WorkCode \t Reserved...
 *
 * `Status` is the in/out state (0 = check-in, 1 = check-out, ...) and
 * `Verify` is the verification method (1 = fingerprint, 15 = face, ...).
 */

const TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;

/**
 * Normalize a device timestamp to `YYYY-MM-DD HH:mm:ss`.
 * Returns null when the value cannot be parsed.
 */
function normalizeTimestamp(value) {
  if (!value) return null;
  const match = TIMESTAMP_PATTERN.exec(String(value).trim());
  if (!match) return null;
  const [, y, m, d, hh, mm, ss] = match;
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

/**
 * Parse the raw ATTLOG body into normalized attendance records.
 * Invalid lines (no PIN or no timestamp) are dropped.
 */
function parseAttLog(rawBody) {
  if (!rawBody || typeof rawBody !== 'string') return [];

  return rawBody
    .split(/\r?\n/)
    .map((line) => line.replace(/\0/g, '').trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const fields = line.split('\t');
      return {
        user_id_finger: (fields[0] || '').trim(),
        timestamp: normalizeTimestamp(fields[1]),
        in_out_mode: (fields[2] || '').trim() || null,
        verify_mode: (fields[3] || '').trim() || null,
        raw_line: line,
      };
    })
    .filter((record) => record.user_id_finger && record.timestamp);
}

/**
 * Handshake response returned to the device on `GET /iclock/cdata`.
 * `Realtime=1` asks the device to push scans immediately.
 */
function handshakeResponse(device) {
  return [
    `GET OPTION FROM: ${device.sn}`,
    'Stamp=9999',
    'OpStamp=9999',
    'ErrorDelay=30',
    'Delay=10',
    'TransTimes=00:00;14:05',
    'TransInterval=1',
    'TransFlag=1111000000',
    'Realtime=1',
    'Encrypt=0',
    '',
  ].join('\n');
}

module.exports = { normalizeTimestamp, parseAttLog, handshakeResponse };
