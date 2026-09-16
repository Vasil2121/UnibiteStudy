import { toMysqlDateTime } from './date.js';

export function parseListingId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function parseAllergenIds(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return [];
  }

  const list = Array.isArray(raw) ? raw : [raw];
  const ids = [];

  for (const value of list) {
    const id = Number(value);

    if (Number.isInteger(id) && id > 0 && !ids.includes(id)) {
      ids.push(id);
    }
  }

  return ids;
}

export function parseListingBody(body) {
  const fields = {};

  const title = String(body.title ?? '').trim();
  if (title.length < 3 || title.length > 100) {
    fields.title = 'Ο τίτλος πρέπει να έχει από 3 έως 100 χαρακτήρες.';
  }

  const descriptionRaw = String(body.description ?? '').trim();
  const description = descriptionRaw === '' ? null : descriptionRaw;

  const portions = Number(body.portions);
  if (!Number.isInteger(portions) || portions < 1 || portions > 20) {
    fields.portions = 'Οι μερίδες πρέπει να είναι ακέραιος από 1 έως 20.';
  }

  const pickupLocationText = String(body.pickup_location_text ?? '').trim();
  if (pickupLocationText === '') {
    fields.pickup_location_text = 'Το σημείο παραλαβής είναι υποχρεωτικό.';
  } else if (pickupLocationText.length > 255) {
    fields.pickup_location_text = 'Το σημείο παραλαβής είναι πολύ μεγάλο (μέγιστο 255 χαρακτήρες).';
  }

  const pickupLat = Number(body.pickup_lat);
  if (!Number.isFinite(pickupLat) || pickupLat < -90 || pickupLat > 90) {
    fields.pickup_lat = 'Μη έγκυρο γεωγραφικό πλάτος.';
  }

  const pickupLng = Number(body.pickup_lng);
  if (!Number.isFinite(pickupLng) || pickupLng < -180 || pickupLng > 180) {
    fields.pickup_lng = 'Μη έγκυρο γεωγραφικό μήκος.';
  }

  const pickupTimeFrom = toMysqlDateTime(body.pickup_time_from);
  if (pickupTimeFrom === null) {
    fields.pickup_time_from = 'Μη έγκυρη ώρα έναρξης παραλαβής.';
  }

  const pickupTimeTo = toMysqlDateTime(body.pickup_time_to);
  if (pickupTimeTo === null) {
    fields.pickup_time_to = 'Μη έγκυρη ώρα λήξης παραλαβής.';
  }

  if (pickupTimeFrom !== null && pickupTimeTo !== null && pickupTimeFrom >= pickupTimeTo) {
    fields.pickup_time_to = 'Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.';
  }

  const values = {
    title: title,
    description: description,
    portions: portions,
    pickupLocationText: pickupLocationText,
    pickupLat: pickupLat,
    pickupLng: pickupLng,
    pickupTimeFrom: pickupTimeFrom,
    pickupTimeTo: pickupTimeTo
  };

  return { fields: fields, values: values };
}
