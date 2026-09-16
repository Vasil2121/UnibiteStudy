export function clearFieldErrors(form) {
    const slots = form.querySelectorAll('.form-error');
    slots.forEach((slot) => {
        slot.textContent = '';
    });

    const invalidInputs = form.querySelectorAll('.form-input--error');
    invalidInputs.forEach((input) => {
        input.classList.remove('form-input--error');
    });
}

export function showFieldErrors(form, fields) {
    for (const fieldName in fields) {
        const slot = form.querySelector(`[data-error-for="${fieldName}"]`);
        if (slot) {
            slot.textContent = fields[fieldName];
        }
    }
}

export function markInvalidFields(form, fields) {
    for (const fieldName in fields) {
        const input = form.querySelector(`[name="${fieldName}"]`);
        if (input) {
            input.classList.add('form-input--error');
        }
    }
}
