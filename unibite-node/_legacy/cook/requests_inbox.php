<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

requireLoginPage();

$pageTitle = 'Εισερχόμενα Αιτήματα';
require __DIR__ . '/../includes/header.php';
?>

<link rel="stylesheet" href="/unibite/css/cook.css">

<div class="container cook-listings">

    <div class="cook-listings__header">
        <h1 class="cook-listings__title">Εισερχόμενα Αιτήματα</h1>
        <a class="btn-secondary" href="/unibite/cook/my_listings.php">Οι αγγελίες μου</a>
    </div>

    <div class="alert-error is-hidden" id="requests-alert" role="alert"></div>

    <div class="cook-listings__state" id="requests-loading">Φόρτωση...</div>

    <div class="cook-listings__state is-hidden" id="requests-empty">
        Δεν υπάρχουν αιτήματα ακόμη.
    </div>

    <div id="requests-root"></div>

</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>

<script src="/unibite/js/requestsInbox.js"></script>
