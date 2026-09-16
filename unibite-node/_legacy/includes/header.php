<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/auth.php';

$currentUser = getCurrentUser();
$isLoggedIn  = $currentUser !== null;
$isAdmin     = $isLoggedIn && (int) $currentUser['is_admin'] === 1;

$pageTitle = isset($pageTitle) ? $pageTitle . ' — UniBite' : 'UniBite';
?>
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= escapeHtml($pageTitle) ?></title>

    <link rel="stylesheet" href="/unibite/css/variables.css">
    <link rel="stylesheet" href="/unibite/css/common.css">
    <link rel="stylesheet" href="/unibite/css/header-footer.css">
</head>
<body>

<header class="site-header">
    <div class="site-header__inner">

        <a class="site-header__brand"
           href="<?= $isLoggedIn ? '/unibite/consumer/feed.php' : '/unibite/login.php' ?>">
            UniBite
        </a>

        <button type="button"
                class="site-header__hamburger"
                id="hamburger-btn"
                aria-label="Άνοιγμα μενού"
                aria-expanded="false"
                aria-controls="main-nav">
            <span></span>
            <span></span>
            <span></span>
        </button>

        <nav class="site-header__nav" id="main-nav">

            <?php if ($isLoggedIn): ?>
                <span class="site-header__user">
                        <span class="site-header__username">
                            <?= escapeHtml($currentUser['full_name']) ?>
                        </span>
                        <span class="site-header__points" id="header-user-points">
                            <?= (int) $currentUser['points'] ?> πόντοι
                        </span>
                    </span>

                <a href="/unibite/consumer/feed.php" class="site-header__link">
                    🔎 Ανακάλυψη Φαγητού
                </a>
                <a href="/unibite/consumer/my-requests.php" class="site-header__link">
                    📋 Τα Αιτήματά μου
                </a>

                <a href="/unibite/cook/my_listings.php" class="site-header__link">
                    👨‍🍳 Οι Αγγελίες μου
                </a>
                <a href="/unibite/cook/requests_inbox.php" class="site-header__link">
                    📥 Εισερχόμενα Αιτήματα
                </a>

                <a href="/unibite/profile.php" class="site-header__link">
                    👤 Το Προφίλ μου
                </a>

                <?php if ($isAdmin): ?>
                    <a href="/unibite/admin/dashboard.php"
                       class="site-header__link site-header__link--admin">
                        Admin
                    </a>
                <?php endif; ?>

                <button type="button"
                        class="site-header__link site-header__logout"
                        onclick="window.logout()">
                    Αποσύνδεση
                </button>

            <?php else: ?>
                <a href="/unibite/login.php" class="site-header__link">
                    Σύνδεση
                </a>
                <a href="/unibite/register.php"
                   class="site-header__link site-header__link--cta">
                    Εγγραφή
                </a>

            <?php endif; ?>

        </nav>

    </div>
</header>

<main class="site-main">
