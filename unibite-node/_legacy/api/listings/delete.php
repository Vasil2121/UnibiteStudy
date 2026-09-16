<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

requireLoginApi();
$cookId = getCurrentUserId();

$listingId = filter_var($_POST['listing_id'] ?? null, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1],
]);
if ($listingId === false) {
    jsonResponse(['success' => false, 'error' => 'Invalid listing id'], 400);
}

$stmt = $conn->prepare("SELECT cook_id, status FROM listings WHERE id = ?");
$stmt->bind_param('i', $listingId);
$stmt->execute();
$listing = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$listing) {
    jsonResponse(['success' => false, 'error' => 'Listing not found'], 404);
}
if ((int) $listing['cook_id'] !== $cookId) {
    jsonResponse(['success' => false, 'error' => 'Not your listing'], 403);
}
if ($listing['status'] === 'deleted') {
    jsonResponse(['success' => false, 'error' => 'Already deleted'], 409);
}

$stmt = $conn->prepare("UPDATE listings SET status = 'deleted' WHERE id = ?");
$stmt->bind_param('i', $listingId);
$stmt->execute();
$stmt->close();

jsonResponse(['success' => true, 'listing_id' => $listingId]);
