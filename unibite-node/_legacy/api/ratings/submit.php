<?php

require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

requireLoginApi();
$currentUserId = getCurrentUserId();

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);

if (!is_array($payload)) {
    jsonResponse(['success' => false, 'error' => 'Invalid JSON body'], 400);
}

$requestId = isset($payload['request_id']) ? (int)$payload['request_id'] : 0;
$score     = isset($payload['score']) ? (int)$payload['score'] : 0;
$comment   = isset($payload['comment']) ? cleanInput($payload['comment']) : '';

if ($requestId <= 0) {
    jsonResponse(['success' => false, 'error' => 'A valid request record identifier is required.'], 400);
}
if ($score < 1 || $score > 5) {
    jsonResponse(['success' => false, 'error' => 'Evaluation score bounds must remain strictly between 1 and 5.'], 400);
}

$stmt = $conn->prepare(
    "SELECT r.consumer_id, r.status, l.cook_id
       FROM requests r
       JOIN listings l ON l.id = r.listing_id
      WHERE r.id = ? LIMIT 1"
);
$stmt->bind_param('i', $requestId);
$stmt->execute();
$request = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$request) {
    jsonResponse(['success' => false, 'error' => 'The target request record does not exist.'], 404);
}
if ((int)$request['consumer_id'] !== $currentUserId) {
    jsonResponse(['success' => false, 'error' => 'Access denied: You do not own this request record.'], 403);
}
if ($request['status'] !== 'picked_up') {
    jsonResponse(['success' => false, 'error' => 'Validation error: Meals can only be rated after a successful pickup confirmation.'], 400);
}

$stmt = $conn->prepare("SELECT id FROM ratings WHERE request_id = ? LIMIT 1");
$stmt->bind_param('i', $requestId);
$stmt->execute();
$alreadyRated = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($alreadyRated) {
    jsonResponse(['success' => false, 'error' => 'Security alert: This meal partition has already been evaluated.'], 409);
}

$stmt = $conn->prepare("INSERT INTO ratings (request_id, score, comment) VALUES (?, ?, ?)");
$stmt->bind_param('iis', $requestId, $score, $comment);
$stmt->execute();
$stmt->close();

$cookId = (int)$request['cook_id'];

addPoints($cookId, 1, 'cook_reward_base', $requestId);

if ($score > 3) {
    addPoints($cookId, 1, 'cook_reward_bonus', $requestId);
}

jsonResponse([
    'success' => true,
    'message' => 'Thank you! Your feedback has been posted and cook assets updated.'
]);
