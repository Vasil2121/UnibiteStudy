const PUBLIC_PAGES = ['/login.html', '/register.html'];
const FEED_PAGE = '/consumer/feed.html';
const LOGIN_PAGE = '/login.html';

window.currentUser = null;

let announceCurrentUser;
window.currentUserReady = new Promise((resolve) => {
    announceCurrentUser = resolve;
});

function isPublicPage() {
    return PUBLIC_PAGES.includes(window.location.pathname);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function fetchCurrentUser() {
    const response = await fetch('/api/auth/me', {
        headers: {
            'Accept': 'application/json'
        }
    });

    if (response.status === 401) {
        return null;
    }

    if (!response.ok) {
        throw new Error('Αποτυχία ανάκτησης στοιχείων χρήστη');
    }

    return response.json();
}

function buildLoggedInNavHtml(user) {
    const adminLinkHtml = user.isAdmin
        ? `
                <a href="/admin/dashboard.html"
                   class="site-header__link site-header__link--admin">
                    Admin
                </a>
`
        : '';

    return `
            <span class="site-header__user">
                    <span class="site-header__username">
                        ${escapeHtml(user.fullName)}
                    </span>
                    <span class="site-header__points" id="header-user-points">
                        ${Number(user.points)} πόντοι
                    </span>
                </span>

            <a href="/consumer/feed.html" class="site-header__link">
                🔎 Ανακάλυψη Φαγητού
            </a>
            <a href="/consumer/my-requests.html" class="site-header__link">
                📋 Τα Αιτήματά μου
            </a>

            <a href="/cook/my-listings.html" class="site-header__link">
                👨‍🍳 Οι Αγγελίες μου
            </a>
            <a href="/cook/inbox.html" class="site-header__link">
                📥 Εισερχόμενα Αιτήματα
            </a>

            <a href="/profile.html" class="site-header__link">
                👤 Το Προφίλ μου
            </a>
${adminLinkHtml}
            <button type="button"
                    class="site-header__link site-header__logout">
                Αποσύνδεση
            </button>
`;
}

function buildGuestNavHtml() {
    return `
            <a href="/login.html" class="site-header__link">
                Σύνδεση
            </a>
            <a href="/register.html"
               class="site-header__link site-header__link--cta">
                Εγγραφή
            </a>
`;
}

function buildHeaderHtml(user) {
    const isLoggedIn = user !== null;
    const brandHref = isLoggedIn ? FEED_PAGE : LOGIN_PAGE;
    const navHtml = isLoggedIn ? buildLoggedInNavHtml(user) : buildGuestNavHtml();

    return `
<header class="site-header">
    <div class="site-header__inner">

        <a class="site-header__brand"
           href="${brandHref}">
            UniBite
        </a>

        <button type="button"
                class="site-header__hamburger"
                id="hamburger-btn"
                aria-label="Άνοιγμα μενού"
                aria-expanded="false"
                aria-controls="main-nav">
            <span></span>
            <span></span>
            <span></span>
        </button>

        <nav class="site-header__nav" id="main-nav">
${navHtml}
        </nav>

    </div>
</header>
`;
}

function buildFooterHtml() {
    return `
<footer class="site-footer">
    <div class="site-footer__inner">
        <p>
            © 2026 UniBite — ΤΜΗΥΠ, Πανεπιστήμιο Πατρών
        </p>
    </div>
</footer>
`;
}

function connectHamburger() {
    const btn = document.getElementById('hamburger-btn');
    const nav = document.getElementById('main-nav');

    if (!btn || !nav) return;

    btn.addEventListener('click', () => {

        const isCurrentlyOpen = btn.getAttribute('aria-expanded') === 'true';
        const willBeOpen = !isCurrentlyOpen;

        btn.setAttribute('aria-expanded', String(willBeOpen));
        btn.setAttribute(
            'aria-label',
            willBeOpen ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'
        );
        nav.classList.toggle('is-open', willBeOpen);
    });
}

function connectLogout() {
    const btn = document.querySelector('.site-header__logout');

    if (!btn) return;

    btn.addEventListener('click', async () => {
        btn.disabled = true;

        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                window.location.href = LOGIN_PAGE;
                return;
            }

            btn.disabled = false;

        } catch (error) {
            console.error(error);
            btn.disabled = false;
        }
    });
}

function renderLayout(user) {
    const headerSlot = document.getElementById('site-header');
    const footerSlot = document.getElementById('site-footer');

    if (headerSlot) {
        headerSlot.innerHTML = buildHeaderHtml(user);
        connectHamburger();
        connectLogout();
    }

    if (footerSlot) {
        footerSlot.innerHTML = buildFooterHtml();
    }
}

window.refreshHeader = async function () {
    const user = await fetchCurrentUser();
    window.currentUser = user;

    if (user === null) return;

    const pointsEl = document.getElementById('header-user-points');
    if (pointsEl) {
        pointsEl.textContent = `${Number(user.points)} πόντοι`;
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    let user = null;

    try {
        user = await fetchCurrentUser();
    } catch (error) {
        console.error(error);
        announceCurrentUser(null);
        renderLayout(null);
        return;
    }

    window.currentUser = user;
    announceCurrentUser(user);

    if (user === null && !isPublicPage()) {
        window.location.href = LOGIN_PAGE;
        return;
    }

    if (user !== null && isPublicPage()) {
        window.location.href = FEED_PAGE;
        return;
    }

    renderLayout(user);
});
