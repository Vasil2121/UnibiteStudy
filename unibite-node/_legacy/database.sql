SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

CREATE DATABASE IF NOT EXISTS `unibite` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `unibite`;

DROP TABLE IF EXISTS `allergens`;
CREATE TABLE `allergens` (
  `id` int(10) UNSIGNED NOT NULL,
  `name_el` varchar(50) NOT NULL,
  `name_en` varchar(50) NOT NULL,
  `icon` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

TRUNCATE TABLE `allergens`;

INSERT INTO `allergens` (`id`, `name_el`, `name_en`, `icon`) VALUES
(1, 'Γλουτένη', 'Gluten', '🌾'),
(2, 'Οστρακοειδή', 'Crustaceans', '🦐'),
(3, 'Αυγά', 'Eggs', '🥚'),
(4, 'Ψάρια', 'Fish', '🐟'),
(5, 'Αράπικα φιστίκια', 'Peanuts', '🥜'),
(6, 'Σόγια', 'Soybeans', '🌱'),
(7, 'Γαλακτοκομικά', 'Milk', '🥛'),
(8, 'Ξηροί καρποί', 'Tree nuts', '🌰'),
(9, 'Σέλινο', 'Celery', '🥬'),
(10, 'Μουστάρδα', 'Mustard', '🟡'),
(11, 'Σουσάμι', 'Sesame seeds', '⚪'),
(12, 'Διοξείδιο θείου', 'Sulphur dioxide/Sulphites', '🧪'),
(13, 'Λούπινα', 'Lupin', '🟤'),
(14, 'Μαλάκια', 'Molluscs', '🦑');

DROP TABLE IF EXISTS `listings`;
CREATE TABLE `listings` (
  `id` int(10) UNSIGNED NOT NULL,
  `cook_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `photo_filename` varchar(255) DEFAULT NULL,
  `portions_total` int(10) UNSIGNED NOT NULL,
  `portions_available` int(10) UNSIGNED NOT NULL,
  `pickup_lat` decimal(10,7) NOT NULL,
  `pickup_lng` decimal(10,7) NOT NULL,
  `pickup_location_text` varchar(255) NOT NULL,
  `pickup_time_from` datetime NOT NULL,
  `pickup_time_to` datetime NOT NULL,
  `status` enum('active','inactive','deleted') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

TRUNCATE TABLE `listings`;

DROP TABLE IF EXISTS `listing_allergens`;
CREATE TABLE `listing_allergens` (
  `listing_id` int(10) UNSIGNED NOT NULL,
  `allergen_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

TRUNCATE TABLE `listing_allergens`;

DROP TABLE IF EXISTS `point_transactions`;
CREATE TABLE `point_transactions` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `delta` int(11) NOT NULL,
  `reason` enum('signup_bonus','request_spent','request_refunded','pickup_completed','no_show_penalty','unrated_penalty','cook_reward_base','cook_reward_bonus') NOT NULL,
  `related_request_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

TRUNCATE TABLE `point_transactions`;

DROP TABLE IF EXISTS `ratings`;
CREATE TABLE `ratings` (
  `id` int(10) UNSIGNED NOT NULL,
  `request_id` int(10) UNSIGNED NOT NULL,
  `score` tinyint(3) UNSIGNED NOT NULL,
  `comment` text DEFAULT NULL,
  `rated_at` datetime NOT NULL DEFAULT current_timestamp()
) ;

TRUNCATE TABLE `ratings`;

DROP TABLE IF EXISTS `requests`;
CREATE TABLE `requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `listing_id` int(10) UNSIGNED NOT NULL,
  `consumer_id` int(10) UNSIGNED NOT NULL,
  `slot` tinyint(3) UNSIGNED NOT NULL,
  `status` enum('pending','approved','rejected','picked_up','no_show') NOT NULL DEFAULT 'pending',
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `decided_at` datetime DEFAULT NULL,
  `picked_up_at` datetime DEFAULT NULL,
  `rate_deadline` datetime DEFAULT NULL
) ;

TRUNCATE TABLE `requests`;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `points` int(11) NOT NULL DEFAULT 5,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

TRUNCATE TABLE `users`;

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `points`, `is_admin`, `created_at`) VALUES
(1, 'admin', 'admin@unibite.local', '$2y$10$YourHashHerePlaceholderXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'System Administrator', 0, 1, '2026-05-06 20:26:35'),
(2, 'dimitris', 'dimitris@upatras.gr', '$2y$10$placeholder', 'Δημήτρης Παπαδόπουλος', 5, 0, '2026-05-06 20:26:35'),
(3, 'maria', 'maria@upatras.gr', '$2y$10$placeholder', 'Μαρία Γεωργίου', 5, 0, '2026-05-06 20:26:35'),
(4, 'giannis', 'giannis@upatras.gr', '$2y$10$placeholder', 'Γιάννης Νικολάου', 5, 0, '2026-05-06 20:26:35');

ALTER TABLE `allergens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name_el` (`name_el`),
  ADD UNIQUE KEY `name_en` (`name_en`);

ALTER TABLE `listings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_listings_status_expires` (`status`,`expires_at`),
  ADD KEY `idx_listings_cook` (`cook_id`),
  ADD KEY `idx_listings_location` (`pickup_lat`,`pickup_lng`);

ALTER TABLE `listing_allergens`
  ADD PRIMARY KEY (`listing_id`,`allergen_id`),
  ADD KEY `allergen_id` (`allergen_id`);

ALTER TABLE `point_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `related_request_id` (`related_request_id`),
  ADD KEY `idx_point_tx_user` (`user_id`,`created_at`);

ALTER TABLE `ratings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_id` (`request_id`),
  ADD KEY `idx_ratings_score` (`score`);

ALTER TABLE `requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_listing_consumer_slot` (`listing_id`,`consumer_id`,`slot`),
  ADD KEY `idx_requests_consumer` (`consumer_id`),
  ADD KEY `idx_requests_listing` (`listing_id`),
  ADD KEY `idx_requests_status` (`status`),
  ADD KEY `idx_requests_rate_deadline` (`rate_deadline`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_points` (`points`);

ALTER TABLE `allergens`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

ALTER TABLE `listings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `point_transactions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `ratings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

ALTER TABLE `listings`
  ADD CONSTRAINT `listings_ibfk_1` FOREIGN KEY (`cook_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `listing_allergens`
  ADD CONSTRAINT `listing_allergens_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `listing_allergens_ibfk_2` FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`id`) ON DELETE CASCADE;

ALTER TABLE `point_transactions`
  ADD CONSTRAINT `point_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `point_transactions_ibfk_2` FOREIGN KEY (`related_request_id`) REFERENCES `requests` (`id`) ON DELETE SET NULL;

ALTER TABLE `ratings`
  ADD CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE;

ALTER TABLE `requests`
  ADD CONSTRAINT `requests_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `requests_ibfk_2` FOREIGN KEY (`consumer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
