document.addEventListener('DOMContentLoaded', () => {

    const root     = document.getElementById('listings-root');
    const loading  = document.getElementById('listings-loading');
    const empty    = document.getElementById('listings-empty');
    const alertBox = document.getElementById('listings-alert');
    if (!root) return;

    const ENDPOINT        = '/unibite/api/listings/mine.php';
    const DELETE_ENDPOINT = '/unibite/api/listings/delete.php';
    const EDIT_PAGE       = '/unibite/cook/edit_listing.php';

    const STATUS_META = {
        active:   { label: 'Ενεργές',      badge: 'Ενεργή',      cls: 'cook-badge--active' },
        inactive: { label: 'Ανενεργές',    badge: 'Ανενεργή',    cls: 'cook-badge--inactive' },
        deleted:  { label: 'Διαγραμμένες', badge: 'Διαγραμμένη', cls: 'cook-badge--deleted' }
    };
    const STATUS_ORDER = ['active', 'inactive', 'deleted'];

    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    function formatDateTime(mysql) {
        if (!mysql) return '';
        const [date, time] = mysql.split(' ');
        const [, month, day] = date.split('-');
        return `${day}/${month} ${time ? time.slice(0, 5) : ''}`.trim();
    }

    function allergenChips(allergens) {
        if (!allergens || allergens.length === 0) return '';
        const chips = allergens.map(a =>
            `<span class="cook-chip">${escapeHtml(a.icon)} ${escapeHtml(a.name_el)}</span>`
        ).join('');
        return `<div class="cook-chips">${chips}</div>`;
    }

    function cardHtml(listing) {
        const meta = STATUS_META[listing.status] || STATUS_META.active;

        const photo = listing.photo_filename
            ? `<img class="cook-card__photo" src="/unibite/uploads/${escapeHtml(listing.photo_filename)}" alt="">`
            : '';

        const desc = listing.description
            ? `<p class="cook-card__desc">${escapeHtml(listing.description)}</p>`
            : '';

        const actions = listing.status === 'deleted' ? '' : `
            <div class="cook-card__actions">
                <button class="btn-secondary" data-action="edit" data-id="${listing.id}">Επεξεργασία</button>
                <button class="btn-danger" data-action="delete" data-id="${listing.id}">Διαγραφή</button>
            </div>`;

        return `
            <article class="card cook-card">
                ${photo}
                <div class="cook-card__body">
                    <div class="cook-card__top">
                        <h3 class="cook-card__title">${escapeHtml(listing.title)}</h3>
                        <span class="cook-badge ${meta.cls}">${meta.badge}</span>
                    </div>
                    ${desc}
                    <p class="cook-card__meta">${listing.portions_available}/${listing.portions_total} μερίδες διαθέσιμες</p>
                    <p class="cook-card__meta">Σημείο: ${escapeHtml(listing.pickup_location_text)}</p>
                    <p class="cook-card__meta">Παραλαβή: ${formatDateTime(listing.pickup_time_from)} – ${formatDateTime(listing.pickup_time_to)}</p>
                    ${allergenChips(listing.allergens)}
                    ${actions}
                </div>
            </article>`;
    }

    function render(listings) {
        const groups = {};
        listings.forEach(l => {
            (groups[l.status] = groups[l.status] || []).push(l);
        });

        let html = '';
        STATUS_ORDER.forEach(status => {
            const items = groups[status];
            if (!items || items.length === 0) return;
            html += `
                <section class="cook-listings__group">
                    <h2 class="cook-listings__group-title">${STATUS_META[status].label} (${items.length})</h2>
                    <div class="cook-listings__grid">${items.map(cardHtml).join('')}</div>
                </section>`;
        });
        root.innerHTML = html;
    }

    function showAlert(message) {
        alertBox.textContent = message;
        alertBox.classList.remove('is-hidden');
    }

    function clearAlert() {
        alertBox.textContent = '';
        alertBox.classList.add('is-hidden');
    }

    async function load() {
        clearAlert();
        try {
            const response = await fetch(ENDPOINT, { headers: { 'Accept': 'application/json' } });
            const data = await response.json();
            loading.classList.add('is-hidden');

            if (!data.success) {
                showAlert(data.error || 'Δεν ήταν δυνατή η φόρτωση των αγγελιών.');
                return;
            }
            if (!data.listings || data.listings.length === 0) {
                empty.classList.remove('is-hidden');
                root.innerHTML = '';
                return;
            }
            empty.classList.add('is-hidden');
            render(data.listings);

        } catch (error) {
            console.error('Failed to load listings:', error);
            loading.classList.add('is-hidden');
            showAlert('Πρόβλημα σύνδεσης με τον server. Δοκίμασε ξανά.');
        }
    }

    async function deleteListing(id, btn) {
        if (!confirm('Σίγουρα θες να διαγράψεις αυτή την αγγελία;')) return;

        clearAlert();
        btn.disabled = true;
        try {
            const response = await fetch(DELETE_ENDPOINT, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: new URLSearchParams({ listing_id: id })
            });
            const data = await response.json();

            if (data.success) {
                load();
            } else {
                showAlert(data.error || 'Δεν ήταν δυνατή η διαγραφή.');
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Delete failed:', error);
            showAlert('Πρόβλημα σύνδεσης με τον server. Δοκίμασε ξανά.');
            btn.disabled = false;
        }
    }

    root.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const id     = btn.dataset.id;

        if (action === 'edit') {
            window.location.href = `${EDIT_PAGE}?id=${id}`;
        } else if (action === 'delete') {
            deleteListing(id, btn);
        }
    });

    load();
});
