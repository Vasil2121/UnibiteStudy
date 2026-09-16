<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

requireLoginApi();
$cookId = getCurrentUserId();

$requestId = filter_var($_POST['request_id'] ?? null, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1],
]);
if ($requestId === false) {
    jsonResponse(['success' => false, 'error' => 'Invalid request id'], 400);
}

$stmt = $conn->prepare(
    "SELECT r.status, r.consumer_id, l.cook_id
       FROM requests r
       JOIN listings l ON l.id = r.listing_id
      WHERE r.id = ?"
);
$stmt->bind_param('i', $requestId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    jsonResponse(['success' => false, 'error' => 'Request not found'], 404);
}
if ((int) $row['cook_id'] !== $cookId) {
    jsonResponse(['success' => false, 'error' => 'Not your request'], 403);
}
if ($row['status'] !== 'approved') {
    jsonResponse(['success' => false, 'error' => 'Request is not approved'], 409);
}

$stmt = $conn->prepare(
    "UPDATE requests SET status = 'no_show' WHERE id = ? AND status = 'approved'"
);
$stmt->bind_param('i', $requestId);
$stmt->execute();
$affected = $stmt->affected_rows;
$stmt->close();

if ($affected !== 1) {
    jsonResponse(['success' => false, 'error' => 'Request is no longer approved'], 409);
}

$consumerId = (int) $row['consumer_id'];
$penaltyApplied = addPoints($consumerId, -1, 'no_show_penalty', $requestId);

jsonResponse([
    'success'         => true,
    'request_id'      => $requestId,
    'status'          => 'no_show',
    'penalty_applied' => $penaltyApplied,
]);
