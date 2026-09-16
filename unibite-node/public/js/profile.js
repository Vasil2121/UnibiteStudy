document.addEventListener('DOMContentLoaded', async () => {

    const accountRoot = document.getElementById('profile-account');
    const txRoot       = document.getElementById('profile-transactions');
    if (!accountRoot || !txRoot) return;

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

    function formatDateTime(value) {
        if (!value) return '';
        const [datePart, timePart] = value.split(' ');
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year} ${timePart.slice(0, 5)}`;
    }

    function renderAccount(user) {
        accountRoot.innerHTML = `
            <p><strong>Όνοματεπώνυμο:</strong> ${escapeHtml(user.fullName)}</p>
            <p><strong>Όνομα Χρήστη (Username):</strong> ${escapeHtml(user.username)}</p>
            <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
            <p><strong>Τρέχον Υπόλοιπο Πόντων:</strong> <span style="color: var(--color-primary); font-weight: bold;">${Number(user.points)} πόντοι</span></p>`;
    }

    function transactionRowHtml(tx) {
        const reasonText = REASON_LABELS[tx.reason] || '📝 Άλλη Δραστηριότητα';
        const isPositive = Number(tx.delta) > 0;
        const color = isPositive ? '#27ae60' : '#c0392b';
        const prefix = isPositive ? '+' : '';
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-size: 14px; color: #555;">${escapeHtml(formatDateTime(tx.created_at))}</td>
                <td style="padding: 12px; font-size: 15px;">${escapeHtml(reasonText)}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: ${color};">${prefix}${Number(tx.delta)}</td>
            </tr>`;
    }

    function renderTransactions(transactions) {
        if (!transactions || transactions.length === 0) {
            txRoot.innerHTML = '<p style="color: #666; font-style: italic;">Δεν υπάρχουν ακόμη καταγεγραμμένες συναλλαγές πόντων.</p>';
            return;
        }
        const rows = transactions.map(transactionRowHtml).join('');
        txRoot.innerHTML = `
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

    const user = await window.currentUserReady;
    if (!user) return;

    renderAccount(user);

    try {
        const response = await fetch('/api/profile/transactions', { headers: { 'Accept': 'application/json' } });
        const data = await response.json();

        if (!response.ok) {
            txRoot.innerHTML = '<p style="color: #666; font-style: italic;">Δεν ήταν δυνατή η φόρτωση του ιστορικού.</p>';
            return;
        }

        renderTransactions(data.transactions);

    } catch (error) {
        console.error('Failed to load transactions:', error);
        txRoot.innerHTML = '<p style="color: #666; font-style: italic;">Πρόβλημα σύνδεσης με τον server. Δοκίμασε ξανά.</p>';
    }
});
