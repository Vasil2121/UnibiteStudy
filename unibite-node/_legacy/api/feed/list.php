<?php

require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

requireLoginApi();
$currentUserId = getCurrentUserId();

$stmt = $conn->prepare(
    "SELECT l.id, l.cook_id, u.full_name AS cook_name, l.title, l.description, l.photo_filename,
            l.portions_total, l.portions_available,
            l.pickup_lat, l.pickup_lng, l.pickup_location_text,
            l.pickup_time_from, l.pickup_time_to,
            l.status, l.created_at, l.expires_at
       FROM listings l
       JOIN users u ON l.cook_id = u.id
      WHERE l.cook_id != ?
        AND l.status != 'deleted'
        AND l.expires_at > NOW()
      ORDER BY l.created_at DESC"
);
$stmt->bind_param('i', $currentUserId);
$stmt->execute();
$result = $stmt->get_result();

$listings = [];
$indexById = [];

while ($row = $result->fetch_assoc()) {
    $row['id']                 = (int) $row['id'];
    $row['cook_id']            = (int) $row['cook_id'];
    $row['portions_total']     = (int) $row['portions_total'];
    $row['portions_available'] = (int) $row['portions_available'];
    $row['pickup_lat']         = (float) $row['pickup_lat'];
    $row['pickup_lng']         = (float) $row['pickup_lng'];
    $row['allergens']          = [];

    $indexById[$row['id']]     = count($listings);
    $listings[]                = $row;
}
$stmt->close();

if ($listings !== []) {
    $ids          = array_keys($indexById);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $types        = str_repeat('i', count($ids));

    $stmt = $conn->prepare(
        "SELECT la.listing_id, a.id, a.name_el, a.icon
           FROM listing_allergens la
           JOIN allergens a ON a.id = la.allergen_id
          WHERE la.listing_id IN ($placeholders)
          ORDER BY a.id"
    );
    $stmt->bind_param($types, ...$ids);
    $stmt->execute();
    $res = $stmt->get_result();

    while ($row = $res->fetch_assoc()) {
        $idx = $indexById[(int) $row['listing_id']];
        $listings[$idx]['allergens'][] = [
            'id'      => (int) $row['id'],
            'name_el' => $row['name_el'],
            'icon'    => $row['icon'],
        ];
    }
    $stmt->close();
}

jsonResponse(['success' => true, 'listings' => $listings]);
