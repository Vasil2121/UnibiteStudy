import { initLayout } from '../shared/layout.js';
import * as adminApi from '../api/admin-api.js';
import { showAlert } from '../shared/alerts.js';

const usernameElement = document.getElementById('dashboard-username');
const statsRoot = document.getElementById('dashboard-stats');
const alertBox = document.getElementById('dashboard-alert');

const CARD_DEFS = [
    { border: 'var(--color-info)',      emoji: '🍲',  label: 'Μερίδες που Μοιράστηκαν', key: 'portionsSharedLastMonth' },
    { border: 'var(--color-secondary)', emoji: '👥',  label: 'Σύνολο Χρηστών',           key: 'totalUsers' },
    { border: 'var(--color-success)',   emoji: '🍽️', label: 'Ενεργές Αγγελίες',          key: 'activeListings' },
    { border: 'var(--color-primary)',   emoji: '⭐', label: 'Μέση Βαθμολογία',           key: 'averageRating' }
];

function cardHtml(definition, value) {
    return `
            <div class="card" style="border-left: 4px solid ${definition.border}; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: var(--space-xs);">${definition.emoji}</div>
                <p style="font-size: var(--text-sm); color: var(--color-text-muted); margin: 0 0 var(--space-xs);">
                    ${definition.label}
                </p>
                <p style="font-size: var(--text-3xl); font-weight: var(--weight-bold); margin: 0; color: var(--color-text);">
                    ${value}
                </p>
            </div>`;
}

function render(stats) {
    const html = CARD_DEFS.map((definition) => {
        let value = stats[definition.key];
        if (definition.key === 'averageRating' && (value === null || value === undefined)) {
            value = '—';
        }
        return cardHtml(definition, value);
    }).join('');
    statsRoot.innerHTML = html;
}

function showPageAlert(message) {
    statsRoot.innerHTML = '';
    showAlert(alertBox, message);
}

async function initPage() {
    const user = await initLayout();

    if (!statsRoot) {
        return;
    }

    if (!user) {
        return;
    }

    if (usernameElement) {
        usernameElement.textContent = user.fullName;
    }

    try {
        const stats = await adminApi.fetchStats();
        render(stats);
    } catch (error) {
        if (error.status === 403) {
            showPageAlert('Απαγορεύεται η πρόσβαση. Η σελίδα είναι μόνο για διαχειριστές.');
            return;
        }

        if (error.status === undefined) {
            console.error('Failed to load stats:', error);
        }

        showPageAlert('Δεν ήταν δυνατή η φόρτωση των στατιστικών.');
    }
}

initPage();
