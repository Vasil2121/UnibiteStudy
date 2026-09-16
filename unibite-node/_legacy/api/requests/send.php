<?php

require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

requireLoginApi();
$consumerId = getCurrentUserId();

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);

if (!is_array($payload)) {
    jsonResponse(['success' => false, 'error' => 'Invalid JSON body'], 400);
}

$listingId = isset($payload['listing_id']) ? (int) $payload['listing_id'] : 0;
$slot      = isset($payload['slot'])       ? (int) $payload['slot']       : 0;

if ($listingId <= 0) {
    jsonResponse(['success' => false, 'error' => 'A valid listing_id is required'], 400);
}
if ($slot !== 1 && $slot !== 2) {
    jsonResponse(['success' => false, 'error' => 'Slot must be 1 or 2'], 400);
}

$stmt = $conn->prepare(
    "SELECT cook_id, status, expires_at
       FROM listings
      WHERE id = ?
      LIMIT 1"
);
$stmt->bind_param('i', $listingId);
$stmt->execute();
$listing = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$listing) {
    jsonResponse(['success' => false, 'error' => 'Listing not found'], 404);
}
if ($listing['status'] !== 'active') {
    jsonResponse(['success' => false, 'error' => 'This listing is no longer active'], 400);
}
if (strtotime($listing['expires_at']) <= time()) {
    jsonResponse(['success' => false, 'error' => 'This listing has expired'], 400);
}
if ((int) $listing['cook_id'] === $consumerId) {
    jsonResponse(['success' => false, 'error' => 'You cannot request your own listing'], 400);
}

try {
    $stmt = $conn->prepare(
        "INSERT INTO requests (listing_id, consumer_id, slot, status)
         VALUES (?, ?, ?, 'pending')"
    );
    $stmt->bind_param('iii', $listingId, $consumerId, $slot);
    $stmt->execute();
    $requestId = $conn->insert_id;
    $stmt->close();

} catch (mysqli_sql_exception $e) {
    if ($e->getCode() === 1062) {
        jsonResponse(['success' => false, 'error' => 'You already have a request for this slot'], 409);
    }
    throw $e;
}

$pointsDeducted = addPoints($consumerId, -1, 'request_spent', $requestId);

if (!$pointsDeducted) {
    $stmt = $conn->prepare("DELETE FROM requests WHERE id = ?");
    $stmt->bind_param('i', $requestId);
    $stmt->execute();
    $stmt->close();

    jsonResponse(['success' => false, 'error' => 'Not enough points to make a request (minimum 1 required)'], 400);
}

jsonResponse(['success' => true, 'request_id' => $requestId]);
