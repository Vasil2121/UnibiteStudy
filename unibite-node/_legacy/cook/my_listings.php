<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

requireLoginPage();

$pageTitle = 'Οι Αγγελίες μου';
require __DIR__ . '/../includes/header.php';
?>

<link rel="stylesheet" href="/unibite/css/cook.css">

<div class="container cook-listings">

    <div class="cook-listings__header">
        <h1 class="cook-listings__title">Οι Αγγελίες μου</h1>
        <a class="btn-primary" href="/unibite/cook/create_listing.php">+ Νέα αγγελία</a>
    </div>

    <div class="alert-error is-hidden" id="listings-alert" role="alert"></div>

    <div class="cook-listings__state" id="listings-loading">Φόρτωση...</div>

    <div class="cook-listings__state is-hidden" id="listings-empty">
        Δεν έχεις αγγελίες ακόμη. Πάτα «Νέα αγγελία» για να φτιάξεις την πρώτη σου!
    </div>

    <div id="listings-root"></div>

</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>

<script src="/unibite/js/myListings.js"></script>
