<?php

require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

requireLoginApi();
$currentUserId = getCurrentUserId();

$toMysqlDateTime = static function (string $raw): ?string {
    $raw = trim($raw);
    if ($raw === '') {
        return null;
    }
    try {
        $dt = new DateTime($raw);
    } catch (Exception $e) {
        return null;
    }
    return $dt->format('Y-m-d H:i:s');
};

$fields = [];

$listingId = filter_var($_POST['listing_id'] ?? null, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1],
]);
if ($listingId === false) {
    jsonResponse(['success' => false, 'error' => 'Invalid listing_id'], 400);
}

$title = cleanInput($_POST['title'] ?? '');
if ($title === '') {
    $fields['title'] = 'Ο τίτλος είναι υποχρεωτικός.';
} elseif (mb_strlen($title) > 100) {
    $fields['title'] = 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες.';
}

$description = cleanInput($_POST['description'] ?? '');
if ($description === '') {
    $description = null;
}

$portions = filter_var($_POST['portions'] ?? null, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1],
]);
if ($portions === false) {
    $fields['portions'] = 'Οι μερίδες πρέπει να είναι ακέραιος αριθμός ≥ 1.';
}

$pickupLocationText = cleanInput($_POST['pickup_location_text'] ?? '');
if ($pickupLocationText === '') {
    $fields['pickup_location_text'] = 'Το σημείο παραλαβής είναι υποχρεωτικό.';
} elseif (mb_strlen($pickupLocationText) > 255) {
    $fields['pickup_location_text'] = 'Το σημείο παραλαβής είναι πολύ μεγάλο (μέγιστο 255 χαρακτήρες).';
}

$pickupLat = filter_var($_POST['pickup_lat'] ?? null, FILTER_VALIDATE_FLOAT);
if ($pickupLat === false || $pickupLat < -90 || $pickupLat > 90) {
    $fields['pickup_lat'] = 'Μη έγκυρο γεωγραφικό πλάτος.';
}
$pickupLng = filter_var($_POST['pickup_lng'] ?? null, FILTER_VALIDATE_FLOAT);
if ($pickupLng === false || $pickupLng < -180 || $pickupLng > 180) {
    $fields['pickup_lng'] = 'Μη έγκυρο γεωγραφικό μήκος.';
}

$pickupFrom = $toMysqlDateTime($_POST['pickup_time_from'] ?? '');
if ($pickupFrom === null) {
    $fields['pickup_time_from'] = 'Μη έγκυρη ώρα έναρξης παραλαβής.';
}
$pickupTo = $toMysqlDateTime($_POST['pickup_time_to'] ?? '');
if ($pickupTo === null) {
    $fields['pickup_time_to'] = 'Μη έγκυρη ώρα λήξης παραλαβής.';
}
if ($pickupFrom !== null && $pickupTo !== null && $pickupFrom >= $pickupTo) {
    $fields['pickup_time_to'] = 'Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.';
}

$allergenIds = [];
if (isset($_POST['allergen_ids'])) {
    $raw = $_POST['allergen_ids'];
    if (!is_array($raw)) {
        $fields['allergens'] = 'Μη έγκυρη λίστα αλλεργιογόνων.';
    } else {
        foreach ($raw as $val) {
            $id = filter_var($val, FILTER_VALIDATE_INT);
            if ($id !== false && $id > 0) {
                $allergenIds[$id] = $id;
            }
        }
        $allergenIds = array_values($allergenIds);

        if ($allergenIds !== []) {
            $placeholders = implode(',', array_fill(0, count($allergenIds), '?'));
            $types        = str_repeat('i', count($allergenIds));
            $stmt = $conn->prepare("SELECT id FROM allergens WHERE id IN ($placeholders)");
            $stmt->bind_param($types, ...$allergenIds);
            $stmt->execute();
            $result = $stmt->get_result();
            $found  = [];
            while ($row = $result->fetch_assoc()) {
                $found[] = (int) $row['id'];
            }
            $stmt->close();

            if (count($found) !== count($allergenIds)) {
                $fields['allergens'] = 'Ένα ή περισσότερα αλλεργιογόνα δεν είναι έγκυρα.';
            }
        }
    }
}

if ($fields !== []) {
    jsonResponse(['success' => false, 'error' => 'Validation failed', 'fields' => $fields], 400);
}

