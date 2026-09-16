<?php

require_once __DIR__ . '/includes/auth.php';

if (isLoggedIn()) {
    header('Location: /unibite/consumer/feed.php');
    exit;
}

$pageTitle = 'Σύνδεση';

require __DIR__ . '/includes/header.php';
?>

<div class="container">

    <section class="card">

        <h1>Σύνδεση στο UniBite</h1>
        <p>Συνδέσου για να δεις τις διαθέσιμες μερίδες ή να μοιραστείς δικές σου.</p>

        <div id="form-alert" class="alert-error" hidden></div>

        <form id="login-form">

            <div>
                <label class="form-label" for="identifier">Username ή Email</label>
                <input
                    class="form-input"
                    type="text"
                    id="identifier"
                    name="identifier"
                    required
                    maxlength="100"
                    autocomplete="username"
                    autofocus
                >
                <small class="form-error" data-error-for="identifier"></small>
            </div>

            <div>
                <label class="form-label" for="password">Κωδικός</label>
                <input
                    class="form-input"
                    type="password"
                    id="password"
                    name="password"
                    required
                    maxlength="255"
                    autocomplete="current-password"
                >
                <small class="form-error" data-error-for="password"></small>
            </div>

            <button type="submit" class="btn-primary" id="submit-btn">
                Σύνδεση
            </button>

        </form>

        <p>
            Δεν έχεις λογαριασμό; <a href="/unibite/register.php">Εγγραφή εδώ</a>
        </p>

    </section>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>

<script src="/unibite/js/login.js"></script>
