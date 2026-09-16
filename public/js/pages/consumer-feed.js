import { initLayout, refreshHeaderPoints } from '../shared/layout.js';
import * as listingsApi from '../api/listings-api.js';
import * as requestsApi from '../api/requests-api.js';
import * as geocodeApi from '../api/geocode-api.js';
import { escapeHtml } from '../shared/escape.js';

const listingsGrid = document.getElementById('listings-grid');
const applyButton = document.getElementById('filter-apply');
const resetButton = document.getElementById('filter-reset');
const distanceInput = document.getElementById('filter-distance');
const limitInput = document.getElementById('filter-limit');
const statusElement = document.getElementById('filter-status');
const searchInput = document.getElementById('address-search-input');
const searchButton = document.getElementById('address-search-btn');

const RESERVE_LABEL = 'Δέσμευση Μερίδας (-1 πόντος)';

let map = null;
let mapMarkers = [];

let referenceLat = null;
let referenceLng = null;
let referenceMarker = null;

let currentMode = 'all';
let lastNearby = { maxKm: 5, limit: 20 };

function createMap() {
    map = L.map('map').setView([38.2462, 21.7348], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.on('click', function (event) {
        setReference(event.latlng.lat, event.latlng.lng, false);
    });
}

function setReference(lat, lng, centerMap) {
    referenceLat = lat;
    referenceLng = lng;

    if (referenceMarker) {
        referenceMarker.setLatLng([lat, lng]);
    } else {
        referenceMarker = L.circleMarker([lat, lng], {
            radius: 9,
            color: '#c0392b',
            weight: 2,
            fillColor: '#e74c3c',
            fillOpacity: 0.9
        }).addTo(map);
        referenceMarker.bindPopup('Η τοποθεσία σου');
    }

    if (centerMap) {
        map.setView([lat, lng], 15);
    }

    statusElement.textContent =
        `Τοποθεσία ορίστηκε: ${lat.toFixed(5)}, ${lng.toFixed(5)}. ` +
        'Όρισε απόσταση και πάτησε «Εφαρμογή φίλτρου».';
}

async function searchAddress() {
    const query = searchInput.value.trim();
    if (!query) {
        statusElement.textContent = 'Πληκτρολόγησε πρώτα μια διεύθυνση.';
        return;
    }

    searchButton.disabled = true;
    searchButton.textContent = 'Ψάχνω...';

    try {
        const data = await geocodeApi.searchAddress(query);
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            setReference(lat, lng, true);
        } else {
            statusElement.textContent = 'Η διεύθυνση δεν βρέθηκε. Δοκίμασε να προσθέσεις την πόλη (π.χ. Πάτρα).';
        }
    } catch (error) {
        statusElement.textContent = 'Πρόβλημα κατά την αναζήτηση της διεύθυνσης.';
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = '🔎 Εύρεση';
    }
}

function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchAddress();
    }
}

function handleApplyClick() {
    if (referenceLat === null || referenceLng === null) {
        statusElement.textContent = 'Όρισε πρώτα την τοποθεσία σου (αναζήτηση διεύθυνσης ή κλικ στον χάρτη).';
        return;
    }
    const maxKm = parseFloat(distanceInput.value);
    const limit = parseInt(limitInput.value, 10);

    if (!(maxKm > 0)) {
        statusElement.textContent = 'Δώσε έγκυρη μέγιστη απόσταση (km).';
        return;
    }
    if (!(limit > 0)) {
        statusElement.textContent = 'Δώσε έγκυρο μέγιστο πλήθος αποτελεσμάτων.';
        return;
    }

    lastNearby = { maxKm: maxKm, limit: limit };
    currentMode = 'nearby';
    loadNearby();
}

function handleResetClick() {
    currentMode = 'all';
    if (referenceLat !== null) {
        statusElement.textContent = 'Εμφάνιση όλων των αγγελιών. (Η τοποθεσία σου παραμένει στον χάρτη.)';
    } else {
        statusElement.textContent = 'Πληκτρολόγησε τη διεύθυνσή σου και πάτησε «Εύρεση», ή κάνε κλικ στον χάρτη.';
    }
    loadFeed();
}

