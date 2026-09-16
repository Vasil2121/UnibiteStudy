<?php

require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

requireLoginApi();
$consumerId = getCurrentUserId();

$sql = "SELECT r.id, r.listing_id, r.slot, r.status,
               r.requested_at, r.decided_at, r.picked_up_at, r.rate_deadline,
               l.title AS listing_title,
               l.pickup_location_text,
               u.full_name AS cook_name,
               u.username AS cook_username,
               (SELECT COUNT(*) FROM ratings WHERE request_id = r.id) AS is_rated
          FROM requests r
          JOIN listings l ON l.id = r.listing_id
          JOIN users u    ON u.id = l.cook_id
         WHERE r.consumer_id = ?
         ORDER BY r.requested_at DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $consumerId);
$stmt->execute();
$result = $stmt->get_result();

$requests = [];

while ($row = $result->fetch_assoc()) {
    $row['id']         = (int) $row['id'];
    $row['listing_id'] = (int) $row['listing_id'];
    $row['slot']       = (int) $row['slot'];
    $row['is_rated']   = (int) $row['is_rated'] > 0;
    $requests[]        = $row;
}
$stmt->close();

jsonResponse(['success' => true, 'requests' => $requests]);
