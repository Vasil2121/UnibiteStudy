<?php

require_once __DIR__ . '/includes/auth.php';

if (isLoggedIn()) {
    header('Location: /unibite/consumer/feed.php');
    exit;
}

$pageTitle = 'Εγγραφή';

require __DIR__ . '/includes/header.php';
?>

<div class="container">

    <section class="card">

        <h1>Εγγραφή στο UniBite</h1>
        <p>Δημιούργησε λογαριασμό για να ξεκινήσεις να μοιράζεσαι φαγητό με συμφοιτητές σου.</p>

        <div id="form-alert" class="alert-error" hidden></div>

        <form id="register-form">

            <div>
                <label class="form-label" for="full_name">Ονοματεπώνυμο</label>
                <input
                    class="form-input"
                    type="text"
                    id="full_name"
                    name="full_name"
                    required
                    minlength="2"
                    maxlength="100"
                    autocomplete="name"
                >
                <small class="form-error" data-error-for="full_name"></small>
            </div>

            <div>
                <label class="form-label" for="username">Username</label>
                <input
                    class="form-input"
                    type="text"
                    id="username"
                    name="username"
                    required
                    minlength="3"
                    maxlength="50"
                    pattern="[a-zA-Z0-9_]+"
                    autocomplete="username"
                >
                <small class="form-error" data-error-for="username"></small>
            </div>

            <div>
                <label class="form-label" for="email">Email</label>
                <input
                    class="form-input"
                    type="email"
                    id="email"
                    name="email"
                    required
                    maxlength="100"
                    autocomplete="email"
                >
                <small class="form-error" data-error-for="email"></small>
            </div>

            <div>
                <label class="form-label" for="password">Κωδικός</label>
                <input
                    class="form-input"
                    type="password"
                    id="password"
                    name="password"
                    required
                    minlength="8"
                    maxlength="255"
                    autocomplete="new-password"
                >
                <small class="form-error" data-error-for="password"></small>
            </div>

            <div>
                <label class="form-label" for="password_confirm">Επιβεβαίωση Κωδικού</label>
                <input
                    class="form-input"
                    type="password"
                    id="password_confirm"
                    name="password_confirm"
                    required
                    minlength="8"
                    maxlength="255"
                    autocomplete="new-password"
                >
                <small class="form-error" data-error-for="password_confirm"></small>
            </div>

            <button type="submit" class="btn-primary" id="submit-btn">
                Εγγραφή
            </button>

        </form>

        <p>
            Έχεις ήδη λογαριασμό; <a href="/unibite/login.php">Σύνδεση εδώ</a>
        </p>

    </section>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>

<script src="/unibite/js/register.js"></script>
