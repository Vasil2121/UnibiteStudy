SET NAMES utf8mb4;
USE `unibite`;

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

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `points`, `is_admin`) VALUES
(1, 'admin', 'admin@unibite.local', '$2a$10$vCQrv8pVoEXEw8t5YWFnretv7dmjc11R4LvN/Gh/6n2kowPNgbcNO', 'System Administrator', 0, 1);
