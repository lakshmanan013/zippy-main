-- ==============================================================================
-- Create all Zippy CRM tables inside zenve_main database
-- ==============================================================================

USE `zenve_main`;

-- 1. Regional Managers
CREATE TABLE IF NOT EXISTS `regional_managers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(100) NULL,
  `password` VARCHAR(100) NULL,
  `region` VARCHAR(150) NULL,
  `is_phone_verified` BOOLEAN DEFAULT FALSE,
  `is_active` BOOLEAN DEFAULT TRUE,
  INDEX `ix_regional_managers_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Sales Managers
CREATE TABLE IF NOT EXISTS `sales_managers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(100) NULL,
  `password` VARCHAR(100) NULL,
  `region` VARCHAR(150) NULL,
  `is_phone_verified` BOOLEAN DEFAULT FALSE,
  `is_active` BOOLEAN DEFAULT TRUE,
  INDEX `ix_sales_managers_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Sales Executives
CREATE TABLE IF NOT EXISTS `sales_executives` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(100) NULL,
  `password` VARCHAR(100) NULL,
  `region` VARCHAR(150) NULL,
  `city` VARCHAR(150) NULL,
  `monthly_target` FLOAT DEFAULT 0,
  `is_phone_verified` BOOLEAN DEFAULT FALSE,
  `is_active` BOOLEAN DEFAULT TRUE,
  INDEX `ix_sales_executives_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Mobile OTPs
CREATE TABLE IF NOT EXISTS `mobile_otps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(30) NOT NULL,
  `otp` VARCHAR(10) NOT NULL,
  `purpose` VARCHAR(50) DEFAULT 'login',
  `role` VARCHAR(50) NULL,
  `is_verified` BOOLEAN DEFAULT FALSE,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NULL,
  INDEX `ix_mobile_otps_id` (`id`),
  INDEX `ix_mobile_otps_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Attendance
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `executive_id` INT NOT NULL,
  `attendance_date` DATE NOT NULL,
  `login_time` DATETIME NULL,
  `logout_time` DATETIME NULL,
  `login_latitude` FLOAT NULL,
  `login_longitude` FLOAT NULL,
  `login_area` VARCHAR(255) NULL,
  `logout_latitude` FLOAT NULL,
  `logout_longitude` FLOAT NULL,
  `logout_area` VARCHAR(255) NULL,
  `login_selfie_url` TEXT NULL,
  `logout_selfie_url` TEXT NULL,
  `lunch_out_time` DATETIME NULL,
  `lunch_in_time` DATETIME NULL,
  `lunch_out_latitude` FLOAT NULL,
  `lunch_out_longitude` FLOAT NULL,
  `lunch_out_area` VARCHAR(255) NULL,
  `lunch_in_latitude` FLOAT NULL,
  `lunch_in_longitude` FLOAT NULL,
  `lunch_in_area` VARCHAR(255) NULL,
  `lunch_out_selfie_url` TEXT NULL,
  `lunch_in_selfie_url` TEXT NULL,
  `login_accuracy` FLOAT NULL,
  `login_city` VARCHAR(150) NULL,
  `login_district` VARCHAR(150) NULL,
  `login_state` VARCHAR(150) NULL,
  `login_pincode` VARCHAR(20) NULL,
  `login_village` VARCHAR(150) NULL,
  `login_taluk` VARCHAR(150) NULL,
  `login_country` VARCHAR(100) DEFAULT 'India',
  `login_location_source` VARCHAR(50) DEFAULT 'BROWSER_GPS',
  `login_formatted_address` TEXT NULL,
  `punch_in_time` DATETIME NULL,
  `punch_in_latitude` FLOAT NULL,
  `punch_in_longitude` FLOAT NULL,
  `punch_in_accuracy` FLOAT NULL,
  `punch_in_area` VARCHAR(255) NULL,
  `punch_in_city` VARCHAR(150) NULL,
  `punch_in_district` VARCHAR(150) NULL,
  `punch_in_state` VARCHAR(150) NULL,
  `punch_in_pincode` VARCHAR(20) NULL,
  `punch_in_village` VARCHAR(150) NULL,
  `punch_in_taluk` VARCHAR(150) NULL,
  `punch_in_country` VARCHAR(100) DEFAULT 'India',
  `punch_in_location_source` VARCHAR(50) DEFAULT 'BROWSER_GPS',
  `punch_in_formatted_address` TEXT NULL,
  `logout_accuracy` FLOAT NULL,
  `logout_city` VARCHAR(150) NULL,
  `logout_district` VARCHAR(150) NULL,
  `logout_state` VARCHAR(150) NULL,
  `logout_pincode` VARCHAR(20) NULL,
  `logout_village` VARCHAR(150) NULL,
  `logout_taluk` VARCHAR(150) NULL,
  `logout_country` VARCHAR(100) DEFAULT 'India',
  `logout_location_source` VARCHAR(50) DEFAULT 'BROWSER_GPS',
  `logout_formatted_address` TEXT NULL,
  `punch_out_time` DATETIME NULL,
  `punch_out_latitude` FLOAT NULL,
  `punch_out_longitude` FLOAT NULL,
  `punch_out_accuracy` FLOAT NULL,
  `punch_out_area` VARCHAR(255) NULL,
  `punch_out_city` VARCHAR(150) NULL,
  `punch_out_district` VARCHAR(150) NULL,
  `punch_out_state` VARCHAR(150) NULL,
  `punch_out_pincode` VARCHAR(20) NULL,
  `punch_out_village` VARCHAR(150) NULL,
  `punch_out_taluk` VARCHAR(150) NULL,
  `punch_out_country` VARCHAR(100) DEFAULT 'India',
  `punch_out_location_source` VARCHAR(50) DEFAULT 'BROWSER_GPS',
  `punch_out_formatted_address` TEXT NULL,
  `lunch_out_accuracy` FLOAT NULL,
  `lunch_out_city` VARCHAR(150) NULL,
  `lunch_out_district` VARCHAR(150) NULL,
  `lunch_out_state` VARCHAR(150) NULL,
  `lunch_out_pincode` VARCHAR(20) NULL,
  `lunch_out_village` VARCHAR(150) NULL,
  `lunch_out_taluk` VARCHAR(150) NULL,
  `lunch_out_country` VARCHAR(100) DEFAULT 'India',
  `lunch_out_location_source` VARCHAR(50) DEFAULT 'BROWSER_GPS',
  `lunch_out_formatted_address` TEXT NULL,
  `lunch_in_accuracy` FLOAT NULL,
  `lunch_in_city` VARCHAR(150) NULL,
  `lunch_in_district` VARCHAR(150) NULL,
  `lunch_in_state` VARCHAR(150) NULL,
  `lunch_in_pincode` VARCHAR(20) NULL,
  `lunch_in_village` VARCHAR(150) NULL,
  `lunch_in_taluk` VARCHAR(150) NULL,
  `lunch_in_country` VARCHAR(100) DEFAULT 'India',
  `lunch_in_location_source` VARCHAR(50) DEFAULT 'BROWSER_GPS',
  `lunch_in_formatted_address` TEXT NULL,
  `total_working_minutes` INT NULL,
  `status` VARCHAR(50) DEFAULT 'LOGGED_IN',
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  INDEX `ix_attendance_id` (`id`),
  FOREIGN KEY (`executive_id`) REFERENCES `sales_executives` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Pincode Coverages
CREATE TABLE IF NOT EXISTS `pincode_coverages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `executive_id` INT NOT NULL,
  `pincode` VARCHAR(20) NOT NULL,
  `city` VARCHAR(150) NULL,
  `state` VARCHAR(150) NULL,
  `created_at` DATETIME NULL,
  INDEX `ix_pincode_coverages_id` (`id`),
  FOREIGN KEY (`executive_id`) REFERENCES `sales_executives` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Executive Tasks
