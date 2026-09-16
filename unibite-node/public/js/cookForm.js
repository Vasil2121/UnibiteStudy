function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('create-listing-form');
    if (!form) return;

    const submitBtn  = document.getElementById('submit-btn');
    const pageAlert  = document.getElementById('form-alert');
    const pageOk     = document.getElementById('form-success');
    const latInput   = document.getElementById('pickup_lat');
    const lngInput   = document.getElementById('pickup_lng');
    const mapHint    = document.getElementById('map-hint');
    const photoInput = document.getElementById('photo');
    const photoPrev  = document.getElementById('photo-preview');

    const listingId = new URLSearchParams(window.location.search).get('id');
    const isEdit = listingId !== null;

    const ENDPOINT    = isEdit ? `/api/listings/${listingId}` : '/api/listings';
    const METHOD      = isEdit ? 'PUT' : 'POST';
    const submitLabel = submitBtn.textContent;

    const map = L.map('map').setView([38.2880, 21.7890], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let marker = null;

    function placeMarker(lat, lng, reverseGeocode = false) {
        const pos = [lat, lng];
        if (marker) {
            marker.setLatLng(pos);
        } else {
            marker = L.marker(pos).addTo(map);
        }
        latInput.value = lat.toFixed(7);
        lngInput.value = lng.toFixed(7);
        mapHint.textContent = `Επιλεγμένο σημείο: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        mapHint.classList.add('cook-form__map-hint--set');

        if (reverseGeocode) {
            const locTextInput = document.getElementById('pickup_location_text');
            if (locTextInput) {
                locTextInput.value = 'Ανάκτηση διεύθυνσης...';
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.display_name) {
                            locTextInput.value = data.display_name;
                        } else {
                            locTextInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                        }
                    })
                    .catch(err => {
                        console.error('Reverse geocoding error:', err);
                        locTextInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                    });
            }
        }
    }

    map.on('click', (event) => placeMarker(event.latlng.lat, event.latlng.lng, true));

    setTimeout(() => map.invalidateSize(), 200);

    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (file) {
            photoPrev.src = URL.createObjectURL(file);
            photoPrev.classList.remove('is-hidden');
        }
    });

    function clearMessages() {
        form.querySelectorAll('.form-error').forEach(slot => (slot.textContent = ''));
        form.querySelectorAll('.form-input--error').forEach(input =>
            input.classList.remove('form-input--error'));
        pageAlert.textContent = '';
        pageAlert.classList.add('is-hidden');
        pageOk.textContent = '';
        pageOk.classList.add('is-hidden');
    }

    function showFieldError(field, message) {
        const slot = form.querySelector(`[data-error-for="${field}"]`);
        if (slot) slot.textContent = message;
        const input = form.querySelector(`[name="${field}"]`);
        if (input) input.classList.add('form-input--error');
    }

    function showPageAlert(message) {
        pageAlert.textContent = message;
        pageAlert.classList.remove('is-hidden');
    }

    function showSuccess(message) {
        pageOk.textContent = message;
        pageOk.classList.remove('is-hidden');
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

    const searchInput = document.getElementById('address-search-input');
    const searchBtn   = document.getElementById('address-search-btn');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', async () => {
            const query = searchInput.value.trim();
            if (!query) {
                alert('Παρακαλώ πληκτρολογήστε μια διεύθυνση πρώτα.');
                return;
            }

            searchBtn.disabled = true;
            searchBtn.textContent = 'Ψάχνω...';

            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                const data = await response.json();

                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);

                    map.setView([lat, lng], 16);
                    placeMarker(lat, lng, false);

                    const locTextInput = document.getElementById('pickup_location_text');
                    if (locTextInput) {
                        locTextInput.value = query;
                    }
                } else {
                    alert('Η διεύθυνση δεν βρέθηκε. Δοκίμασε να προσθέσεις την πόλη (π.χ. Πάτρα).');
                }
            } catch (error) {
                console.error('Geocoding error:', error);
                alert('Πρόβλημα κατά την αναζήτηση της διεύθυνσης.');
            } finally {
                searchBtn.disabled = false;
                searchBtn.textContent = '🔎 Εύρεση';
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchBtn.click();
            }
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessages();

        if (!latInput.value || !lngInput.value) {
            showFieldError('pickup_lat', 'Διάλεξε σημείο παραλαβής στον χάρτη.');
            return;
        }

        const formData = new FormData(form);

        submitBtn.disabled = true;
        submitBtn.textContent = 'Αποθήκευση...';

        try {
            const response = await fetch(ENDPOINT, {
                method: METHOD,
                headers: { 'Accept': 'application/json' },
                body: formData
            });
            const data = await response.json();

            if (response.ok) {
                if (isEdit) {
                    window.location.href = '/cook/my-listings.html';
                    return;
                }
                showSuccess(`Η αγγελία δημοσιεύτηκε! (#${data.listing_id})`);
                form.reset();
                resetMapSelection();
                photoPrev.classList.add('is-hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (window.refreshHeader) {
                    window.refreshHeader();
                }

            } else if (data.fields && typeof data.fields === 'object') {
                for (const field in data.fields) {
                    showFieldError(field, data.fields[field]);
                }
            } else {
                showPageAlert(data.error || 'Κάτι πήγε στραβά. Δοκίμασε ξανά.');
            }

        } catch (error) {
            console.error('Listing form request failed:', error);
            showPageAlert('Πρόβλημα σύνδεσης με τον server. Δοκίμασε ξανά.');

        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = submitLabel;
        }
    });

    async function loadAllergens() {
        const allergensList = document.getElementById('allergens-list');
        if (!allergensList) return;

        try {
            const response = await fetch('/api/allergens', { headers: { 'Accept': 'application/json' } });
            const allergens = await response.json();

            allergensList.innerHTML = allergens.map(allergen => `
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
            const response = await fetch(`/api/listings/${listingId}`, { headers: { 'Accept': 'application/json' } });
            const data = await response.json();
            const listing = data.listing;
            if (!listing) return;

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

            const allergenIds = (listing.allergens || []).map(a => String(a.id));
            form.querySelectorAll('input[name="allergen_ids"]').forEach(checkbox => {
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
            console.error('Failed to load listing:', error);
        }
    }

    (async () => {
        await loadAllergens();
        if (isEdit) {
            await loadListing();
        }
    })();
});
