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

$conn->begin_transaction();

try {
    $stmt = $conn->prepare(
        "SELECT r.status, r.listing_id, l.cook_id, l.portions_available
           FROM requests r
           JOIN listings l ON l.id = r.listing_id
          WHERE r.id = ?
          FOR UPDATE"
    );
    $stmt->bind_param('i', $requestId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        $conn->rollback();
        jsonResponse(['success' => false, 'error' => 'Request not found'], 404);
    }
    if ((int) $row['cook_id'] !== $cookId) {
        $conn->rollback();
        jsonResponse(['success' => false, 'error' => 'Not your request'], 403);
    }
    if ($row['status'] !== 'pending') {
        $conn->rollback();
        jsonResponse(['success' => false, 'error' => 'Request is not pending'], 409);
    }
    if ((int) $row['portions_available'] <= 0) {
        $conn->rollback();
        jsonResponse(['success' => false, 'error' => 'No portions available'], 409);
    }

    $listingId = (int) $row['listing_id'];

    $stmt = $conn->prepare("UPDATE requests SET status = 'approved', decided_at = NOW() WHERE id = ?");
    $stmt->bind_param('i', $requestId);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare("UPDATE listings SET portions_available = portions_available - 1 WHERE id = ?");
    $stmt->bind_param('i', $listingId);
    $stmt->execute();
    $stmt->close();

    $conn->commit();

} catch (Throwable $e) {
    $conn->rollback();
    jsonResponse(['success' => false, 'error' => 'Could not approve request'], 500);
}

jsonResponse(['success' => true, 'request_id' => $requestId, 'status' => 'approved']);
