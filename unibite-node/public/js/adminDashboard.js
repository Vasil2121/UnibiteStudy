document.addEventListener('DOMContentLoaded', async () => {

    const usernameEl = document.getElementById('dashboard-username');
    const statsRoot   = document.getElementById('dashboard-stats');
    const alertBox    = document.getElementById('dashboard-alert');
    if (!statsRoot) return;

    const CARD_DEFS = [
        { border: 'var(--color-info)',      emoji: '🍲',  label: 'Μερίδες που Μοιράστηκαν', key: 'portionsSharedLastMonth' },
        { border: 'var(--color-secondary)', emoji: '👥',  label: 'Σύνολο Χρηστών',           key: 'totalUsers' },
        { border: 'var(--color-success)',   emoji: '🍽️', label: 'Ενεργές Αγγελίες',          key: 'activeListings' },
        { border: 'var(--color-primary)',   emoji: '⭐', label: 'Μέση Βαθμολογία',           key: 'averageRating' }
    ];

    function cardHtml(def, value) {
        return `
            <div class="card" style="border-left: 4px solid ${def.border}; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: var(--space-xs);">${def.emoji}</div>
                <p style="font-size: var(--text-sm); color: var(--color-text-muted); margin: 0 0 var(--space-xs);">
                    ${def.label}
                </p>
                <p style="font-size: var(--text-3xl); font-weight: var(--weight-bold); margin: 0; color: var(--color-text);">
                    ${value}
                </p>
            </div>`;
    }

    function render(stats) {
        const html = CARD_DEFS.map(def => {
            let value = stats[def.key];
            if (def.key === 'averageRating' && (value === null || value === undefined)) {
                value = '—';
            }
            return cardHtml(def, value);
        }).join('');
        statsRoot.innerHTML = html;
    }

    function showAlert(message) {
        statsRoot.innerHTML = '';
        alertBox.textContent = message;
        alertBox.classList.remove('is-hidden');
    }

    const user = await window.currentUserReady;
    if (!user) return;
    if (usernameEl) usernameEl.textContent = user.fullName;

    try {
        const response = await fetch('/api/admin/stats', { headers: { 'Accept': 'application/json' } });

        if (response.status === 403) {
            showAlert('Απαγορεύεται η πρόσβαση. Η σελίδα είναι μόνο για διαχειριστές.');
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            showAlert('Δεν ήταν δυνατή η φόρτωση των στατιστικών.');
            return;
        }

        render(data);

    } catch (error) {
        console.error('Failed to load stats:', error);
        showAlert('Δεν ήταν δυνατή η φόρτωση των στατιστικών.');
    }
});
