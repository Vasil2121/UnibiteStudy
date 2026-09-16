<?php

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

requireAdminPage();

$donorsQuery = "
    SELECT u.full_name, u.email, COUNT(l.id) AS total_listings
    FROM users u
    JOIN listings l ON u.id = l.cook_id
    GROUP BY u.id
    ORDER BY total_listings DESC
    LIMIT 10
";
$donorsResult = $conn->query($donorsQuery);

$ratedQuery = "
    SELECT u.full_name, u.email, AVG(r.score) AS avg_score, COUNT(r.id) AS total_ratings
    FROM users u
    JOIN listings l ON u.id = l.cook_id
    JOIN requests req ON l.id = req.listing_id
    JOIN ratings r ON req.id = r.request_id
    GROUP BY u.id
    ORDER BY avg_score DESC, total_ratings DESC
    LIMIT 10
";
$ratedResult = $conn->query($ratedQuery);

$commentsQuery = "
    SELECT r.score, r.comment, r.rated_at, u.full_name AS cook_name
    FROM ratings r
    JOIN requests req ON r.request_id = req.id
    JOIN listings l ON req.listing_id = l.id
    JOIN users u ON l.cook_id = u.id
    WHERE r.comment IS NOT NULL AND r.comment != ''
    ORDER BY r.rated_at DESC
    LIMIT 5
";
$commentsResult = $conn->query($commentsQuery);

$pageTitle = 'Πίνακες Κατάταξης (Leaderboards)';
require_once __DIR__ . '/../includes/header.php';
?>

    <div class="leaderboard-container" style="max-width: 1100px; margin: 40px auto; padding: 0 20px;">

        <div style="margin-bottom: 30px;">
            <h1 style="color: #2c3e50;">🏆 Πανεπιστημιακή Κατάταξη Φοιτητών</h1>
            <p style="color: #7f8c8d;">Εδώ αναδεικνύονται οι ήρωες της κοινότητας UniBite: οι φοιτητές με τη μεγαλύτερη προσφορά και οι καλύτεροι μάγειρες!</p>
            <a href="/unibite/admin/dashboard.php" style="color: #3498db; text-decoration: none; font-weight: bold; font-size: 14px;">← Επιστροφή στο Dashboard</a>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 30px; margin-bottom: 40px;">

            <div style="flex: 1; min-width: 300px; background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h2 style="color: #27ae60; border-bottom: 2px solid #27ae60; padding-bottom: 10px; margin-top: 0;">🤝 Πρώτοι σε Προσφορά (Top Donors)</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: left;">
                    <thead>
                    <tr style="background: #f4fbf7; border-bottom: 1px solid #ddd;">
                        <th style="padding: 10px; font-size: 14px;">Θέση</th>
                        <th style="padding: 10px; font-size: 14px;">Φοιτητής</th>
                        <th style="padding: 10px; font-size: 14px; text-align: right;">Αγγελίες</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                    $pos = 1;
                    if ($donorsResult->num_rows === 0): ?>
                        <tr><td colspan="3" style="padding: 15px; color: #888; font-style: italic;">Δεν υπάρχουν ακόμη δεδομένα προσφοράς.</td></tr>
                    <?php else:
                        while($row = $donorsResult->fetch_assoc()): ?>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 12px; font-weight: bold; color: #555;"><?= $pos++ ?>°</td>
                                <td style="padding: 12px;">
                                    <div style="font-weight: 500; color: #2c3e50;"><?= escapeHtml($row['full_name']) ?></div>
                                    <div style="font-size: 12px; color: #7f8c8d;"><?= escapeHtml($row['email']) ?></div>
                                </td>
                                <td style="padding: 12px; text-align: right; font-weight: bold; color: #27ae60;"><?= (int)$row['total_listings'] ?></td>
                            </tr>
                        <?php endwhile; endif; ?>
                    </tbody>
                </table>
            </div>

            <div style="flex: 1; min-width: 300px; background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h2 style="color: #f1c40f; border-bottom: 2px solid #f1c40f; padding-bottom: 10px; margin-top: 0;">⭐ Καλύτερες Κριτικές (Top Rated)</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: left;">
                    <thead>
                    <tr style="background: #fffdf3; border-bottom: 1px solid #ddd;">
                        <th style="padding: 10px; font-size: 14px;">Θέση</th>
                        <th style="padding: 10px; font-size: 14px;">Μάγειρας</th>
                        <th style="padding: 10px; font-size: 14px; text-align: right;">Μέση Βαθμολογία</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                    $pos = 1;
                    if ($ratedResult->num_rows === 0): ?>
                        <tr><td colspan="3" style="padding: 15px; color: #888; font-style: italic;">Δεν υπάρχουν ακόμη αξιολογήσεις γευμάτων.</td></tr>
                    <?php else:
                        while($row = $ratedResult->fetch_assoc()): ?>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 12px; font-weight: bold; color: #555;"><?= $pos++ ?>°</td>
                                <td style="padding: 12px;">
                                    <div style="font-weight: 500; color: #2c3e50;"><?= escapeHtml($row['full_name']) ?></div>
                                    <div style="font-size: 11px; color: #7f8c8d;"><?= (int)$row['total_ratings'] ?> κριτικές</div>
                                </td>
                                <td style="padding: 12px; text-align: right; font-weight: bold; color: #f39c12;">
                                    🌟 <?= round((float)$row['avg_score'], 2) ?> / 5
                                </td>
                            </tr>
                        <?php endwhile; endif; ?>
                    </tbody>
                </table>
            </div>

        </div>

        <div style="background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h2 style="color: #2c3e50; margin-top:0; border-bottom: 2px solid #eee; padding-bottom: 10px;">💬 Πρόσφατα Σχόλια & Κριτικές Φοιτητών</h2>

            <?php if ($commentsResult->num_rows === 0): ?>
                <p style="color: #888; font-style: italic; margin-bottom: 0;">Δεν υπάρχουν ακόμη γραπτά σχόλια στην πλατφόρμα.</p>
            <?php else: ?>
                <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px;">
                    <?php while($commentRow = $commentsResult->fetch_assoc()): ?>
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #f1c40f;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong>Για τον μάγειρα: <span style="color: #34495e;"><?= escapeHtml($commentRow['cook_name']) ?></span></strong>
                                <span style="color: #f39c12; font-weight: bold;">⭐ <?= (int)$commentRow['score'] ?>/5</span>
                            </div>
                            <p style="margin: 0; color: #555; font-style: italic;">"<?= escapeHtml($commentRow['comment']) ?>"</p>
                            <small style="color: #999; display: block; margin-top: 5px; text-align: right;">
                                <?= date('d/m/Y H:i', strtotime($commentRow['rated_at'])) ?>
                            </small>
                        </div>
                    <?php endwhile; ?>
                </div>
            <?php endif; ?>
        </div>

    </div>

<?php

require_once __DIR__ . '/../includes/footer.php';
?>