CREATE TABLE IF NOT EXISTS `executive_tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `task_type` VARCHAR(100) NULL,
  `entity_type` VARCHAR(100) NULL,
  `pincode` VARCHAR(20) NULL,
  `priority` VARCHAR(50) DEFAULT 'Medium',
  `status` VARCHAR(50) DEFAULT 'pending',
  `due_date` DATE NULL,
  `assigned_by_id` INT NULL,
  `assigned_by_role` VARCHAR(50) NULL,
  `assigned_by_name` VARCHAR(150) NULL,
  `assigned_to_role` VARCHAR(50) DEFAULT 'executive',
  `assigned_to_id` INT NULL,
  `assigned_to_name` VARCHAR(150) NULL,
  `region` VARCHAR(150) NULL,
  `target_entity_name` VARCHAR(200) NULL,
  `target_entity_id` INT NULL,
  `progress` INT DEFAULT 0,
  `remarks` TEXT NULL,
  `completed_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  INDEX `ix_executive_tasks_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Executive Alerts
CREATE TABLE IF NOT EXISTS `executive_alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NULL,
  `severity` VARCHAR(50) DEFAULT 'info',
  `alert_type` VARCHAR(100) DEFAULT 'task',
  `entity_type` VARCHAR(100) NULL,
  `pincode` VARCHAR(20) NULL,
  `executive_id` INT NULL,
  `task_id` INT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME NULL,
  INDEX `ix_executive_alerts_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Monthly Plans
CREATE TABLE IF NOT EXISTS `monthly_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `executive_id` INT NOT NULL,
  `month_key` VARCHAR(10) NOT NULL,
  `month_label` VARCHAR(50) NULL,
  `working_days` INT DEFAULT 0,
  `daily_target` INT DEFAULT 0,
  `total_doctors` INT DEFAULT 0,
  `planning_method` VARCHAR(20) DEFAULT 'auto',
  `status` VARCHAR(30) DEFAULT 'Draft',
  `submitted_at` DATETIME NULL,
  `approved_at` DATETIME NULL,
  `approved_by` VARCHAR(150) NULL,
  `rejection_reason` TEXT NULL,
  `created_at` DATETIME NULL,
  UNIQUE KEY `uq_exec_month` (`executive_id`, `month_key`),
  INDEX `ix_monthly_plans_id` (`id`),
  FOREIGN KEY (`executive_id`) REFERENCES `sales_executives` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Plan Visits
