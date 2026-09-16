window.logout = async function(options = {}) {
    const isAutoTrigger = options.autoTrigger === true;

    const statusEl = document.getElementById('logout-status');
    const alertEl  = document.getElementById('logout-alert');
    const btnEl    = document.getElementById('manual-logout-btn');

    if (alertEl) {
        alertEl.textContent = '';
        alertEl.hidden = true;
    }
    if (btnEl) {
        btnEl.hidden = true;
        btnEl.disabled = true;
    }
    if (statusEl) {
        statusEl.textContent = 'Αποσύνδεση σε εξέλιξη...';
    }

    try {

        const response = await fetch('/unibite/api/auth/logout.php', {
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            if (statusEl) {
                statusEl.textContent = 'Αποσυνδεθήκατε. Ανακατεύθυνση...';
            }
            window.location.href = '/unibite/login.php';
        } else {
            handleLogoutFailure('Η αποσύνδεση απέτυχε. Δοκιμάστε ξανά.');
        }

    } catch (error) {
        console.error('Logout request failed:', error);
        handleLogoutFailure('Πρόβλημα σύνδεσης με τον server. Δοκιμάστε ξανά.');
    }

    function handleLogoutFailure(message) {
        if (statusEl) {
            statusEl.textContent = '';
        }
        if (alertEl) {
            alertEl.textContent = message;
            alertEl.hidden = false;
        }
        if (isAutoTrigger && btnEl) {
            btnEl.hidden = false;
            btnEl.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('manual-logout-btn');
    if (btn) {
        btn.addEventListener('click', () => window.logout());
    }
});
