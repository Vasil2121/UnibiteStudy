<?php

require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

requireAdminApi();

try {

    $donorsResult = $conn->query("
        SELECT u.id, u.full_name, u.email, COUNT(l.id) AS total_listings
        FROM users u
        JOIN listings l ON u.id = l.cook_id
        GROUP BY u.id
        ORDER BY total_listings DESC
        LIMIT 10
    ");
    $topDonors = [];
    while ($row = $donorsResult->fetch_assoc()) {
        $topDonors[] = [
            'id'             => (int)$row['id'],
            'full_name'      => $row['full_name'],
            'email'          => $row['email'],
            'total_listings' => (int)$row['total_listings']
        ];
    }

    $ratedResult = $conn->query("
        SELECT u.id, u.full_name, u.email, AVG(r.score) AS avg_score, COUNT(r.id) AS total_ratings
        FROM users u
        JOIN listings l ON u.id = l.cook_id
        JOIN requests req ON l.id = req.listing_id
        JOIN ratings r ON req.id = r.request_id
        GROUP BY u.id
        ORDER BY avg_score DESC, total_ratings DESC
        LIMIT 10
    ");
    $topRated = [];
    while ($row = $ratedResult->fetch_assoc()) {
        $topRated[] = [
            'id'            => (int)$row['id'],
            'full_name'     => $row['full_name'],
            'email'         => $row['email'],
            'avg_score'     => round((float)$row['avg_score'], 2),
            'total_ratings' => (int)$row['total_ratings']
        ];
    }

    $commentsResult = $conn->query("
        SELECT r.score, r.comment, r.rated_at, u.full_name AS cook_name
        FROM ratings r
        JOIN requests req ON r.request_id = req.id
        JOIN listings l ON req.listing_id = l.id
        JOIN users u ON l.cook_id = u.id
        WHERE r.comment IS NOT NULL AND r.comment != ''
        ORDER BY r.rated_at DESC
        LIMIT 5
    ");
    $recentComments = [];
    while ($row = $commentsResult->fetch_assoc()) {
        $recentComments[] = [
            'cook_name' => $row['cook_name'],
            'score'     => (int)$row['score'],
            'comment'   => $row['comment'],
            'rated_at'  => $row['rated_at']
        ];
    }

    jsonResponse([
        'success' => true,
        'data' => [
            'top_donors'      => $topDonors,
            'top_rated'       => $topRated,
            'recent_comments' => $recentComments
        ]
    ]);

} catch (mysqli_sql_exception $e) {
    jsonResponse([
        'success' => false,
        'error'   => 'Database query failed',
        'detail'  => $e->getMessage()
    ], 500);
}
