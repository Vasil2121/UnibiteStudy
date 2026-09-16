export function showAlert(box, message) {
    box.textContent = message;
    box.classList.remove('is-hidden');
}

export function clearAlert(box) {
    box.textContent = '';
    box.classList.add('is-hidden');
}
