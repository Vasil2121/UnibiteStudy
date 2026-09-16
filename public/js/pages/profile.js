import { initLayout } from '../shared/layout.js';
import * as profileApi from '../api/profile-api.js';
import { escapeHtml } from '../shared/escape.js';
import { formatDateTime } from '../shared/format.js';

const accountRoot = document.getElementById('profile-account');
const transactionsRoot = document.getElementById('profile-transactions');

const REASON_LABELS = {
    signup_bonus:      '🎁 Μπόνους Εγγραφής στην Πλατφόρμα',
    request_spent:     '🍽️ Δέσμευση Μερίδας Φαγητού',
    request_refunded:  '🔄 Επιστροφή Πόντου (Ακύρωση / Απόρριψη)',
    pickup_completed:  '✅ Επιτυχής Παραλαβή Γεύματος',
    no_show_penalty:   '❌ Ποινή: Μη Εμφάνιση στην Παραλαβή',
    unrated_penalty:   '⚠️ Ποινή: Παράλειψη Αξιολόγησης (48 ώρες)',
    cook_reward_base:  '👨‍🍳 Επιβράβευση Μάγειρα (Βασική)',
    cook_reward_bonus: '🌟 Επιβράβευση Μάγειρα (Υψηλή Βαθμολογία)'
};

function renderAccount(user) {
    accountRoot.innerHTML = `
            <p><strong>Όνοματεπώνυμο:</strong> ${escapeHtml(user.fullName)}</p>
            <p><strong>Όνομα Χρήστη (Username):</strong> ${escapeHtml(user.username)}</p>
            <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
            <p><strong>Τρέχον Υπόλοιπο Πόντων:</strong> <span style="color: var(--color-primary); font-weight: bold;">${Number(user.points)} πόντοι</span></p>`;
}

function transactionRowHtml(transaction) {
    const reasonText = REASON_LABELS[transaction.reason] || '📝 Άλλη Δραστηριότητα';
    const isPositive = Number(transaction.delta) > 0;
    const color = isPositive ? '#27ae60' : '#c0392b';
    const prefix = isPositive ? '+' : '';
    return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-size: 14px; color: #555;">${escapeHtml(formatDateTime(transaction.created_at))}</td>
                <td style="padding: 12px; font-size: 15px;">${escapeHtml(reasonText)}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: ${color};">${prefix}${Number(transaction.delta)}</td>
            </tr>`;
}

function renderTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
        transactionsRoot.innerHTML = '<p style="color: #666; font-style: italic;">Δεν υπάρχουν ακόμη καταγεγραμμένες συναλλαγές πόντων.</p>';
        return;
    }
    const rows = transactions.map(transactionRowHtml).join('');
    transactionsRoot.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; text-align: left;">
                <thead>
                <tr style="border-bottom: 2px solid #eee; background-color: #f9f9f9;">
                    <th style="padding: 12px;">Ημερομηνία</th>
                    <th style="padding: 12px;">Αιτιολογία</th>
                    <th style="padding: 12px; text-align: right;">Πόντοι</th>
                </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
}

async function initPage() {
    const user = await initLayout();

    if (!accountRoot || !transactionsRoot) {
        return;
    }

    if (!user) {
        return;
    }

    renderAccount(user);

    try {
        const data = await profileApi.fetchMyTransactions();
        renderTransactions(data.transactions);
    } catch (error) {
        if (error.status !== undefined) {
            transactionsRoot.innerHTML = '<p style="color: #666; font-style: italic;">Δεν ήταν δυνατή η φόρτωση του ιστορικού.</p>';
            return;
        }

        console.error('Failed to load transactions:', error);
        transactionsRoot.innerHTML = '<p style="color: #666; font-style: italic;">Πρόβλημα σύνδεσης με τον server. Δοκίμασε ξανά.</p>';
    }
}

initPage();
