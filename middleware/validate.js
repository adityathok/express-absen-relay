'use strict';

/**
 * Small, dependency-free input validators shared by dashboard forms.
 * Each validator returns { valid, errors, data } with sanitized values.
 */

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isPositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function isOneOf(value, allowed) {
  return allowed.includes(value);
}

function validateDeviceInput(body = {}) {
  const errors = [];
  const data = {
    sn: (body.sn || '').trim(),
    name: (body.name || '').trim(),
    ip_address: (body.ip_address || '').trim() || null,
    location: (body.location || '').trim() || null,
    status: (body.status || 'ACTIVE').trim().toUpperCase(),
  };

  if (!isNonEmptyString(data.sn)) errors.push('Serial number wajib diisi.');
  if (data.sn.length > 100) errors.push('Serial number maksimal 100 karakter.');
  if (!isNonEmptyString(data.name)) errors.push('Nama mesin wajib diisi.');
  if (data.name.length > 150) errors.push('Nama mesin maksimal 150 karakter.');
  if (data.ip_address && data.ip_address.length > 45) errors.push('IP address terlalu panjang.');
  if (!isOneOf(data.status, ['ACTIVE', 'INACTIVE'])) errors.push('Status tidak valid.');

  return { valid: errors.length === 0, errors, data };
}

function validateAppInput(body = {}) {
  const errors = [];
  const data = {
    app_name: (body.app_name || '').trim(),
    webhook_url: (body.webhook_url || '').trim(),
    secret_key: (body.secret_key || '').trim(),
    status: (body.status || 'ACTIVE').trim().toUpperCase(),
  };

  if (!isNonEmptyString(data.app_name)) errors.push('Nama aplikasi wajib diisi.');
  if (data.app_name.length > 150) errors.push('Nama aplikasi maksimal 150 karakter.');
  if (!isNonEmptyString(data.webhook_url)) errors.push('Webhook URL wajib diisi.');
  if (data.webhook_url && !isValidHttpUrl(data.webhook_url)) {
    errors.push('Webhook URL harus berupa URL http/https yang valid.');
  }
  if (data.webhook_url.length > 500) errors.push('Webhook URL maksimal 500 karakter.');
  if (!isNonEmptyString(data.secret_key)) errors.push('Secret key wajib diisi.');
  if (!isOneOf(data.status, ['ACTIVE', 'INACTIVE'])) errors.push('Status tidak valid.');

  return { valid: errors.length === 0, errors, data };
}

function validateProfileInput(body = {}) {
  const errors = [];
  const data = {
    username: (body.username || '').trim(),
  };

  if (!isNonEmptyString(data.username)) {
    errors.push('Username wajib diisi.');
  } else {
    if (data.username.length < 3) errors.push('Username minimal 3 karakter.');
    if (data.username.length > 50) errors.push('Username maksimal 50 karakter.');
    if (!/^[A-Za-z0-9._-]+$/.test(data.username)) {
      errors.push('Username hanya boleh berisi huruf, angka, titik, underscore, dan strip.');
    }
  }

  return { valid: errors.length === 0, errors, data };
}

function validatePasswordInput(body = {}) {
  const errors = [];
  const data = {
    current_password: body.current_password || '',
    new_password: body.new_password || '',
    confirm_password: body.confirm_password || '',
  };

  if (!isNonEmptyString(data.current_password)) {
    errors.push('Password saat ini wajib diisi.');
  }
  if (!isNonEmptyString(data.new_password)) {
    errors.push('Password baru wajib diisi.');
  } else {
    if (data.new_password.length < 8) errors.push('Password baru minimal 8 karakter.');
    if (data.new_password.length > 100) errors.push('Password baru maksimal 100 karakter.');
  }
  if (data.new_password !== data.confirm_password) {
    errors.push('Konfirmasi password baru tidak cocok.');
  }
  if (data.current_password && data.current_password === data.new_password) {
    errors.push('Password baru harus berbeda dari password saat ini.');
  }

  return { valid: errors.length === 0, errors, data };
}

function validateMappingInput(body = {}) {
  const errors = [];
  const data = {
    device_id: Number(body.device_id),
    app_id: Number(body.app_id),
  };

  if (!isPositiveInt(data.device_id)) errors.push('Device wajib dipilih.');
  if (!isPositiveInt(data.app_id)) errors.push('Aplikasi target wajib dipilih.');

  return { valid: errors.length === 0, errors, data };
}

module.exports = {
  isNonEmptyString,
  isValidHttpUrl,
  isPositiveInt,
  isOneOf,
  validateDeviceInput,
  validateAppInput,
  validateMappingInput,
  validateProfileInput,
  validatePasswordInput,
};
