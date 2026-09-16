import { initLayout, refreshHeaderPoints } from '../shared/layout.js';
import * as requestsApi from '../api/requests-api.js';
import * as ratingsApi from '../api/ratings-api.js';
import { escapeHtml } from '../shared/escape.js';

const wrapper = document.getElementById('requests-wrapper');
const modal = document.getElementById('rating-modal');
const closeButton = document.querySelector('.modal__close-btn');
const ratingForm = document.getElementById('rating-form');
const modalRequestId = document.getElementById('modal-request-id');
const ratingScoreValue = document.getElementById('rating-score-value');
const ratingComment = document.getElementById('rating-comment');
const submitButton = document.getElementById('rating-submit-btn');
const starNodes = document.querySelectorAll('.star-node');

const STATUS_LABELS = {
    'pending': 'Εκκρεμεί Έγκριση',
    'approved': 'Εγκρίθηκε (Έτοιμο προς παραλαβή)',
    'rejected': 'Απορρίφθηκε (Επιστροφή πόντου)',
    'picked_up': 'Παραλήφθηκε',
    'no_show': 'Δεν Εμφανιστήκατε (Ποινή)'
};

function renderRequests(requests) {
    wrapper.innerHTML = '';

    if (requests.length === 0) {
        wrapper.innerHTML = '<div class="requests-wrapper__empty">Δεν έχετε στείλει κανένα αίτημα για γεύμα ακόμα.</div>';
        return;
    }

    requests.forEach((request) => {
        const row = document.createElement('div');
        row.className = 'request-row';

        const dateFormatted = new Date(request.requested_at).toLocaleString('el-GR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        let actionHtml = '';
        if (request.status === 'picked_up') {
            if (request.is_rated) {
                actionHtml = '<span class="txt-rated">✓ Βαθμολογήθηκε</span>';
            } else {
                actionHtml = `<button class="btn-rate" data-id="${request.id}">Βαθμολόγηση</button>`;
            }
        } else {
            actionHtml = `<span class="status-badge status-badge--${request.status}">${STATUS_LABELS[request.status] || request.status}</span>`;
        }

        row.innerHTML = `
                <div class="request-row__info">
                    <h3 class="request-row__title">${escapeHtml(request.listing_title)}</h3>
                    <p class="request-row__meta">👨‍🍳 <strong>Μάγειρας:</strong> ${escapeHtml(request.cook_name)} (@${escapeHtml(request.cook_username)})</p>
                    <p class="request-row__meta">📍 <strong>Τοποθεσία:</strong> ${escapeHtml(request.pickup_location_text)}</p>
                    <p class="request-row__meta">📅 <strong>Ημερομηνία Αιτήματος:</strong> ${dateFormatted}</p>
                    <p class="request-row__meta">🍽️ <strong>Μερίδα (Slot):</strong> ${request.slot}</p>
                </div>
                <div class="request-row__action">
                    ${actionHtml}
                </div>
            `;
        wrapper.appendChild(row);
    });
}

async function loadRequests() {
    try {
        const data = await requestsApi.fetchMyRequests();
        renderRequests(data.requests);
    } catch (error) {
        if (error.status !== undefined) {
            wrapper.innerHTML = `<div class="requests-wrapper__empty">Σφάλμα: ${error.message}</div>`;
            return;
        }

        console.error('Failure fetching historical logs:', error);
        wrapper.innerHTML = '<div class="requests-wrapper__empty">Αδυναμία φόρτωσης ιστορικού.</div>';
    }
}

function handleWrapperClick(event) {
    if (!event.target.classList.contains('btn-rate')) {
        return;
    }

    const requestId = event.target.getAttribute('data-id');
    modalRequestId.value = requestId;

    ratingScoreValue.value = '0';
    ratingComment.value = '';
    submitButton.disabled = true;
    starNodes.forEach((star) => {
        star.classList.remove('is-active');
    });

    modal.style.display = 'flex';
}

function selectScore(selectedScore) {
    ratingScoreValue.value = selectedScore;
    submitButton.disabled = false;

    starNodes.forEach((star) => {
        const starValue = parseInt(star.getAttribute('data-value'), 10);
        if (starValue <= selectedScore) {
            star.classList.add('is-active');
        } else {
            star.classList.remove('is-active');
        }
    });
}

function restoreSubmitButton() {
    submitButton.disabled = false;
    submitButton.textContent = 'Υποβολή Βαθμολογίας';
}

async function handleRatingSubmit(event) {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Υποβολή...';

    const requestId = parseInt(modalRequestId.value, 10);
    const score = parseInt(ratingScoreValue.value, 10);

    try {
        await ratingsApi.submitRating(requestId, score, ratingComment.value);
        alert('Η βαθμολογία σας υποβλήθηκε! Ο μάγειρας επιβραβεύτηκε με τους ανάλογους πόντους.');
        modal.style.display = 'none';
        refreshHeaderPoints();
        loadRequests();
    } catch (error) {
        if (error.status !== undefined) {
            alert('Σφάλμα: ' + error.message);
            restoreSubmitButton();
            return;
        }

        console.error('Error posting evaluation feedback details:', error);
        alert('Αδυναμία επικοινωνίας με τον διακομιστή.');
        restoreSubmitButton();
    }
}

function closeModal() {
    modal.style.display = 'none';
}

function handleWindowClick(event) {
    if (event.target === modal) {
        closeModal();
    }
}

function connectEvents() {
    wrapper.addEventListener('click', handleWrapperClick);
    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', handleWindowClick);

    starNodes.forEach((star) => {
        star.addEventListener('click', function () {
            selectScore(parseInt(star.getAttribute('data-value'), 10));
        });
    });

    ratingForm.addEventListener('submit', handleRatingSubmit);
}

async function initPage() {
    connectEvents();
    await initLayout();
    loadRequests();
}

initPage();
