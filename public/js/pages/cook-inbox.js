import { initLayout } from '../shared/layout.js';
import * as requestsApi from '../api/requests-api.js';
import { escapeHtml } from '../shared/escape.js';
import { formatShortDateTime } from '../shared/format.js';
import { showAlert, clearAlert } from '../shared/alerts.js';

const root = document.getElementById('requests-root');
const loading = document.getElementById('requests-loading');
const empty = document.getElementById('requests-empty');
const alertBox = document.getElementById('requests-alert');

const ACTION_STATUS = {
    approve: 'approved',
    reject:  'rejected',
    pickup:  'picked_up',
    no_show: 'no_show'
};
const ACTION_CONFIRMS = {
    reject:  'Σίγουρα θες να απορρίψεις το αίτημα; Ο πόντος επιστρέφεται στον χρήστη.',
    no_show: 'Να σημειωθεί ως no-show; Ο χρήστης χάνει 1 πόντο.'
};

const STATUS_META = {
    pending:   { label: 'Σε αναμονή',         badge: 'Σε αναμονή',   cls: 'cook-badge--pending' },
    approved:  { label: 'Εγκεκριμένα',        badge: 'Εγκεκριμένο',  cls: 'cook-badge--approved' },
    picked_up: { label: 'Παραλήφθηκαν',       badge: 'Παραλήφθηκε',  cls: 'cook-badge--pickedup' },
    no_show:   { label: 'Δεν εμφανίστηκαν',   badge: 'No-show',      cls: 'cook-badge--noshow' },
    rejected:  { label: 'Απορρίφθηκαν',       badge: 'Απορρίφθηκε',  cls: 'cook-badge--rejected' }
};
const STATUS_ORDER = ['pending', 'approved', 'picked_up', 'no_show', 'rejected'];

function actionsFor(request) {
    if (request.status === 'pending') {
        return `
                <div class="cook-card__actions">
                    <button class="btn-primary" data-action="approve" data-id="${request.id}">Έγκριση</button>
                    <button class="btn-danger" data-action="reject" data-id="${request.id}">Απόρριψη</button>
                </div>`;
    }
    if (request.status === 'approved') {
        return `
                <div class="cook-card__actions">
                    <button class="btn-primary" data-action="pickup" data-id="${request.id}">Παραλήφθηκε</button>
                    <button class="btn-danger" data-action="no_show" data-id="${request.id}">No-show</button>
                </div>`;
    }
    return '';
}

function cardHtml(request) {
    const meta = STATUS_META[request.status] || STATUS_META.pending;
    return `
            <article class="card cook-card">
                <div class="cook-card__body">
                    <div class="cook-card__top">
                        <h3 class="cook-card__title">${escapeHtml(request.listing_title)}</h3>
                        <span class="cook-badge ${meta.cls}">${meta.badge}</span>
                    </div>
                    <p class="cook-card__meta">Αίτημα από: ${escapeHtml(request.consumer_name)} (@${escapeHtml(request.consumer_username)})</p>
                    <p class="cook-card__meta">Μερίδα (slot): ${request.slot}</p>
                    <p class="cook-card__meta">Ημερομηνία: ${formatShortDateTime(request.requested_at)}</p>
                    ${actionsFor(request)}
                </div>
            </article>`;
}

function render(requests) {
    const groups = {};
    requests.forEach((request) => {
        if (!groups[request.status]) {
            groups[request.status] = [];
        }
        groups[request.status].push(request);
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

async function loadRequests() {
    clearAlert(alertBox);

    try {
        const data = await requestsApi.fetchIncomingRequests();
        loading.classList.add('is-hidden');

        if (!data.requests || data.requests.length === 0) {
            empty.classList.remove('is-hidden');
            root.innerHTML = '';
            return;
        }

        empty.classList.add('is-hidden');
        render(data.requests);
    } catch (error) {
        loading.classList.add('is-hidden');

        if (error.status !== undefined) {
            showAlert(alertBox, error.message || 'Δεν ήταν δυνατή η φόρτωση των αιτημάτων.');
            return;
        }

        console.error('Failed to load requests:', error);
        showAlert(alertBox, 'Πρόβλημα σύνδεσης με τον server. Δοκίμασε ξανά.');
    }
}

async function actOnRequest(action, requestId, button) {
    if (ACTION_CONFIRMS[action] && !confirm(ACTION_CONFIRMS[action])) {
        return;
    }

    clearAlert(alertBox);
    button.disabled = true;

    try {
        const status = ACTION_STATUS[action];
        await requestsApi.updateRequestStatus(requestId, status);
        loadRequests();
    } catch (error) {
        if (error.status !== undefined) {
            showAlert(alertBox, error.message || 'Η ενέργεια απέτυχε.');
            button.disabled = false;
            return;
        }

        console.error('Action failed:', error);
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
    const requestId = button.dataset.id;

    if (ACTION_STATUS[action]) {
        actOnRequest(action, requestId, button);
    }
}

async function initPage() {
    await initLayout();

    if (!root) {
        return;
    }

    root.addEventListener('click', handleRootClick);
    loadRequests();
}

initPage();
