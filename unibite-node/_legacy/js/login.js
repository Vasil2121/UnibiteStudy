document.addEventListener('DOMContentLoaded', () => {

    const form      = document.getElementById('login-form');
    const submitBtn = document.getElementById('submit-btn');
    const pageAlert = document.getElementById('form-alert');

    if (!form) return;

    function clearErrors() {
        form.querySelectorAll('.form-error').forEach(slot => {
            slot.textContent = '';
        });
        pageAlert.textContent = '';
        pageAlert.hidden = true;
    }

    function showFieldError(fieldName, message) {
        const slot = form.querySelector(`[data-error-for="${fieldName}"]`);
        if (slot) {
            slot.textContent = message;
        }
    }

    function showPageAlert(message) {
        pageAlert.textContent = message;
        pageAlert.hidden = false;
    }

    form.addEventListener('submit', async (event) => {

        event.preventDefault();

        clearErrors();

        const payload = {
            identifier: form.identifier.value.trim(),
            password:   form.password.value

        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Σύνδεση...';

        try {
            const response = await fetch('api/auth/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept':       'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {

                window.location.href = 'consumer/feed.php';

            } else {

                if (data.fields && typeof data.fields === 'object') {
                    for (const fieldName in data.fields) {
                        showFieldError(fieldName, data.fields[fieldName]);
                    }
                } else {
                    showPageAlert(data.error || 'Η σύνδεση απέτυχε. Δοκιμάστε ξανά.');
                }
            }

        } catch (error) {

            console.error('Login request failed:', error);
            showPageAlert('Πρόβλημα σύνδεσης με τον server. Δοκιμάστε ξανά.');

        } finally {

            submitBtn.disabled = false;
            submitBtn.textContent = 'Σύνδεση';
        }
    });

});
