import { initLayout, refreshHeaderPoints } from '../shared/layout.js';
import * as listingsApi from '../api/listings-api.js';
import * as allergensApi from '../api/allergens-api.js';
import * as geocodeApi from '../api/geocode-api.js';
import { escapeHtml } from '../shared/escape.js';
import { showAlert, clearAlert } from '../shared/alerts.js';
import { clearFieldErrors, showFieldErrors, markInvalidFields } from '../shared/form-errors.js';

const form = document.getElementById('create-listing-form');
const submitButton = document.getElementById('submit-btn');
const pageAlert = document.getElementById('form-alert');
const pageSuccess = document.getElementById('form-success');
const latInput = document.getElementById('pickup_lat');
const lngInput = document.getElementById('pickup_lng');
const mapHint = document.getElementById('map-hint');
const photoInput = document.getElementById('photo');
const photoPreview = document.getElementById('photo-preview');
const searchInput = document.getElementById('address-search-input');
const searchButton = document.getElementById('address-search-btn');

const listingId = new URLSearchParams(window.location.search).get('id');
const isEdit = listingId !== null;

let map = null;
let marker = null;
let submitLabel = '';

async function fillLocationFromCoordinates(lat, lng) {
    const locationInput = document.getElementById('pickup_location_text');
    if (!locationInput) {
        return;
    }

    locationInput.value = 'Ανάκτηση διεύθυνσης...';

    try {
        const data = await geocodeApi.reverseGeocode(lat, lng);
        if (data && data.display_name) {
            locationInput.value = data.display_name;
        } else {
            locationInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        locationInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
}

function placeMarker(lat, lng, shouldReverseGeocode) {
    const position = [lat, lng];
    if (marker) {
        marker.setLatLng(position);
    } else {
        marker = L.marker(position).addTo(map);
    }
    latInput.value = lat.toFixed(7);
    lngInput.value = lng.toFixed(7);
    mapHint.textContent = `Επιλεγμένο σημείο: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    mapHint.classList.add('cook-form__map-hint--set');

    if (shouldReverseGeocode) {
        fillLocationFromCoordinates(lat, lng);
    }
}

function createMap() {
    map = L.map('map').setView([38.2880, 21.7890], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', function (event) {
        placeMarker(event.latlng.lat, event.latlng.lng, true);
    });

    setTimeout(function () {
        map.invalidateSize();
    }, 200);
}

function clearMessages() {
    clearFieldErrors(form);
    clearAlert(pageAlert);
    clearAlert(pageSuccess);
}

function showFieldProblems(fields) {
    showFieldErrors(form, fields);
    markInvalidFields(form, fields);
}

function resetMapSelection() {
    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }
    latInput.value = '';
    lngInput.value = '';
    mapHint.textContent = 'Κάνε κλικ στον χάρτη για να ορίσεις το σημείο παραλαβής.';
    mapHint.classList.remove('cook-form__map-hint--set');
}

function handlePhotoChange() {
    const file = photoInput.files[0];
    if (file) {
        photoPreview.src = URL.createObjectURL(file);
        photoPreview.classList.remove('is-hidden');
    }
}

async function handleAddressSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        alert('Παρακαλώ πληκτρολογήστε μια διεύθυνση πρώτα.');
        return;
    }

    searchButton.disabled = true;
    searchButton.textContent = 'Ψάχνω...';

    try {
        const data = await geocodeApi.searchAddress(query);

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);

            map.setView([lat, lng], 16);
            placeMarker(lat, lng, false);

            const locationInput = document.getElementById('pickup_location_text');
            if (locationInput) {
                locationInput.value = query;
            }
        } else {
            alert('Η διεύθυνση δεν βρέθηκε. Δοκίμασε να προσθέσεις την πόλη (π.χ. Πάτρα).');
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        alert('Πρόβλημα κατά την αναζήτηση της διεύθυνσης.');
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = '🔎 Εύρεση';
    }
}

function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchButton.click();
    }
}

async function handleSubmit(event) {
    event.preventDefault();
    clearMessages();

    if (!latInput.value || !lngInput.value) {
        showFieldProblems({ pickup_lat: 'Διάλεξε σημείο παραλαβής στον χάρτη.' });
        return;
    }

    const formData = new FormData(form);

    submitButton.disabled = true;
    submitButton.textContent = 'Αποθήκευση...';

    try {
        if (isEdit) {
            await listingsApi.updateListing(listingId, formData);
            window.location.href = '/cook/my-listings.html';
            return;
        }

        const data = await listingsApi.createListing(formData);

        showAlert(pageSuccess, `Η αγγελία δημοσιεύτηκε! (#${data.listing_id})`);
        form.reset();
        resetMapSelection();
        photoPreview.classList.add('is-hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        refreshHeaderPoints();
    } catch (error) {
        if (error.status === undefined) {
            console.error('Listing form request failed:', error);
            showAlert(pageAlert, 'Πρόβλημα σύνδεσης με τον server. Δοκίμασε ξανά.');
        } else if (error.fields && typeof error.fields === 'object') {
            showFieldProblems(error.fields);
        } else {
            showAlert(pageAlert, error.message || 'Κάτι πήγε στραβά. Δοκίμασε ξανά.');
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = submitLabel;
    }
}

async function loadAllergens() {
    const allergensList = document.getElementById('allergens-list');
    if (!allergensList) {
        return;
    }

    try {
        const allergens = await allergensApi.fetchAllergens();

        allergensList.innerHTML = allergens.map((allergen) => `
                <label class="cook-allergen">
                    <input type="checkbox" name="allergen_ids" value="${allergen.id}">
                    <span class="cook-allergen__label">
                        ${escapeHtml(allergen.icon)} ${escapeHtml(allergen.name_el)}
                    </span>
                </label>`).join('');
    } catch (error) {
        console.error('Failed to load allergens:', error);
    }
}

async function loadListing() {
    try {
        const data = await listingsApi.fetchListing(listingId);
        const listing = data.listing;
        if (!listing) {
            return;
        }

        document.getElementById('title').value = listing.title;
        document.getElementById('description').value = listing.description == null ? '' : listing.description;
        document.getElementById('portions').value = listing.portions_total;
        document.getElementById('pickup_location_text').value = listing.pickup_location_text;
        latInput.value = listing.pickup_lat;
        lngInput.value = listing.pickup_lng;

        if (listing.pickup_time_from) {
            document.getElementById('pickup_time_from').value = listing.pickup_time_from.replace(' ', 'T').slice(0, 16);
        }
        if (listing.pickup_time_to) {
            document.getElementById('pickup_time_to').value = listing.pickup_time_to.replace(' ', 'T').slice(0, 16);
        }

        const allergens = listing.allergens || [];
        const allergenIds = allergens.map((allergen) => String(allergen.id));
        form.querySelectorAll('input[name="allergen_ids"]').forEach((checkbox) => {
            if (allergenIds.includes(checkbox.value)) {
                checkbox.checked = true;
            }
        });

        const existingPhoto = document.getElementById('existing-photo');
        if (existingPhoto) {
            existingPhoto.innerHTML = listing.photo_filename
                ? `<img class="cook-form__photo-preview" src="/uploads/${escapeHtml(listing.photo_filename)}" alt="">`
                : '';
        }

        if (latInput.value && lngInput.value) {
            const lat = parseFloat(latInput.value);
            const lng = parseFloat(lngInput.value);
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                map.setView([lat, lng], 16);
                placeMarker(lat, lng, false);
            }
        }
    } catch (error) {
        if (error.status !== undefined) {
            return;
        }
        console.error('Failed to load listing:', error);
    }
}

function connectEvents() {
    photoInput.addEventListener('change', handlePhotoChange);

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', handleAddressSearch);
        searchInput.addEventListener('keypress', handleSearchKeypress);
    }

    form.addEventListener('submit', handleSubmit);
}

async function initPage() {
    if (!form) {
        await initLayout();
        return;
    }

    submitLabel = submitButton.textContent;
    createMap();
    connectEvents();

    await initLayout();

    await loadAllergens();
    if (isEdit) {
        await loadListing();
    }
}

initPage();
