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
    const listingIdInput = document.getElementById('listing_id');

    const isEdit      = !!listingIdInput;
    const ENDPOINT    = isEdit ? '/unibite/api/listings/edit.php' : '/unibite/api/listings/create.php';
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

    if (isEdit && latInput.value && lngInput.value) {
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            map.setView([lat, lng], 16);
            placeMarker(lat, lng, false);
        }
    }

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
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                if (isEdit) {
                    window.location.href = '/unibite/cook/my_listings.php';
                    return;
                }
                showSuccess(`Η αγγελία δημοσιεύτηκε! (#${data.listing_id})`);
                form.reset();
                resetMapSelection();
                photoPrev.classList.add('is-hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });

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
});