async function loadFeed() {
    listingsGrid.innerHTML = '<div class="listings-grid__loading">Φόρτωση διαθέσιμων γευμάτων...</div>';

    try {
        const data = await listingsApi.fetchFeed();
        renderListings(data.listings);
    } catch (error) {
        if (error.status !== undefined) {
            listingsGrid.innerHTML = `<div class="listings-grid__error">Σφάλμα: ${escapeHtml(error.message)}</div>`;
            return;
        }
        listingsGrid.innerHTML = '<div class="listings-grid__error">Αδυναμία σύνδεσης με τον διακομιστή. Παρακαλώ ελέγξτε το XAMPP.</div>';
    }
}

async function loadNearby() {
    listingsGrid.innerHTML = '<div class="listings-grid__loading">Φόρτωση κοντινών γευμάτων...</div>';

    try {
        const data = await listingsApi.fetchNearbyListings(referenceLat, referenceLng, lastNearby.maxKm, lastNearby.limit);
        renderListings(data.listings);
        statusElement.textContent =
            `Φίλτρο ενεργό: ${data.listings.length} αγγελίες έως ${lastNearby.maxKm} km, `
            + 'ταξινομημένες κατά απόσταση.';
    } catch (error) {
        if (error.status !== undefined) {
            listingsGrid.innerHTML = `<div class="listings-grid__error">Σφάλμα: ${escapeHtml(error.message)}</div>`;
            return;
        }
        listingsGrid.innerHTML = '<div class="listings-grid__error">Αδυναμία σύνδεσης με τον διακομιστή.</div>';
    }
}

function reload() {
    if (currentMode === 'nearby' && referenceLat !== null) {
        loadNearby();
    } else {
        loadFeed();
    }
}

function renderListings(listings) {
    listingsGrid.innerHTML = '';

    mapMarkers.forEach((marker) => {
        map.removeLayer(marker);
    });
    mapMarkers = [];

    if (listings.length === 0) {
        listingsGrid.innerHTML = '<div class="listings-grid__empty">Δεν υπάρχουν διαθέσιμα γεύματα από άλλους φοιτητές αυτή τη στιγμή.</div>';
        return;
    }

    listings.forEach((listing) => {
        const card = document.createElement('div');
        card.className = 'listing-card';

        if (listing.portions_available === 0) {
            card.classList.add('listing-card--inactive');
        }

        const photoSrc = listing.photo_filename
            ? `/uploads/${escapeHtml(listing.photo_filename)}`
            : 'https://placehold.co/600x400?text=UniBite';

        let allergensHtml = '';
        if (listing.allergens && listing.allergens.length > 0) {
            allergensHtml = '<div class="listing-card__allergens">';
            listing.allergens.forEach((allergen) => {
                allergensHtml += `<span class="allergen-badge" title="${escapeHtml(allergen.name_el)}">${allergen.icon}</span>`;
            });
            allergensHtml += '</div>';
        }

        const timeFrom = listing.pickup_time_from.substring(11, 16);
        const timeTo   = listing.pickup_time_to.substring(11, 16);

        const distanceHtml = (listing.distance_km !== undefined && listing.distance_km !== null)
            ? `<p>📏 <strong>Απόσταση:</strong> <span class="listing-card__distance">${Number(listing.distance_km).toFixed(1)} km</span></p>`
            : '';

        card.innerHTML = `
                <div class="listing-card__image-container">
                    <img src="${photoSrc}" alt="${escapeHtml(listing.title)}" class="listing-card__image">
                    <span class="listing-card__status-tag ${listing.portions_available > 0 ? 'listing-card__status-tag--active' : 'listing-card__status-tag--inactive'}">
                        ${listing.portions_available > 0 ? 'Ενεργή' : 'Ανενεργή'}
                    </span>
                </div>
                <div class="listing-card__content">
                    <div class="listing-card__feedback is-hidden" data-feedback="${listing.id}"></div>
                    <h3 class="listing-card__title">${escapeHtml(listing.title)}</h3>
                    <p class="listing-card__cook">Μάγειρας: <strong>${escapeHtml(listing.cook_name)}</strong></p>
                    <p class="listing-card__description">${escapeHtml(listing.description || 'Δεν ορίστηκε περιγραφή.')}</p>
                    ${allergensHtml}
                    <div class="listing-card__details">
                        <p>📍 <strong>Παραλαβή από:</strong> ${escapeHtml(listing.pickup_location_text)}</p>
                        <p>🕒 <strong>Ώρες:</strong> ${timeFrom} - ${timeTo}</p>
                        <p>🍽️ <strong>Διαθέσιμες Μερίδες:</strong> ${listing.portions_available} / ${listing.portions_total}</p>
                        ${distanceHtml}
                    </div>
                    <div class="listing-card__slot-select" ${listing.portions_available === 0 ? 'style="display:none"' : ''}>
                        <label class="listing-card__slot-label">Επέλεξε μερίδα:</label>
                        <select class="listing-card__slot-dropdown" data-id="${listing.id}">
                            <option value="1">Μερίδα 1</option>
                            ${listing.portions_available >= 2 ? '<option value="2">Μερίδα 2</option>' : ''}
                        </select>
                    </div>
                    <button class="listing-card__button" ${listing.portions_available === 0 ? 'disabled' : ''} data-id="${listing.id}">
                        ${listing.portions_available > 0 ? RESERVE_LABEL : 'Εξαντλήθηκε'}
                    </button>
                </div>
            `;
        listingsGrid.appendChild(card);

        if (listing.pickup_lat && listing.pickup_lng) {
            const marker = L.marker([listing.pickup_lat, listing.pickup_lng]).addTo(map);
            marker.bindPopup(`
                    <div class="map-popup">
                        <h4 class="map-popup__title">${escapeHtml(listing.title)}</h4>
                        <p class="map-popup__cook">Μάγειρας: <strong>${escapeHtml(listing.cook_name)}</strong></p>
                        <p class="map-popup__portions">Μερίδες: ${listing.portions_available} / ${listing.portions_total}</p>
                    </div>
                `);
            mapMarkers.push(marker);
        }
    });
}

