document.addEventListener('DOMContentLoaded', () => {

    const form        = document.getElementById('register-form');
    const submitBtn   = document.getElementById('submit-btn');
    const pageAlert   = document.getElementById('form-alert');

    if (!form) return;

    function clearErrors() {

        const errorSlots = form.querySelectorAll('.form-error');
        errorSlots.forEach(slot => {
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

        const password        = form.password.value;
        const passwordConfirm = form.password_confirm.value;

        if (password !== passwordConfirm) {
            showFieldError('password_confirm', 'Οι κωδικοί δεν ταιριάζουν.');
            return;
        }

        const payload = {
            full_name:        form.full_name.value.trim(),
            username:         form.username.value.trim(),
            email:            form.email.value.trim(),
            password:         password,
            password_confirm: passwordConfirm
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Εγγραφή...';

        try {
            const response = await fetch('api/auth/register.php', {
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
                    showPageAlert(data.error || 'Η εγγραφή απέτυχε. Δοκιμάστε ξανά.');
                }
            }

        } catch (error) {

            console.error('Register request failed:', error);
            showPageAlert('Πρόβλημα σύνδεσης με τον server. Δοκιμάστε ξανά.');

        } finally {

            submitBtn.disabled = false;
            submitBtn.textContent = 'Εγγραφή';
        }
    });

});
