import { initLayout } from '../shared/layout.js';
import * as listingsApi from '../api/listings-api.js';
import { escapeHtml } from '../shared/escape.js';
import { formatShortDateTime } from '../shared/format.js';
import { showAlert, clearAlert } from '../shared/alerts.js';

const root = document.getElementById('listings-root');
const loading = document.getElementById('listings-loading');
const empty = document.getElementById('listings-empty');
const alertBox = document.getElementById('listings-alert');

const EDIT_PAGE = '/cook/edit.html';

const STATUS_META = {
    active:   { label: 'Ενεργές',      badge: 'Ενεργή',      cls: 'cook-badge--active' },
    inactive: { label: 'Ανενεργές',    badge: 'Ανενεργή',    cls: 'cook-badge--inactive' },
    deleted:  { label: 'Διαγραμμένες', badge: 'Διαγραμμένη', cls: 'cook-badge--deleted' }
};
const STATUS_ORDER = ['active', 'inactive', 'deleted'];

function allergenChips(allergens) {
    if (!allergens || allergens.length === 0) {
        return '';
    }
    const chips = allergens.map((allergen) =>
        `<span class="cook-chip">${escapeHtml(allergen.icon)} ${escapeHtml(allergen.name_el)}</span>`
    ).join('');
    return `<div class="cook-chips">${chips}</div>`;
}

function cardHtml(listing) {
    const meta = STATUS_META[listing.status] || STATUS_META.active;

    const photo = listing.photo_filename
        ? `<img class="cook-card__photo" src="/uploads/${escapeHtml(listing.photo_filename)}" alt="">`
        : '';

    const description = listing.description
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
                    ${description}
                    <p class="cook-card__meta">${listing.portions_available}/${listing.portions_total} μερίδες διαθέσιμες</p>
                    <p class="cook-card__meta">Σημείο: ${escapeHtml(listing.pickup_location_text)}</p>
                    <p class="cook-card__meta">Παραλαβή: ${formatShortDateTime(listing.pickup_time_from)} – ${formatShortDateTime(listing.pickup_time_to)}</p>
                    ${allergenChips(listing.allergens)}
                    ${actions}
                </div>
            </article>`;
}

function render(listings) {
    const groups = {};
    listings.forEach((listing) => {
        if (!groups[listing.status]) {
            groups[listing.status] = [];
        }
        groups[listing.status].push(listing);
    });

    let html = '';
    STATUS_ORDER.forEach((status) => {
        const items = groups[status];
        if (!items || items.length === 0) {
            return;
        }
        html += `
                <section class="cook-listings__group">
                    <h2 class="cook-listings__group-title">${STATUS_META[status].label} (${items.length})</h2>
                    <div class="cook-listings__grid">${items.map(cardHtml).join('')}</div>
                </section>`;
    });
    root.innerHTML = html;
}

async function loadListings() {
    clearAlert(alertBox);

    try {
        const data = await listingsApi.fetchMyListings();
        loading.classList.add('is-hidden');

        if (!data.listings || data.listings.length === 0) {
            empty.classList.remove('is-hidden');
            root.innerHTML = '';
            return;
        }

        empty.classList.add('is-hidden');
        render(data.listings);
    } catch (error) {
        loading.classList.add('is-hidden');

        if (error.status !== undefined) {
            showAlert(alertBox, error.message || 'Δεν ήταν δυνατή η φόρτωση των αγγελιών.');
            return;
        }

        console.error('Failed to load listings:', error);
        showAlert(alertBox, 'Πρόβλημα σύνδεσης με τον server. Δοκίμασε ξανά.');
    }
}

async function deleteListing(listingId, button) {
    if (!confirm('Σίγουρα θες να διαγράψεις αυτή την αγγελία;')) {
        return;
    }

    clearAlert(alertBox);
    button.disabled = true;

    try {
        await listingsApi.deleteListing(listingId);
        loadListings();
    } catch (error) {
        if (error.status !== undefined) {
            showAlert(alertBox, error.message || 'Δεν ήταν δυνατή η διαγραφή.');
            button.disabled = false;
            return;
        }

        console.error('Delete failed:', error);
        showAlert(alertBox, 'Πρόβλημα σύνδεσης με τον server. Δοκίμασε ξανά.');
        button.disabled = false;
    }
}

function handleRootClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) {
        return;
    }

    const action = button.dataset.action;
    const listingId = button.dataset.id;

    if (action === 'edit') {
        window.location.href = `${EDIT_PAGE}?id=${listingId}`;
    } else if (action === 'delete') {
        deleteListing(listingId, button);
    }
}

async function initPage() {
    await initLayout();

    if (!root) {
        return;
    }

    root.addEventListener('click', handleRootClick);
    loadListings();
}

initPage();
