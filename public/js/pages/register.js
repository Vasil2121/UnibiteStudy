import { initLayout } from '../shared/layout.js';
import * as authApi from '../api/auth-api.js';
import { showAlert, clearAlert } from '../shared/alerts.js';
import { clearFieldErrors, showFieldErrors } from '../shared/form-errors.js';

const form = document.getElementById('register-form');
const submitButton = document.getElementById('submit-btn');
const pageAlert = document.getElementById('form-alert');

async function handleSubmit(event) {
    event.preventDefault();

    clearFieldErrors(form);
    clearAlert(pageAlert);

    const password = form.password.value;
    const passwordConfirm = form.password_confirm.value;

    if (password !== passwordConfirm) {
        showFieldErrors(form, { password_confirm: 'Οι κωδικοί δεν ταιριάζουν.' });
        return;
    }

    const registration = {
        fullName: form.full_name.value.trim(),
        username: form.username.value.trim(),
        email: form.email.value.trim(),
        password: password,
        password_confirm: passwordConfirm
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Εγγραφή...';

    try {
        await authApi.register(registration);
        window.location.href = '/consumer/feed.html';
    } catch (error) {
        if (error.status === undefined) {
            console.error('Register request failed:', error);
            showAlert(pageAlert, 'Πρόβλημα σύνδεσης με τον server. Δοκιμάστε ξανά.');
        } else if (error.fields && typeof error.fields === 'object') {
            showFieldErrors(form, error.fields);
        } else {
            showAlert(pageAlert, error.message || 'Η εγγραφή απέτυχε. Δοκιμάστε ξανά.');
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Εγγραφή';
    }
}

async function initPage() {
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    await initLayout();
}

initPage();
