export function formatDateTime(value) {
    if (!value) {
        return '';
    }

    const parts = value.split(' ');
    const datePart = parts[0];
    const timePart = parts[1];

    const dateParts = datePart.split('-');
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];

    return `${day}/${month}/${year} ${timePart.slice(0, 5)}`;
}

export function formatShortDateTime(value) {
    if (!value) {
        return '';
    }

    const parts = value.split(' ');
    const datePart = parts[0];
    const timePart = parts[1];

    const dateParts = datePart.split('-');
    const month = dateParts[1];
    const day = dateParts[2];

    let timeText = '';
    if (timePart) {
        timeText = timePart.slice(0, 5);
    }

    return `${day}/${month} ${timeText}`.trim();
}
