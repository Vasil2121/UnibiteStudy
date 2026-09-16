<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

requireAdminPage();

$res1 = $conn->query(
    "SELECT COALESCE(SUM(portions_total), 0) AS total_portions
       FROM listings
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
);
$totalPortions = (int) $res1->fetch_assoc()['total_portions'];

$res2 = $conn->query(
    "SELECT COUNT(*) AS total_requests
       FROM requests
      WHERE requested_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
);
$totalRequests = (int) $res2->fetch_assoc()['total_requests'];

$res3 = $conn->query(
    "SELECT COUNT(*) AS successful_pickups
       FROM requests
      WHERE status = 'picked_up'
        AND picked_up_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
);
$successfulPickups = (int) $res3->fetch_assoc()['successful_pickups'];

$successRate = $totalRequests > 0
    ? round(($successfulPickups / $totalRequests) * 100, 1)
    : 0;

$pageTitle = 'Διαχειριστικό Πάνελ';
require_once __DIR__ . '/../includes/header.php';
?>

    <div class="container" style="padding-top: var(--space-xl); padding-bottom: var(--space-2xl);">

        <div style="margin-bottom: var(--space-lg);">
            <h1 style="font-size: var(--text-2xl); margin-bottom: var(--space-xs);">
                📊 Στατιστικά Πλατφόρμας UniBite
            </h1>
            <p style="color: var(--color-text-muted); margin: 0;">
                Στατιστικά των <strong>τελευταίων 30 ημερών</strong>.
                Καλώς ήρθες, <?= escapeHtml($currentUser['full_name']) ?>.
            </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-xl);">

            <div class="card" style="border-left: 4px solid var(--color-info); text-align: center;">
                <div style="font-size: 2rem; margin-bottom: var(--space-xs);">🍲</div>
                <p style="font-size: var(--text-sm); color: var(--color-text-muted); margin: 0 0 var(--space-xs);">
                    Μερίδες που Προσφέρθηκαν
                </p>
                <p style="font-size: var(--text-3xl); font-weight: var(--weight-bold); margin: 0; color: var(--color-text);">
                    <?= $totalPortions ?>
                </p>
            </div>

            <div class="card" style="border-left: 4px solid var(--color-secondary); text-align: center;">
                <div style="font-size: 2rem; margin-bottom: var(--space-xs);">📋</div>
                <p style="font-size: var(--text-sm); color: var(--color-text-muted); margin: 0 0 var(--space-xs);">
                    Αιτήματα Κράτησης
                </p>
                <p style="font-size: var(--text-3xl); font-weight: var(--weight-bold); margin: 0; color: var(--color-text);">
                    <?= $totalRequests ?>
                </p>
            </div>

            <div class="card" style="border-left: 4px solid var(--color-success); text-align: center;">
                <div style="font-size: 2rem; margin-bottom: var(--space-xs);">🤝</div>
                <p style="font-size: var(--text-sm); color: var(--color-text-muted); margin: 0 0 var(--space-xs);">
                    Ολοκληρωμένες Παραλαβές
                </p>
                <p style="font-size: var(--text-3xl); font-weight: var(--weight-bold); margin: 0; color: var(--color-text);">
                    <?= $successfulPickups ?>
                </p>
            </div>

            <div class="card" style="border-left: 4px solid var(--color-primary); text-align: center;">
                <div style="font-size: 2rem; margin-bottom: var(--space-xs);">📈</div>
                <p style="font-size: var(--text-sm); color: var(--color-text-muted); margin: 0 0 var(--space-xs);">
                    Ποσοστό Επιτυχίας
                </p>
                <p style="font-size: var(--text-3xl); font-weight: var(--weight-bold); margin: 0; color: var(--color-text);">
                    <?= $successRate ?>%
                </p>
            </div>

        </div>

        <div class="card">
            <h2 style="font-size: var(--text-lg); margin-bottom: var(--space-md);">
                🔗 Ενέργειες Διαχείρισης
            </h2>
            <a href="/unibite/admin/leaderboard.php" class="btn-primary">
                🏆 Πίνακες Κατάταξης
            </a>
        </div>

    </div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
