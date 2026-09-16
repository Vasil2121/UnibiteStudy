<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

requireLoginApi();
$cookId = getCurrentUserId();

$stmt = $conn->prepare(
    "SELECT r.id, r.listing_id, r.consumer_id, r.slot, r.status,
            r.requested_at, r.decided_at, r.picked_up_at, r.rate_deadline,
            l.title AS listing_title,
            l.portions_available,
            u.full_name AS consumer_name,
            u.username  AS consumer_username
       FROM requests r
       JOIN listings l ON l.id = r.listing_id
       JOIN users u    ON u.id = r.consumer_id
      WHERE l.cook_id = ?
      ORDER BY FIELD(r.status, 'pending', 'approved', 'picked_up', 'no_show', 'rejected'),
               r.requested_at DESC"
);
$stmt->bind_param('i', $cookId);
$stmt->execute();
$result = $stmt->get_result();

$requests = [];
while ($row = $result->fetch_assoc()) {
    $row['id']                 = (int) $row['id'];
    $row['listing_id']         = (int) $row['listing_id'];
    $row['consumer_id']        = (int) $row['consumer_id'];
    $row['slot']               = (int) $row['slot'];
    $row['portions_available'] = (int) $row['portions_available'];
    $requests[] = $row;
}
$stmt->close();

jsonResponse(['success' => true, 'requests' => $requests]);