function showCardFeedback(listingId, message, isError) {
    const element = listingsGrid.querySelector(`[data-feedback="${listingId}"]`);
    if (!element) {
        return;
    }
    element.textContent = message;
    element.className = `listing-card__feedback ${isError ? 'alert-error' : 'alert-success'}`;
    element.classList.remove('is-hidden');

    setTimeout(function () {
        element.classList.add('is-hidden');
    }, 4000);
}

function restoreReserveButton(button) {
    button.disabled = false;
    button.textContent = RESERVE_LABEL;
}

async function submitReservation(listingId, slot, button) {
    try {
        await requestsApi.createRequest(listingId, slot);
        showCardFeedback(listingId, '✓ Το αίτημά σου στάλθηκε επιτυχώς!', false);
        refreshHeaderPoints();
        setTimeout(function () {
            reload();
        }, 1500);
    } catch (error) {
        if (error.status !== undefined) {
            showCardFeedback(listingId, error.message || 'Κάτι πήγε στραβά.', true);
            restoreReserveButton(button);
            return;
        }
        showCardFeedback(listingId, 'Αδυναμία επικοινωνίας με τον διακομιστή.', true);
        restoreReserveButton(button);
    }
}

function handleGridClick(event) {
    const button = event.target.closest('.listing-card__button');
    if (!button || button.disabled) {
        return;
    }

    const listingId = parseInt(button.getAttribute('data-id'), 10);

    const card = button.closest('.listing-card');
    const dropdown = card ? card.querySelector(`.listing-card__slot-dropdown[data-id="${listingId}"]`) : null;
    const slot = dropdown ? parseInt(dropdown.value, 10) : 1;

    if (!button.dataset.confirming) {
        button.dataset.confirming = 'true';
        button.textContent = 'Πάτα ξανά για επιβεβαίωση';
        button.classList.add('listing-card__button--confirm');
        setTimeout(function () {
            if (button.dataset.confirming) {
                delete button.dataset.confirming;
                button.textContent = RESERVE_LABEL;
                button.classList.remove('listing-card__button--confirm');
            }
        }, 3000);
        return;
    }

    delete button.dataset.confirming;
    button.disabled = true;
    button.textContent = 'Υποβολή...';

    submitReservation(listingId, slot, button);
}

function connectEvents() {
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', searchAddress);
        searchInput.addEventListener('keypress', handleSearchKeypress);
    }

    if (applyButton) {
        applyButton.addEventListener('click', handleApplyClick);
    }

    if (resetButton) {
        resetButton.addEventListener('click', handleResetClick);
    }

    listingsGrid.addEventListener('click', handleGridClick);
}

async function initPage() {
    createMap();
    connectEvents();
    await initLayout();
    loadFeed();
}

initPage();
