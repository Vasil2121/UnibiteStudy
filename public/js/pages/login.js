import { initLayout } from '../shared/layout.js';
import * as authApi from '../api/auth-api.js';
import { showAlert, clearAlert } from '../shared/alerts.js';
import { clearFieldErrors, showFieldErrors } from '../shared/form-errors.js';

const form = document.getElementById('login-form');
const submitButton = document.getElementById('submit-btn');
const pageAlert = document.getElementById('form-alert');

async function handleSubmit(event) {
    event.preventDefault();

    clearFieldErrors(form);
    clearAlert(pageAlert);

    const identifier = form.identifier.value.trim();
    const password = form.password.value;

    submitButton.disabled = true;
    submitButton.textContent = 'Σύνδεση...';

    try {
        await authApi.login(identifier, password);
        window.location.href = '/consumer/feed.html';
    } catch (error) {
        if (error.status === undefined) {
            console.error('Login request failed:', error);
            showAlert(pageAlert, 'Πρόβλημα σύνδεσης με τον server. Δοκιμάστε ξανά.');
        } else if (error.fields && typeof error.fields === 'object') {
            showFieldErrors(form, error.fields);
        } else {
            showAlert(pageAlert, error.message || 'Η σύνδεση απέτυχε. Δοκιμάστε ξανά.');
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Σύνδεση';
    }
}

async function initPage() {
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    await initLayout();
}

initPage();