CREATE TABLE IF NOT EXISTS `plan_visits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plan_id` INT NOT NULL,
  `executive_id` INT NOT NULL,
  `doctor_id` INT NOT NULL,
  `scheduled_date` DATE NOT NULL,
  `visit_time` VARCHAR(20) DEFAULT '10:00 AM',
  `status` VARCHAR(30) DEFAULT 'Planned',
  `reschedule_reason` VARCHAR(200) NULL,
  `rescheduled_from` DATE NULL,
  `cancel_requested` BOOLEAN DEFAULT FALSE,
  `cancel_approved_by` VARCHAR(150) NULL,
  `cancel_reason` VARCHAR(200) NULL,
  `created_at` DATETIME NULL,
  INDEX `ix_plan_visits_id` (`id`),
  INDEX `ix_plan_visits_doctor_id` (`doctor_id`),
  FOREIGN KEY (`plan_id`) REFERENCES `monthly_plans` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`executive_id`) REFERENCES `sales_executives` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Visit Reports
CREATE TABLE IF NOT EXISTS `visit_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plan_visit_id` INT NOT NULL,
  `executive_id` INT NOT NULL,
  `doctor_id` INT NOT NULL,
  `visit_date` DATE NOT NULL,
  `visit_time` VARCHAR(20) NULL,
  `location` VARCHAR(300) NULL,
  `purpose` VARCHAR(150) NULL,
  `products_discussed` TEXT NULL,
  `notes` TEXT NULL,
  `doctor_feedback` TEXT NULL,
  `work_with` VARCHAR(500) NULL,
  `next_followup_date` DATE NULL,
  `next_action` VARCHAR(300) NULL,
  `remarks` TEXT NULL,
  `follow_up_required` BOOLEAN DEFAULT TRUE,
  `status` VARCHAR(30) DEFAULT 'Draft',
  `submitted_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  INDEX `ix_visit_reports_id` (`id`),
  INDEX `ix_visit_reports_doctor_id` (`doctor_id`),
  FOREIGN KEY (`plan_visit_id`) REFERENCES `plan_visits` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`executive_id`) REFERENCES `sales_executives` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Executive Submission Reports
CREATE TABLE IF NOT EXISTS `executive_submission_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `executive_id` INT NOT NULL,
  `executive_name` VARCHAR(100) NULL,
  `employee_code` VARCHAR(50) NULL,
  `region` VARCHAR(100) NULL,
  `report_date` DATE NOT NULL,
  `reporting_type` VARCHAR(50) DEFAULT 'Field',
  `recipient_type` VARCHAR(50) DEFAULT 'both',
  `manager_id` INT NULL,
  `manager_name` VARCHAR(100) NULL,
  `regional_manager_id` INT NULL,
  `regional_manager_name` VARCHAR(100) NULL,
  `total_visits` INT DEFAULT 0,
  `reported_visits` INT DEFAULT 0,
  `summary_notes` TEXT NULL,
  `visits_json` TEXT NULL,
  `status` VARCHAR(50) DEFAULT 'Submitted',
  `manager_remarks` TEXT NULL,
  `regional_remarks` TEXT NULL,
  `reviewed_at` DATETIME NULL,
  `submitted_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  INDEX `ix_executive_submission_reports_id` (`id`),
  FOREIGN KEY (`executive_id`) REFERENCES `sales_executives` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
