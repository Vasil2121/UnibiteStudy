document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.getElementById('requests-wrapper');
    const modal = document.getElementById('rating-modal');
    const closeBtn = document.querySelector('.modal__close-btn');
    const ratingForm = document.getElementById('rating-form');
    const modalRequestId = document.getElementById('modal-request-id');
    const ratingScoreValue = document.getElementById('rating-score-value');
    const ratingComment = document.getElementById('rating-comment');
    const submitBtn = document.getElementById('rating-submit-btn');
    const starNodes = document.querySelectorAll('.star-node');

    const statusMap = {
        'pending': 'Εκκρεμεί Έγκριση',
        'approved': 'Εγκρίθηκε (Έτοιμο προς παραλαβή)',
        'rejected': 'Απορρίφθηκε (Επιστροφή πόντου)',
        'picked_up': 'Παραλήφθηκε',
        'no_show': 'Δεν Εμφανιστήκατε (Ποινή)'
    };

    function loadRequests() {
        fetch('/api/requests/mine')
            .then(response => response.json().then(data => ({ response, data })))
            .then(({ response, data }) => {
                if (response.ok) {
                    renderRequests(data.requests);
                } else {
                    wrapper.innerHTML = `<div class="requests-wrapper__empty">Σφάλμα: ${data.error}</div>`;
                }
            })
            .catch(error => {
                console.error('Failure fetching historical logs:', error);
                wrapper.innerHTML = '<div class="requests-wrapper__empty">Αδυναμία φόρτωσης ιστορικού.</div>';
            });
    }

    function renderRequests(requests) {
        wrapper.innerHTML = '';

        if (requests.length === 0) {
            wrapper.innerHTML = '<div class="requests-wrapper__empty">Δεν έχετε στείλει κανένα αίτημα για γεύμα ακόμα.</div>';
            return;
        }

        requests.forEach(req => {
            const row = document.createElement('div');
            row.className = 'request-row';

            const dateFormatted = new Date(req.requested_at).toLocaleString('el-GR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            let actionHtml = '';
            if (req.status === 'picked_up') {
                if (req.is_rated) {
                    actionHtml = '<span class="txt-rated">✓ Βαθμολογήθηκε</span>';
                } else {
                    actionHtml = `<button class="btn-rate" data-id="${req.id}">Βαθμολόγηση</button>`;
                }
            } else {
                actionHtml = `<span class="status-badge status-badge--${req.status}">${statusMap[req.status] || req.status}</span>`;
            }

            row.innerHTML = `
                <div class="request-row__info">
                    <h3 class="request-row__title">${escapeHtml(req.listing_title)}</h3>
                    <p class="request-row__meta">👨‍🍳 <strong>Μάγειρας:</strong> ${escapeHtml(req.cook_name)} (@${escapeHtml(req.cook_username)})</p>
                    <p class="request-row__meta">📍 <strong>Τοποθεσία:</strong> ${escapeHtml(req.pickup_location_text)}</p>
                    <p class="request-row__meta">📅 <strong>Ημερομηνία Αιτήματος:</strong> ${dateFormatted}</p>
                    <p class="request-row__meta">🍽️ <strong>Μερίδα (Slot):</strong> ${req.slot}</p>
                </div>
                <div class="request-row__action">
                    ${actionHtml}
                </div>
            `;
            wrapper.appendChild(row);
        });
    }

    wrapper.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-rate')) {
            const requestId = e.target.getAttribute('data-id');
            modalRequestId.value = requestId;

            ratingScoreValue.value = "0";
            ratingComment.value = "";
            submitBtn.disabled = true;
            starNodes.forEach(s => s.classList.remove('is-active'));

            modal.style.display = 'flex';
        }
    });

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    starNodes.forEach(star => {
        star.addEventListener('click', function() {
            const selectedScore = parseInt(this.getAttribute('data-value'), 10);
            ratingScoreValue.value = selectedScore;
            submitBtn.disabled = false;

            starNodes.forEach(s => {
                const val = parseInt(s.getAttribute('data-value'), 10);
                if (val <= selectedScore) {
                    s.classList.add('is-active');
                } else {
                    s.classList.remove('is-active');
                }
            });
        });
    });

    ratingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Υποβολή...';

        fetch('/api/ratings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requestId: parseInt(modalRequestId.value, 10),
                score: parseInt(ratingScoreValue.value, 10),
                comment: ratingComment.value
            })
        })
            .then(response => response.json().then(data => ({ response, data })))
            .then(({ response, data }) => {
                if (response.ok) {
                    alert('Η βαθμολογία σας υποβλήθηκε! Ο μάγειρας επιβραβεύτηκε με τους ανάλογους πόντους.');
                    modal.style.display = 'none';
                    if (window.refreshHeader) {
                        window.refreshHeader();
                    }
                    loadRequests();
                } else {
                    alert('Σφάλμα: ' + data.error);
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Υποβολή Βαθμολογίας';
                }
            })
            .catch(error => {
                console.error('Error posting evaluation feedback details:', error);
                alert('Αδυναμία επικοινωνίας με τον διακομιστή.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Υποβολή Βαθμολογίας';
            });
    });

    loadRequests();

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
