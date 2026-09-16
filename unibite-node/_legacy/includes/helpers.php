<?php

function jsonResponse(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function cleanInput($value): string {
    return trim((string) $value);
}

function escapeHtml($value): string {
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function calculateDistance(float $lat1, float $lng1, float $lat2, float $lng2): float {
    $earthRadiusKm = 6371.0;

    $lat1Rad = deg2rad($lat1);
    $lat2Rad = deg2rad($lat2);
    $deltaLat = deg2rad($lat2 - $lat1);
    $deltaLng = deg2rad($lng2 - $lng1);

    $a = sin($deltaLat / 2) * sin($deltaLat / 2)
       + cos($lat1Rad) * cos($lat2Rad)
       * sin($deltaLng / 2) * sin($deltaLng / 2);

    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

    return $earthRadiusKm * $c;
}

function addPoints(int $userId, int $delta, string $reason, ?int $relatedRequestId = null): bool {
    global $conn;

    $conn->begin_transaction();

    try {

        $stmt = $conn->prepare(
            "UPDATE users
             SET points = points + ?
             WHERE id = ? AND points + ? >= 0"
        );

        $stmt->bind_param("iii", $delta, $userId, $delta);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();

        if ($affected === 0) {

            $conn->rollback();
            return false;
        }

        $stmt = $conn->prepare(
            "INSERT INTO point_transactions
                 (user_id, delta, reason, related_request_id)
             VALUES (?, ?, ?, ?)"
        );
        $stmt->bind_param("iisi", $userId, $delta, $reason, $relatedRequestId);

        if ($relatedRequestId === null) {

            $stmt->close();
            $stmt = $conn->prepare(
                "INSERT INTO point_transactions
                     (user_id, delta, reason, related_request_id)
                 VALUES (?, ?, ?, NULL)"
            );
            $stmt->bind_param("iis", $userId, $delta, $reason);
        }
        $stmt->execute();
        $stmt->close();

        $conn->commit();
        return true;

    } catch (mysqli_sql_exception $e) {

        $conn->rollback();
        throw $e;
    }
}
