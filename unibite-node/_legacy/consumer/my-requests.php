<?php

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

requireLoginPage();

$pageTitle = 'Τα Αιτήματά μου';
require_once __DIR__ . '/../includes/header.php';
?>

    <link rel="stylesheet" href="/unibite/css/consumer-requests.css">

    <div class="requests-container">
        <h1 class="requests-container__title">Ιστορικό Αιτήμάτων & Κρατήσεων</h1>

        <div id="requests-wrapper" class="requests-wrapper">
            <div class="requests-wrapper__loading">Φόρτωση του ιστορικού κρατήσεων...</div>
        </div>
    </div>

    <div id="rating-modal" class="modal" style="display: none;">
        <div class="modal__content">
            <span class="modal__close-btn">&times;</span>
            <h2 class="modal__title">Αξιολόγηση Γεύματος</h2>
            <p class="modal__subtitle">Πώς σας φάνηκε το φαγητό του συμφοιτητή σας;</p>

            <form id="rating-form" class="rating-form">
                <input type="hidden" id="modal-request-id" value="">

                <div class="rating-form__stars">
                    <span class="star-node" data-value="1">★</span>
                    <span class="star-node" data-value="2">★</span>
                    <span class="star-node" data-value="3">★</span>
                    <span class="star-node" data-value="4">★</span>
                    <span class="star-node" data-value="5">★</span>
                </div>
                <input type="hidden" id="rating-score-value" value="0">

                <div class="rating-form__field-group">
                    <label for="rating-comment" class="rating-form__label">Σχόλια / Εντυπώσεις (Προαιρετικό):</label>
                    <textarea id="rating-comment" class="rating-form__textarea" placeholder="π.χ. Ήταν πεντανόστιμο και στην ώρα του!"></textarea>
                </div>

                <button type="submit" id="rating-submit-btn" class="rating-form__submit-btn" disabled>Υποβολή Βαθμολογίας</button>
            </form>
        </div>
    </div>

    <script src="/unibite/js/myRequests.js"></script>

<?php
require_once __DIR__ . '/../includes/footer.php';
?>
