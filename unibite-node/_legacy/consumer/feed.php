<?php

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

requireLoginPage();

$pageTitle = 'Διαθέσιμα Γεύματα';
require_once __DIR__ . '/../includes/header.php';
?>

    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

    <link rel="stylesheet" href="/unibite/css/consumer-feed.css">

    <div class="feed-container">
        <h1 class="feed-container__title">Διαθέσιμα Γεύματα στην Κοινότητα</h1>

        <div class="card feed-filters">

            <div class="feed-filters__search">
                <input class="form-input" type="text" id="address-search-input"
                       placeholder="Πληκτρολόγησε τη διεύθυνσή σου (π.χ. Κορίνθου 200, Πάτρα)">
                <button type="button" class="btn-primary" id="address-search-btn">🔎 Εύρεση</button>
            </div>

            <div class="feed-filters__row">
                <div class="feed-filters__field">
                    <label class="form-label" for="filter-distance">Μέγ. απόσταση (km)</label>
                    <input class="form-input" type="number" id="filter-distance" min="0.1" step="0.1" value="5">
                </div>

                <div class="feed-filters__field">
                    <label class="form-label" for="filter-limit">Μέγ. αποτελέσματα</label>
                    <input class="form-input" type="number" id="filter-limit" min="1" step="1" value="20">
                </div>

                <button type="button" class="btn-primary" id="filter-apply">Εφαρμογή φίλτρου</button>
                <button type="button" class="btn-secondary" id="filter-reset">Όλες οι αγγελίες</button>
            </div>

            <p class="feed-filters__status" id="filter-status">
                Πληκτρολόγησε τη διεύθυνσή σου και πάτησε «Εύρεση», ή κάνε κλικ στον χάρτη.
            </p>
        </div>

        <div id="map" class="feed-container__map"></div>

        <div id="listings-grid" class="listings-grid">
            <div class="listings-grid__loading">Φόρτωση διαθέσιμων γευμάτων...</div>
        </div>
    </div>

    <script src="/unibite/js/feedMap.js"></script>

<?php
require_once __DIR__ . '/../includes/footer.php';
?>
