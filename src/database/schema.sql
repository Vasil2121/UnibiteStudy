CREATE DATABASE IF NOT EXISTS `unibite` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `unibite`;

CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `points` int(11) NOT NULL DEFAULT 0,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_points` (`points`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `allergens` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name_el` varchar(50) NOT NULL,
  `name_en` varchar(50) NOT NULL,
  `icon` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_el` (`name_el`),
  UNIQUE KEY `name_en` (`name_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `listings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `cook_id` int(10) unsigned NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `photo_filename` varchar(255) DEFAULT NULL,
  `portions_total` int(10) unsigned NOT NULL,
  `portions_available` int(10) unsigned NOT NULL,
  `pickup_lat` decimal(10,7) NOT NULL,
  `pickup_lng` decimal(10,7) NOT NULL,
  `pickup_location_text` varchar(255) NOT NULL,
  `pickup_time_from` datetime NOT NULL,
  `pickup_time_to` datetime NOT NULL,
  `status` enum('active','inactive','deleted') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_listings_status_expires` (`status`,`expires_at`),
  KEY `idx_listings_cook` (`cook_id`),
  KEY `idx_listings_location` (`pickup_lat`,`pickup_lng`),
  CONSTRAINT `listings_ibfk_1` FOREIGN KEY (`cook_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `listing_allergens` (
  `listing_id` int(10) unsigned NOT NULL,
  `allergen_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`listing_id`,`allergen_id`),
  KEY `allergen_id` (`allergen_id`),
  CONSTRAINT `listing_allergens_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `listing_allergens_ibfk_2` FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `requests` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `listing_id` int(10) unsigned NOT NULL,
  `consumer_id` int(10) unsigned NOT NULL,
  `slot` tinyint(3) unsigned NOT NULL,
  `status` enum('pending','approved','rejected','picked_up','no_show') NOT NULL DEFAULT 'pending',
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `decided_at` datetime DEFAULT NULL,
  `picked_up_at` datetime DEFAULT NULL,
  `rate_deadline` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_listing_consumer_slot` (`listing_id`,`consumer_id`,`slot`),
  KEY `idx_requests_consumer` (`consumer_id`),
  KEY `idx_requests_listing` (`listing_id`),
  KEY `idx_requests_status` (`status`),
  KEY `idx_requests_rate_deadline` (`rate_deadline`),
  CONSTRAINT `requests_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `requests_ibfk_2` FOREIGN KEY (`consumer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_slot` CHECK (`slot` in (1,2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ratings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `request_id` int(10) unsigned NOT NULL,
  `score` tinyint(3) unsigned NOT NULL,
  `comment` text DEFAULT NULL,
  `rated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_id` (`request_id`),
  KEY `idx_ratings_score` (`score`),
  CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_score` CHECK (`score` between 1 and 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `point_transactions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `delta` int(11) NOT NULL,
  `reason` enum('signup_bonus','request_spent','request_refunded','pickup_completed','no_show_penalty','unrated_penalty','cook_reward_base','cook_reward_bonus') NOT NULL,
  `related_request_id` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `related_request_id` (`related_request_id`),
  KEY `idx_point_tx_user` (`user_id`,`created_at`),
  CONSTRAINT `point_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `point_transactions_ibfk_2` FOREIGN KEY (`related_request_id`) REFERENCES `requests` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
