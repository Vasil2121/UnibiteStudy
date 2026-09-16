document.addEventListener('DOMContentLoaded', () => {
    const listingsGrid = document.getElementById('listings-grid');

    const applyBtn      = document.getElementById('filter-apply');
    const resetBtn      = document.getElementById('filter-reset');
    const distanceInput = document.getElementById('filter-distance');
    const limitInput    = document.getElementById('filter-limit');
    const statusEl      = document.getElementById('filter-status');
    const searchInput   = document.getElementById('address-search-input');
    const searchBtn     = document.getElementById('address-search-btn');

    const map = L.map('map').setView([38.2462, 21.7348], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let mapMarkers = [];

    let refLat = null;
    let refLng = null;
    let refMarker = null;

    let currentMode = 'all';
    let lastNearby  = { maxKm: 5, limit: 20 };

    function setReference(lat, lng, centerMap = false) {
        refLat = lat;
        refLng = lng;

        if (refMarker) {
            refMarker.setLatLng([lat, lng]);
        } else {

            refMarker = L.circleMarker([lat, lng], {
                radius: 9,
                color: '#c0392b',
                weight: 2,
                fillColor: '#e74c3c',
                fillOpacity: 0.9
            }).addTo(map);
            refMarker.bindPopup('Η τοποθεσία σου');
        }

        if (centerMap) {
            map.setView([lat, lng], 15);
        }

        statusEl.textContent =
            `Τοποθεσία ορίστηκε: ${lat.toFixed(5)}, ${lng.toFixed(5)}. ` +
            'Όρισε απόσταση και πάτησε «Εφαρμογή φίλτρου».';
    }

    map.on('click', (e) => setReference(e.latlng.lat, e.latlng.lng, false));

    function searchAddress() {
        const query = searchInput.value.trim();
        if (!query) {
            statusEl.textContent = 'Πληκτρολόγησε πρώτα μια διεύθυνση.';
            return;
        }

        searchBtn.disabled = true;
        searchBtn.textContent = 'Ψάχνω...';

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    setReference(lat, lng, true);
                } else {
                    statusEl.textContent = 'Η διεύθυνση δεν βρέθηκε. Δοκίμασε να προσθέσεις την πόλη (π.χ. Πάτρα).';
                }
            })
            .catch(() => {
                statusEl.textContent = 'Πρόβλημα κατά την αναζήτηση της διεύθυνσης.';
            })
            .finally(() => {
                searchBtn.disabled = false;
                searchBtn.textContent = '🔎 Εύρεση';
            });
    }

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', searchAddress);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchAddress();
            }
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            if (refLat === null || refLng === null) {
                statusEl.textContent = 'Όρισε πρώτα την τοποθεσία σου (αναζήτηση διεύθυνσης ή κλικ στον χάρτη).';
                return;
            }
            const maxKm = parseFloat(distanceInput.value);
            const limit = parseInt(limitInput.value, 10);

            if (!(maxKm > 0)) {
                statusEl.textContent = 'Δώσε έγκυρη μέγιστη απόσταση (km).';
                return;
            }
            if (!(limit > 0)) {
                statusEl.textContent = 'Δώσε έγκυρο μέγιστο πλήθος αποτελεσμάτων.';
                return;
            }

            lastNearby  = { maxKm, limit };
            currentMode = 'nearby';
            loadNearby();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentMode = 'all';
            statusEl.textContent = (refLat !== null)
                ? 'Εμφάνιση όλων των αγγελιών. (Η τοποθεσία σου παραμένει στον χάρτη.)'
                : 'Πληκτρολόγησε τη διεύθυνσή σου και πάτησε «Εύρεση», ή κάνε κλικ στον χάρτη.';
            loadFeed();
        });
    }

    function loadFeed() {
        listingsGrid.innerHTML = '<div class="listings-grid__loading">Φόρτωση διαθέσιμων γευμάτων...</div>';

        fetch('/api/listings')
            .then(response => response.json().then(data => ({ response, data })))
            .then(({ response, data }) => {
                if (response.ok) {
                    renderListings(data.listings);
                } else {
                    listingsGrid.innerHTML = `<div class="listings-grid__error">Σφάλμα: ${escapeHtml(data.error)}</div>`;
                }
            })
            .catch(() => {
                listingsGrid.innerHTML = '<div class="listings-grid__error">Αδυναμία σύνδεσης με τον διακομιστή. Παρακαλώ ελέγξτε το XAMPP.</div>';
            });
    }

    function loadNearby() {
        listingsGrid.innerHTML = '<div class="listings-grid__loading">Φόρτωση κοντινών γευμάτων...</div>';

        const url = `/api/listings?lat=${refLat}&lng=${refLng}`
            + `&radius=${lastNearby.maxKm}&limit=${lastNearby.limit}`;

        fetch(url)
            .then(response => response.json().then(data => ({ response, data })))
            .then(({ response, data }) => {
                if (response.ok) {
                    renderListings(data.listings);
                    statusEl.textContent =
                        `Φίλτρο ενεργό: ${data.listings.length} αγγελίες έως ${lastNearby.maxKm} km, `
                        + 'ταξινομημένες κατά απόσταση.';
                } else {
                    listingsGrid.innerHTML = `<div class="listings-grid__error">Σφάλμα: ${escapeHtml(data.error)}</div>`;
                }
            })
            .catch(() => {
                listingsGrid.innerHTML = '<div class="listings-grid__error">Αδυναμία σύνδεσης με τον διακομιστή.</div>';
            });
    }

    function reload() {
        if (currentMode === 'nearby' && refLat !== null) {
            loadNearby();
        } else {
            loadFeed();
        }
    }

    function renderListings(listings) {
        listingsGrid.innerHTML = '';

        mapMarkers.forEach(marker => map.removeLayer(marker));
        mapMarkers = [];

        if (listings.length === 0) {
            listingsGrid.innerHTML = '<div class="listings-grid__empty">Δεν υπάρχουν διαθέσιμα γεύματα από άλλους φοιτητές αυτή τη στιγμή.</div>';
            return;
        }

        listings.forEach(listing => {
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
                listing.allergens.forEach(allergen => {
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
                        ${listing.portions_available > 0 ? 'Δέσμευση Μερίδας (-1 πόντος)' : 'Εξαντλήθηκε'}
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
        const el = listingsGrid.querySelector(`[data-feedback="${listingId}"]`);
        if (!el) return;
        el.textContent = message;
        el.className = `listing-card__feedback ${isError ? 'alert-error' : 'alert-success'}`;
        el.classList.remove('is-hidden');

        setTimeout(() => el.classList.add('is-hidden'), 4000);
    }

    listingsGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.listing-card__button');
        if (!button || button.disabled) return;

        const listingId = parseInt(button.getAttribute('data-id'), 10);

        const card    = button.closest('.listing-card');
        const dropdown = card ? card.querySelector(`.listing-card__slot-dropdown[data-id="${listingId}"]`) : null;
        const slot    = dropdown ? parseInt(dropdown.value, 10) : 1;

        if (!button.dataset.confirming) {
            button.dataset.confirming = 'true';
            button.textContent = 'Πάτα ξανά για επιβεβαίωση';
            button.classList.add('listing-card__button--confirm');
            setTimeout(() => {
                if (button.dataset.confirming) {
                    delete button.dataset.confirming;
                    button.textContent = 'Δέσμευση Μερίδας (-1 πόντος)';
                    button.classList.remove('listing-card__button--confirm');
                }
            }, 3000);
            return;
        }

        delete button.dataset.confirming;
        button.disabled = true;
        button.textContent = 'Υποβολή...';

        fetch('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listingId: listingId, slot: slot })
        })
            .then(response => response.json().then(data => ({ response, data })))
            .then(({ response, data }) => {
                if (response.ok) {
                    showCardFeedback(listingId, '✓ Το αίτημά σου στάλθηκε επιτυχώς!', false);

                    if (window.refreshHeader) {
                        window.refreshHeader();
                    }

                    setTimeout(() => reload(), 1500);
                } else {
                    showCardFeedback(listingId, data.error || 'Κάτι πήγε στραβά.', true);
                    button.disabled = false;
                    button.textContent = 'Δέσμευση Μερίδας (-1 πόντος)';
                }
            })
            .catch(() => {
                showCardFeedback(listingId, 'Αδυναμία επικοινωνίας με τον διακομιστή.', true);
                button.disabled = false;
                button.textContent = 'Δέσμευση Μερίδας (-1 πόντος)';
            });
    });

    loadFeed();

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
