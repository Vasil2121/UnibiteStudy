document.addEventListener('DOMContentLoaded', () => {

    const root     = document.getElementById('requests-root');
    const loading  = document.getElementById('requests-loading');
    const empty    = document.getElementById('requests-empty');
    const alertBox = document.getElementById('requests-alert');
    if (!root) return;

    const ENDPOINT = '/api/requests/incoming';
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

    function actionsFor(req) {
        if (req.status === 'pending') {
            return `
                <div class="cook-card__actions">
                    <button class="btn-primary" data-action="approve" data-id="${req.id}">Έγκριση</button>
                    <button class="btn-danger" data-action="reject" data-id="${req.id}">Απόρριψη</button>
                </div>`;
        }
        if (req.status === 'approved') {
            return `
                <div class="cook-card__actions">
                    <button class="btn-primary" data-action="pickup" data-id="${req.id}">Παραλήφθηκε</button>
                    <button class="btn-danger" data-action="no_show" data-id="${req.id}">No-show</button>
                </div>`;
        }
        return '';
    }

    function cardHtml(req) {
        const meta = STATUS_META[req.status] || STATUS_META.pending;
        return `
            <article class="card cook-card">
                <div class="cook-card__body">
                    <div class="cook-card__top">
                        <h3 class="cook-card__title">${escapeHtml(req.listing_title)}</h3>
                        <span class="cook-badge ${meta.cls}">${meta.badge}</span>
                    </div>
                    <p class="cook-card__meta">Αίτημα από: ${escapeHtml(req.consumer_name)} (@${escapeHtml(req.consumer_username)})</p>
                    <p class="cook-card__meta">Μερίδα (slot): ${req.slot}</p>
                    <p class="cook-card__meta">Ημερομηνία: ${formatDateTime(req.requested_at)}</p>
                    ${actionsFor(req)}
                </div>
            </article>`;
    }

    function render(requests) {
        const groups = {};
        requests.forEach(r => {
            (groups[r.status] = groups[r.status] || []).push(r);
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

            if (!response.ok) {
                showAlert(data.error || 'Δεν ήταν δυνατή η φόρτωση των αιτημάτων.');
                return;
            }
            if (!data.requests || data.requests.length === 0) {
                empty.classList.remove('is-hidden');
                root.innerHTML = '';
                return;
            }
            empty.classList.add('is-hidden');
            render(data.requests);

        } catch (error) {
            console.error('Failed to load requests:', error);
            loading.classList.add('is-hidden');
            showAlert('Πρόβλημα σύνδεσης με τον server. Δοκίμασε ξανά.');
        }
    }

    async function actOnRequest(action, id, btn) {
        if (ACTION_CONFIRMS[action] && !confirm(ACTION_CONFIRMS[action])) {
            return;
        }

        clearAlert();
        btn.disabled = true;
        try {
            const status = ACTION_STATUS[action];
            const response = await fetch(`/api/requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await response.json();

            if (response.ok) {
                load();
            } else {
                showAlert(data.error || 'Η ενέργεια απέτυχε.');
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Action failed:', error);
            showAlert('Πρόβλημα σύνδεσης με τον server. Δοκίμασε ξανά.');
            btn.disabled = false;
        }
    }

    root.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const id     = btn.dataset.id;

        if (ACTION_STATUS[action]) {
            actOnRequest(action, id, btn);
        }
    });

    load();
});
