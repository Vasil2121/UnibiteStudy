export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Η διαδρομή δεν βρέθηκε' });
}

export function errorHandler(err, req, res, next) {
  const status = Number(err.status);

  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return res.status(status).json({ error: 'Μη έγκυρο αίτημα' });
  }

  console.error(err);
  res.status(500).json({ error: 'Σφάλμα διακομιστή' });
}