$stmt = $conn->prepare(
    "SELECT cook_id, status, photo_filename, portions_total, portions_available
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
if ((int) $listing['cook_id'] !== $currentUserId) {
    jsonResponse(['success' => false, 'error' => 'Not your listing'], 403);
}
if ($listing['status'] === 'deleted') {
    jsonResponse(['success' => false, 'error' => 'Cannot edit a deleted listing'], 400);
}

$stmt = $conn->prepare(
    "SELECT COUNT(*) AS cnt
       FROM requests
      WHERE listing_id = ?
        AND status IN ('pending', 'approved')"
);
$stmt->bind_param('i', $listingId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ((int) $row['cnt'] > 0) {
    jsonResponse([
        'success' => false,
        'error'   => 'Δεν μπορείς να επεξεργαστείς την αγγελία ενώ υπάρχουν εκκρεμή ή εγκεκριμένα αιτήματα.',
    ], 400);
}

$portionsClaimed      = (int) $listing['portions_total'] - (int) $listing['portions_available'];
$newPortionsAvailable = $portions - $portionsClaimed;

if ($newPortionsAvailable < 0) {
    jsonResponse([
        'success' => false,
        'error'   => 'Δεν μπορείς να μειώσεις τις μερίδες κάτω από τον αριθμό που έχουν ήδη διεκδικηθεί.',
    ], 400);
}

$photoFilename = $listing['photo_filename'];
$photoTmpPath  = null;
$newPhotoPath  = null;

if (isset($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
    $photo = $_FILES['photo'];

    if ($photo['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['success' => false, 'error' => 'Η μεταφόρτωση της φωτογραφίας απέτυχε.'], 400);
    }
    if ($photo['size'] > 5 * 1024 * 1024) {
        jsonResponse(['success' => false, 'error' => 'Η φωτογραφία ξεπερνά τα 5 MB.'], 400);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($photo['tmp_name']);
    $allowedMimes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    ];
    if (!isset($allowedMimes[$mime])) {
        jsonResponse(['success' => false, 'error' => 'Επιτρέπονται μόνο εικόνες JPG, PNG ή WEBP.'], 400);
    }

    $photoFilename = 'listing_' . bin2hex(random_bytes(16)) . '.' . $allowedMimes[$mime];
    $photoTmpPath  = $photo['tmp_name'];
}

$conn->begin_transaction();

try {
    $stmt = $conn->prepare(
        "UPDATE listings
            SET title                = ?,
                description          = ?,
                photo_filename       = ?,
                portions_total       = ?,
                portions_available   = ?,
                pickup_lat           = ?,
                pickup_lng           = ?,
                pickup_location_text = ?,
                pickup_time_from     = ?,
                pickup_time_to       = ?
          WHERE id = ?"
    );
    $stmt->bind_param(
        'sssiiddsssi',
        $title,
        $description,
        $photoFilename,
        $portions,
        $newPortionsAvailable,
        $pickupLat,
        $pickupLng,
        $pickupLocationText,
        $pickupFrom,
        $pickupTo,
        $listingId
    );
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare("DELETE FROM listing_allergens WHERE listing_id = ?");
    $stmt->bind_param('i', $listingId);
    $stmt->execute();
    $stmt->close();

    if ($allergenIds !== []) {
        $stmt = $conn->prepare(
            "INSERT INTO listing_allergens (listing_id, allergen_id) VALUES (?, ?)"
        );
        foreach ($allergenIds as $allergenId) {
            $stmt->bind_param('ii', $listingId, $allergenId);
            $stmt->execute();
        }
        $stmt->close();
    }

    if ($photoTmpPath !== null) {
        $target = __DIR__ . '/../../uploads/' . $photoFilename;
        if (!move_uploaded_file($photoTmpPath, $target)) {
            throw new RuntimeException('Could not store the uploaded photo.');
        }
        $newPhotoPath = $target;
    }

    $conn->commit();

} catch (Throwable $e) {
    $conn->rollback();

    if ($newPhotoPath !== null && is_file($newPhotoPath)) {
        @unlink($newPhotoPath);
    }
    jsonResponse(['success' => false, 'error' => 'Could not update listing'], 500);
}

jsonResponse(['success' => true, 'listing_id' => $listingId]);
