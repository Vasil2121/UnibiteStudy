<?php

$pageTitle = 'Demo Σελίδα';

require __DIR__ . '/includes/header.php';
?>

<div class="container">

    <section class="card">
        <h1>Demo σελίδα για το header/footer</h1>
        <p>
            Αυτή η σελίδα τεστάρει αν το <code>includes/header.php</code> και
            το <code>includes/footer.php</code> δουλεύουν σωστά.
        </p>
        <p>
            Δες προσεκτικά το navigation στην κορυφή. Πρέπει να αλλάζει
            ανάλογα με την κατάσταση: logged in / guest / admin.
        </p>
    </section>

    <section class="card mt-lg">
        <h2>Τρέχουσα κατάσταση</h2>

        <?php if (isLoggedIn()): ?>
            <?php $u = getCurrentUser(); ?>
            <p class="alert-success">
                ✅ Είσαι logged in ως <strong><?= escapeHtml($u['username']) ?></strong>
                (id: <?= (int) $u['id'] ?>,
                points: <?= (int) $u['points'] ?>,
                admin: <?= $u['is_admin'] ? 'ναι' : 'όχι' ?>).
            </p>
            <p>
                Στο header πρέπει να βλέπεις:
            </p>
            <ul>
                <li>Το username σου και τους πόντους σου</li>
                <?php if (isAdmin()): ?>
                    <li>Επιπλέον link "Admin" (πράσινο)</li>
                <?php endif; ?>
                <li>Κουμπί "Αποσύνδεση" (κόκκινο)</li>
            </ul>
        <?php else: ?>
            <p class="alert-info">
                ℹ️ Δεν είσαι logged in.
            </p>
            <p>
                Στο header πρέπει να βλέπεις:
            </p>
            <ul>
                <li>Link "Σύνδεση"</li>
                <li>Κουμπί "Εγγραφή" (CTA — orange background)</li>
            </ul>
            <p>
                Πήγαινε στο <a href="/unibite/login.php">login</a> και
                συνδέσου ως <code>testuser1</code> /
                <code>testpassword</code> για να δεις το logged-in view.
            </p>
            <p>
                Ή ως <code>admin</code> για να δεις το admin view —
                αλλά πρόσεξε ότι ο admin έχει placeholder hash και δεν
                μπορεί να κάνει login χωρίς να αλλάξει το hash του.
            </p>
        <?php endif; ?>
    </section>

    <section class="card mt-lg">
        <h2>Mobile responsive test</h2>
        <p>
            Άνοιξε DevTools (F12) → Toggle device toolbar (Ctrl+Shift+M)
            → επίλεξε iPhone ή iPad → δες πώς συμπεριφέρεται το header.
        </p>
        <p>
            Στο mobile πρέπει να εμφανίζεται το hamburger button (☰) στα
            δεξιά. Πάτησέ το για να δεις το menu. Όταν το πατήσεις:
        </p>
        <ul>
            <li>Οι τρεις οριζόντιες γραμμές του πρέπει να γίνουν X</li>
            <li>Το menu εμφανίζεται από κάτω</li>
            <li>Πάτα ξανά για να κλείσει</li>
        </ul>
    </section>

    <section class="card mt-lg">
        <h2>Scroll test (sticky header)</h2>
        <p>
            Scroll-άρε προς τα κάτω. Το header πρέπει να παραμένει
            κολλημένο στην κορυφή της οθόνης (sticky behavior).
        </p>
        <?php for ($i = 1; $i <= 30; $i++): ?>
            <p>
                Γραμμή <?= $i ?>: Lorem ipsum dolor sit amet, consectetur adipiscing
                elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
        <?php endfor; ?>
    </section>

</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
