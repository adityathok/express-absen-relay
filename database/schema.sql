-- =====================================================================
-- Fingerprint Push Receiver Service (Middleware) - MySQL Schema
-- Run automatically via `npm run setup`
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Dashboard admin users -------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(100)    NOT NULL,
  `password`   VARCHAR(255)    NOT NULL,
  `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Fingerprint devices ---------------------------------------------
CREATE TABLE IF NOT EXISTS `devices` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sn`            VARCHAR(100)    NOT NULL COMMENT 'Device serial number',
  `name`          VARCHAR(150)    NOT NULL,
  `ip_address`    VARCHAR(45)     DEFAULT NULL,
  `location`      VARCHAR(150)    DEFAULT NULL,
  `status`        ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `last_seen_at`  DATETIME        DEFAULT NULL,
  `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_devices_sn` (`sn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Target Laravel applications -------------------------------------
CREATE TABLE IF NOT EXISTS `apps` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `app_name`    VARCHAR(150)    NOT NULL,
  `webhook_url` VARCHAR(500)    NOT NULL,
  `secret_key`  VARCHAR(255)    NOT NULL,
  `status`      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Device -> App routing (1 device can map to many apps) ------------
CREATE TABLE IF NOT EXISTS `device_app_mappings` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `device_id`  BIGINT UNSIGNED NOT NULL,
  `app_id`     BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_mapping_device_app` (`device_id`, `app_id`),
  KEY `idx_mapping_app` (`app_id`),
  CONSTRAINT `fk_mapping_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mapping_app`    FOREIGN KEY (`app_id`)    REFERENCES `apps` (`id`)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Raw attendance logs received from devices ------------------------
CREATE TABLE IF NOT EXISTS `attendance_logs` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `device_sn`       VARCHAR(100)    NOT NULL,
  `user_id_finger`  VARCHAR(100)    NOT NULL,
  `timestamp`       DATETIME        NOT NULL,
  `verify_mode`     VARCHAR(20)     DEFAULT NULL,
  `in_out_mode`     VARCHAR(20)     DEFAULT NULL,
  `raw_payload`     TEXT            DEFAULT NULL,
  `forward_status`  ENUM('PENDING','SUCCESS','FAILED','PARTIAL') NOT NULL DEFAULT 'PENDING',
  `response_code`   VARCHAR(20)     DEFAULT NULL,
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_att_device_sn` (`device_sn`),
  KEY `idx_att_timestamp` (`timestamp`),
  KEY `idx_att_status` (`forward_status`),
  KEY `idx_att_user` (`user_id_finger`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Per-target forwarding logs (one row per attendance x app) --------
CREATE TABLE IF NOT EXISTS `forward_logs` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `attendance_log_id` BIGINT UNSIGNED NOT NULL,
  `app_id`            BIGINT UNSIGNED NOT NULL,
  `status`            ENUM('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'PENDING',
  `http_code`         VARCHAR(20)     DEFAULT NULL,
  `response_body`     TEXT            DEFAULT NULL,
  `retry_count`       INT UNSIGNED    NOT NULL DEFAULT 0,
  `last_attempt_at`   DATETIME        DEFAULT NULL,
  `next_retry_at`     DATETIME        DEFAULT NULL,
  `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fwd_attendance` (`attendance_log_id`),
  KEY `idx_fwd_app` (`app_id`),
  KEY `idx_fwd_status_retry` (`status`, `next_retry_at`),
  CONSTRAINT `fk_fwd_attendance` FOREIGN KEY (`attendance_log_id`) REFERENCES `attendance_logs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fwd_app`        FOREIGN KEY (`app_id`)            REFERENCES `apps` (`id`)            ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
