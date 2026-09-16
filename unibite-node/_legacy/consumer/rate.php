<?php

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

requireLoginPage();

$requestId     = isset($_GET['request_id']) ? (int) $_GET['request_id'] : 0;
$currentUserId = getCurrentUserId();

$requestData = null;
if ($requestId > 0) {
    $stmt = $conn->prepare(
        "SELECT r.id, r.status, l.title AS listing_title, u.full_name AS cook_name,
                (SELECT COUNT(*) FROM ratings WHERE request_id = r.id) AS already_rated
           FROM requests r
           JOIN listings l ON l.id = r.listing_id
           JOIN users u    ON u.id = l.cook_id
          WHERE r.id = ? AND r.consumer_id = ?
          LIMIT 1"
    );
    $stmt->bind_param('ii', $requestId, $currentUserId);
    $stmt->execute();
    $requestData = $stmt->get_result()->fetch_assoc();
    $stmt->close();
}

$pageTitle = 'Αξιολόγηση Γεύματος';
require_once __DIR__ . '/../includes/header.php';
?>

    <link rel="stylesheet" href="/unibite/css/consumer-requests.css">

    <div class="requests-container">
        <div class="modal__content" style="margin: 3rem auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e4e7eb;">

            <?php if (!$requestData): ?>

                <h2 class="modal__title" style="color: var(--color-error);">Το αίτημα δεν βρέθηκε</h2>
                <p class="modal__subtitle">Δεν έχετε δικαίωμα πρόσβασης ή το αναγνωριστικό είναι άκυρο.</p>
                <a href="/unibite/consumer/my-requests.php" class="rating-form__submit-btn"
                   style="display:block; text-align:center; text-decoration:none;">
                    Επιστροφή στα Αιτήματά μου
                </a>

            <?php elseif ($requestData['status'] !== 'picked_up'): ?>

                <h2 class="modal__title" style="color: var(--color-warning);">Αδυναμία Βαθμολόγησης</h2>
                <p class="modal__subtitle">
                    Μπορείτε να βαθμολογήσετε το γεύμα
                    «<?= escapeHtml($requestData['listing_title']) ?>»
                    μόνο αφού ολοκληρωθεί η παραλαβή.
                </p>
                <a href="/unibite/consumer/my-requests.php" class="rating-form__submit-btn"
                   style="display:block; text-align:center; text-decoration:none;">
                    Επιστροφή στα Αιτήματά μου
                </a>

            <?php elseif ((int) $requestData['already_rated'] > 0): ?>

                <h2 class="modal__title" style="color: var(--color-success);">Ήδη Βαθμολογήθηκε</h2>
                <p class="modal__subtitle">
                    Έχετε ήδη υποβάλει αξιολόγηση για το γεύμα
                    «<?= escapeHtml($requestData['listing_title']) ?>».
                </p>
                <a href="/unibite/consumer/my-requests.php" class="rating-form__submit-btn"
                   style="display:block; text-align:center; text-decoration:none;">
                    Επιστροφή στα Αιτήματά μου
                </a>

            <?php else: ?>

                <h2 class="modal__title">Αξιολόγηση Γεύματος</h2>
                <p class="modal__subtitle">
                    Γεύμα: <strong><?= escapeHtml($requestData['listing_title']) ?></strong><br>
                    Μάγειρας: <strong><?= escapeHtml($requestData['cook_name']) ?></strong>
                </p>

                <div id="rating-alert" class="alert-error is-hidden"></div>
                <div id="rating-success" class="alert-success is-hidden"></div>

                <form id="standalone-rating-form" class="rating-form">
                    <input type="hidden" id="page-request-id" value="<?= $requestId ?>">

                    <div class="rating-form__stars">
                        <span class="star-node" data-value="1">★</span>
                        <span class="star-node" data-value="2">★</span>
                        <span class="star-node" data-value="3">★</span>
                        <span class="star-node" data-value="4">★</span>
                        <span class="star-node" data-value="5">★</span>
                    </div>
                    <input type="hidden" id="page-score-value" value="0">

                    <div class="rating-form__field-group">
                        <label for="page-comment" class="rating-form__label">
                            Σχόλια (Προαιρετικό):
                        </label>
                        <textarea id="page-comment" class="rating-form__textarea"
                                  placeholder="Πώς σας φάνηκε η μερίδα σας;"></textarea>
                    </div>

                    <button type="submit" id="page-submit-btn"
                            class="rating-form__submit-btn" disabled>
                        Υποβολή Βαθμολογίας
                    </button>
                </form>

            <?php endif; ?>

        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const form       = document.getElementById('standalone-rating-form');
            if (!form) return;

            const stars      = document.querySelectorAll('.star-node');
            const scoreInput = document.getElementById('page-score-value');
            const submitBtn  = document.getElementById('page-submit-btn');
            const comment    = document.getElementById('page-comment');
            const requestId  = parseInt(document.getElementById('page-request-id').value, 10);
            const alertEl    = document.getElementById('rating-alert');
            const successEl  = document.getElementById('rating-success');

            stars.forEach(star => {
                star.addEventListener('click', function () {
                    const val = parseInt(this.dataset.value, 10);
                    scoreInput.value = val;
                    submitBtn.disabled = false;

                    stars.forEach(s => {
                        s.classList.toggle('is-active', parseInt(s.dataset.value, 10) <= val);
                    });
                });
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                if (parseInt(scoreInput.value, 10) === 0) {
                    alertEl.textContent = 'Παρακαλώ επέλεξε βαθμολογία.';
                    alertEl.classList.remove('is-hidden');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Υποβολή...';
                alertEl.classList.add('is-hidden');

                try {
                    const response = await fetch('/unibite/api/ratings/submit.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            request_id: requestId,
                            score:      parseInt(scoreInput.value, 10),
                            comment:    comment.value
                        })
                    });
                    const data = await response.json();

                    if (data.success) {
                        successEl.textContent = '✓ Η βαθμολογία σου καταχωρήθηκε!';
                        successEl.classList.remove('is-hidden');
                        form.classList.add('is-hidden');
                        setTimeout(() => {
                            window.location.href = '/unibite/consumer/my-requests.php';
                        }, 1500);
                    } else {
                        alertEl.textContent = data.error || 'Κάτι πήγε στραβά.';
                        alertEl.classList.remove('is-hidden');
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Υποβολή Βαθμολογίας';
                    }
                } catch {
                    alertEl.textContent = 'Αδυναμία σύνδεσης με τον server.';
                    alertEl.classList.remove('is-hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Υποβολή Βαθμολογίας';
                }
            });
        });

    </script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
