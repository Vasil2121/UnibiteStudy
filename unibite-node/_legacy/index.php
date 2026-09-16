<?php

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/includes/auth.php';

if (!isLoggedIn()) {
    header('Location: /unibite/login.php');
    exit;
}

$user = getCurrentUser();

if ((int) $user['is_admin'] === 1) {
    header('Location: /unibite/admin/dashboard.php');
    exit;
}

header('Location: /unibite/consumer/feed.php');
exit;
