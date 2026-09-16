<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth.php';

requireLoginPage();
$cookId = getCurrentUserId();

$listingId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1],
]);
if ($listingId === false) {
    header('Location: /unibite/cook/my_listings.php');
    exit;
}

$stmt = $conn->prepare(
    "SELECT id, cook_id, title, description, photo_filename,
            portions_total, portions_available,
            pickup_lat, pickup_lng, pickup_location_text,
            pickup_time_from, pickup_time_to, status
       FROM listings WHERE id = ?"
);
$stmt->bind_param('i', $listingId);
$stmt->execute();
$listing = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$listing || (int) $listing['cook_id'] !== $cookId || $listing['status'] === 'deleted') {
    header('Location: /unibite/cook/my_listings.php');
    exit;
}

$selected = [];
$stmt = $conn->prepare("SELECT allergen_id FROM listing_allergens WHERE listing_id = ?");
$stmt->bind_param('i', $listingId);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $selected[(int) $row['allergen_id']] = true;
}
$stmt->close();

$allergens = [];
$res = $conn->query("SELECT id, name_el, icon FROM allergens ORDER BY id");
while ($row = $res->fetch_assoc()) {
    $allergens[] = $row;
}

$toInput = static fn ($value) => $value ? str_replace(' ', 'T', substr($value, 0, 16)) : '';

$pageTitle = 'Επεξεργασία Αγγελίας';
require __DIR__ . '/../includes/header.php';
?>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="/unibite/css/cook.css">

<div class="container cook-form">
    <div class="card">
        <h1 class="cook-form__title">Επεξεργασία Αγγελίας</h1>
        <p class="cook-form__subtitle">Ενημέρωσε τα στοιχεία της αγγελίας σου.</p>

        <div class="alert-success is-hidden" id="form-success" role="status"></div>
        <div class="alert-error is-hidden" id="form-alert" role="alert"></div>

        <form id="create-listing-form" novalidate>

            <input type="hidden" id="listing_id" name="listing_id" value="<?= (int) $listing['id'] ?>">

            <div class="cook-form__group">
                <label class="form-label" for="title">Τίτλος φαγητού *</label>
                <input class="form-input" type="text" id="title" name="title" maxlength="100" required
                       value="<?= escapeHtml($listing['title']) ?>">
                <span class="form-error" data-error-for="title"></span>
            </div>

            <div class="cook-form__group">
                <label class="form-label" for="description">Σημειώσεις (προαιρετικά)</label>
                <textarea class="form-input" id="description" name="description" rows="3"><?= escapeHtml($listing['description']) ?></textarea>
                <span class="form-error" data-error-for="description"></span>
            </div>

            <div class="cook-form__group">
                <label class="form-label" for="portions">Διαθέσιμες μερίδες *</label>
                <input class="form-input" type="number" id="portions" name="portions" min="1" required
                       value="<?= (int) $listing['portions_total'] ?>">
                <span class="form-error" data-error-for="portions"></span>
            </div>

            <div class="cook-form__group">
                <label class="form-label" for="photo">Φωτογραφία (άφησέ το κενό για να κρατήσεις την τρέχουσα)</label>
                <input class="form-input" type="file" id="photo" name="photo"
                       accept="image/jpeg,image/png,image/webp">
                <img class="cook-form__photo-preview <?= $listing['photo_filename'] ? '' : 'is-hidden' ?>"
                     id="photo-preview"
                     src="<?= $listing['photo_filename'] ? '/unibite/uploads/' . escapeHtml($listing['photo_filename']) : '' ?>"
                     alt="Τρέχουσα φωτογραφία">
                <span class="form-error" data-error-for="photo"></span>
            </div>

            <div class="cook-form__group">
                <span class="form-label">Αλλεργιογόνα (προαιρετικά)</span>
                <div class="cook-form__allergens">
                    <?php foreach ($allergens as $allergen): ?>
                        <label class="cook-allergen">
                            <input type="checkbox" name="allergen_ids[]" value="<?= (int) $allergen['id'] ?>"
                                <?= isset($selected[(int) $allergen['id']]) ? 'checked' : '' ?>>
                            <span class="cook-allergen__label">
                                <?= escapeHtml($allergen['icon']) ?> <?= escapeHtml($allergen['name_el']) ?>
                            </span>
                        </label>
                    <?php endforeach; ?>
                </div>
                <span class="form-error" data-error-for="allergens"></span>
            </div>

            <div class="cook-form__group">
                <label class="form-label" for="pickup_location_text">Σημείο παραλαβής *</label>
                <input class="form-input" type="text" id="pickup_location_text" name="pickup_location_text"
                       maxlength="255" required value="<?= escapeHtml($listing['pickup_location_text']) ?>">
                <span class="form-error" data-error-for="pickup_location_text"></span>
            </div>

            <div class="cook-form__group" style="display: flex; gap: 10px; margin-bottom: 10px;">
                <input class="form-input" type="text" id="address-search-input" placeholder="Πληκτρολόγησε οδό και αριθμό (π.χ. Κορίνθου 200, Πάτρα)" style="flex: 1;">
                <button type="button" class="btn-primary" id="address-search-btn" style="margin-top: 0; padding: 0 15px;">🔎 Εύρεση</button>
            </div>

            <div class="cook-form__group">
                <span class="form-label">Σημείο στον χάρτη *</span>
                <div id="map" class="cook-form__map"></div>
                <p class="cook-form__map-hint cook-form__map-hint--set" id="map-hint">
                    Κάνε κλικ στον χάρτη για να αλλάξεις το σημείο παραλαβής.
                </p>
                <input type="hidden" id="pickup_lat" name="pickup_lat" value="<?= htmlspecialchars($listing['pickup_lat']) ?>">
                <input type="hidden" id="pickup_lng" name="pickup_lng" value="<?= htmlspecialchars($listing['pickup_lng']) ?>">
                <span class="form-error" data-error-for="pickup_lat"></span>
            </div>

            <div class="cook-form__group cook-form__group--row">
                <div>
                    <label class="form-label" for="pickup_time_from">Παραλαβή από *</label>
                    <input class="form-input" type="datetime-local" id="pickup_time_from"
                           name="pickup_time_from" required value="<?= $toInput($listing['pickup_time_from']) ?>">
                    <span class="form-error" data-error-for="pickup_time_from"></span>
                </div>
                <div>
                    <label class="form-label" for="pickup_time_to">Παραλαβή έως *</label>
                    <input class="form-input" type="datetime-local" id="pickup_time_to"
                           name="pickup_time_to" required value="<?= $toInput($listing['pickup_time_to']) ?>">
                    <span class="form-error" data-error-for="pickup_time_to"></span>
                </div>
            </div>

            <div class="cook-card__actions">
                <a class="btn-secondary" href="/unibite/cook/my_listings.php">Άκυρο</a>
                <button type="submit" class="btn-primary" id="submit-btn">Αποθήκευση αλλαγών</button>
            </div>

        </form>
    </div>
</div>

<?php require __DIR__ . '/../includes/footer.php'; ?>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="/unibite/js/cookListingForm.js"></script>
