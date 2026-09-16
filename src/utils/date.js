function pad(number) {
  return String(number).padStart(2, '0');
}

export function toMysqlDateTime(raw) {
  const value = String(raw ?? '').trim();

  if (value === '') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
