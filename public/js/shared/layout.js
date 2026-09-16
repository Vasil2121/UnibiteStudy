import { escapeHtml } from './escape.js';
import * as authApi from '../api/auth-api.js';

const PUBLIC_PAGES = ['/login.html', '/register.html'];
const FEED_PAGE = '/consumer/feed.html';
const LOGIN_PAGE = '/login.html';

function isPublicPage() {
    return PUBLIC_PAGES.includes(window.location.pathname);
}

async function loadCurrentUser() {
    try {
        return await authApi.fetchCurrentUser();
    } catch (error) {
        if (error.status === 401) {
            return null;
        }

        if (error.status !== undefined) {
            throw new Error('Αποτυχία ανάκτησης στοιχείων χρήστη');
        }

        throw error;
    }
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
    const button = document.getElementById('hamburger-btn');
    const nav = document.getElementById('main-nav');

    if (!button || !nav) {
        return;
    }

    button.addEventListener('click', function () {
        const isCurrentlyOpen = button.getAttribute('aria-expanded') === 'true';
        const willBeOpen = !isCurrentlyOpen;

        button.setAttribute('aria-expanded', String(willBeOpen));
        button.setAttribute(
            'aria-label',
            willBeOpen ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'
        );
        nav.classList.toggle('is-open', willBeOpen);
    });
}

function connectLogout() {
    const button = document.querySelector('.site-header__logout');

    if (!button) {
        return;
    }

    button.addEventListener('click', async function () {
        button.disabled = true;

        try {
            await authApi.logout();
            window.location.href = LOGIN_PAGE;
        } catch (error) {
            if (error.status === undefined) {
                console.error(error);
            }
            button.disabled = false;
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

export async function refreshHeaderPoints() {
    const user = await loadCurrentUser();

    if (user === null) {
        return;
    }

    const pointsElement = document.getElementById('header-user-points');
    if (pointsElement) {
        pointsElement.textContent = `${Number(user.points)} πόντοι`;
    }
}

export async function initLayout() {
    let user = null;

    try {
        user = await loadCurrentUser();
    } catch (error) {
        console.error(error);
        renderLayout(null);
        return null;
    }

    if (user === null && !isPublicPage()) {
        window.location.href = LOGIN_PAGE;
        return null;
    }

    if (user !== null && isPublicPage()) {
        window.location.href = FEED_PAGE;
        return user;
    }

    renderLayout(user);
    return user;
}
