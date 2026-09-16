<?php

require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

requireAdminApi();

try {

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

    jsonResponse([
        'success' => true,
        'period'  => 'last_30_days',
        'data'    => [
            'total_portions'     => $totalPortions,
            'total_requests'     => $totalRequests,
            'successful_pickups' => $successfulPickups,
            'success_rate'       => $successRate,
        ],
    ]);

} catch (mysqli_sql_exception $e) {
    jsonResponse(['success' => false, 'error' => 'Database query failed', 'detail' => $e->getMessage()], 500);
}
