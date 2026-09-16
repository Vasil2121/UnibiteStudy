document.addEventListener('DOMContentLoaded', () => {

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

});
