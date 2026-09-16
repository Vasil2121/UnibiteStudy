<?php

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/includes/auth.php';

requireLoginPage();

$currentUser = getCurrentUser();

$transactions = [];
$stmt = $conn->prepare(
    "SELECT delta, reason, created_at
     FROM point_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC"
);
$stmt->bind_param("i", $currentUser['id']);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $transactions[] = $row;
}
$stmt->close();

$pageTitle = 'Το Προφίλ μου';
require_once __DIR__ . '/includes/header.php';
?>

    <div class="profile-container" style="max-width: 800px; margin: 40px auto; padding: 0 20px;">

        <section class="profile-card" style="background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 30px;">
            <h2>👤 Στοιχεία Λογαριασμού</h2>
            <p><strong>Όνοματεπώνυμο:</strong> <?= escapeHtml($currentUser['full_name']) ?></p>
            <p><strong>Όνομα Χρήστη (Username):</strong> <?= escapeHtml($currentUser['username']) ?></p>
            <p><strong>Email:</strong> <?= escapeHtml($currentUser['email']) ?></p>
            <p><strong>Τρέχον Υπόλοιπο Πόντων:</strong> <span style="color: var(--color-primary); font-weight: bold;"><?= (int)$currentUser['points'] ?> πόντοι</span></p>
        </section>

        <section class="transactions-card" style="background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2>📊 Ιστορικό Πόντων & Δραστηριότητας</h2>

            <?php if (empty($transactions)): ?>
                <p style="color: #666; font-style: italic;">Δεν υπάρχουν ακόμη καταγεγραμμένες συναλλαγές πόντων.</p>
            <?php else: ?>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: left;">
                    <thead>
                    <tr style="border-bottom: 2px solid #eee; background-color: #f9f9f9;">
                        <th style="padding: 12px;">Ημερομηνία</th>
                        <th style="padding: 12px;">Αιτιολογία</th>
                        <th style="padding: 12px; text-align: right;">Πόντοι</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php foreach ($transactions as $tx):

                        $reasonText = match($tx['reason']) {
                            'signup_bonus'       => '🎁 Μπόνους Εγγραφής στην Πλατφόρμα',
                            'request_spent'      => '🍽️ Δέσμευση Μερίδας Φαγητού',
                            'request_refunded'   => '🔄 Επιστροφή Πόντου (Ακύρωση / Απόρριψη)',
                            'pickup_completed'   => '✅ Επιτυχής Παραλαβή Γεύματος',
                            'no_show_penalty'    => '❌ Ποινή: Μη Εμφάνιση στην Παραλαβή',
                            'unrated_penalty'    => '⚠️ Ποινή: Παράλειψη Αξιολόγησης (48 ώρες)',
                            'cook_reward_base'   => '👨‍🍳 Επιβράβευση Μάγειρα (Βασική)',
                            'cook_reward_bonus'  => '🌟 Επιβράβευση Μάγειρα (Υψηλή Βαθμολογία)',
                            default              => '📝 Άλλη Δραστηριότητα'
                        };

                        $isPositive = (int)$tx['delta'] > 0;
                        $color = $isPositive ? '#27ae60' : '#c0392b';
                        $prefix = $isPositive ? '+' : '';
                        ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 12px; font-size: 14px; color: #555;">
                                <?= escapeHtml(date('d/m/Y H:i', strtotime($tx['created_at']))) ?>
                            </td>
                            <td style="padding: 12px; font-size: 15px;">
                                <?= escapeHtml($reasonText) ?>
                            </td>
                            <td style="padding: 12px; text-align: right; font-weight: bold; color: <?= $color ?>;">
                                <?= $prefix . (int)$tx['delta'] ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </section>

    </div>

<?php

require_once __DIR__ . '/includes/footer.php';
?>
