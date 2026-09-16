import { withTransaction } from '../../database/connection.js';
import * as listingsStore from '../../store/listings-store.js';
import * as allergensStore from '../../store/allergens-store.js';
import * as requestsStore from '../../store/requests-store.js';
import { detectImageType, removeUploadedFile } from '../../middleware/upload.js';
import { parseListingId, parseAllergenIds, parseListingBody } from '../../utils/validation.js';

const DEFAULT_RADIUS_KM = 10;
const MAX_RADIUS_KM = 500;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const INVALID_PHOTO_MESSAGE = 'Το αρχείο δεν είναι έγκυρη εικόνα JPG, PNG ή WEBP.';
const UNKNOWN_ALLERGENS_MESSAGE = 'Ένα ή περισσότερα αλλεργιογόνα δεν είναι έγκυρα.';

async function hasUnknownAllergenIds(allergenIds) {
  if (allergenIds.length === 0) {
    return false;
  }

  const existingCount = await allergensStore.countExisting(allergenIds);
  return existingCount !== allergenIds.length;
}

export async function listMyListings(req, res, next) {
  try {
    const listings = await listingsStore.findByCook(req.session.userId);
    await allergensStore.attachToListings(listings);

    res.status(200).json({ listings: listings });
  } catch (err) {
    next(err);
  }
}

export async function getListing(req, res, next) {
  try {
    const listingId = parseListingId(req.params.id);

    if (listingId === null) {
      return res.status(400).json({ error: 'Μη έγκυρο αναγνωριστικό αγγελίας' });
    }

    const listing = await listingsStore.findById(listingId);

    if (listing === null) {
      return res.status(404).json({ error: 'Η αγγελία δεν βρέθηκε' });
    }

    await allergensStore.attachToListings([listing]);

    res.status(200).json({ listing: listing });
  } catch (err) {
    next(err);
  }
}

export async function listFeed(req, res, next) {
  try {
    const userId = req.session.userId;
    const wantsNearby = req.query.lat !== undefined || req.query.lng !== undefined;

    let listings;

    if (wantsNearby) {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);

      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ error: 'Μη έγκυρο γεωγραφικό πλάτος.' });
      }

      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Μη έγκυρο γεωγραφικό μήκος.' });
      }

      const requestedRadius = Number(req.query.radius);
      let radius = DEFAULT_RADIUS_KM;
      if (Number.isFinite(requestedRadius) && requestedRadius > 0) {
        radius = Math.min(requestedRadius, MAX_RADIUS_KM);
      }

      const requestedLimit = Number(req.query.limit);
      let limit = DEFAULT_LIMIT;
      if (Number.isInteger(requestedLimit) && requestedLimit > 0) {
        limit = Math.min(requestedLimit, MAX_LIMIT);
      }

      listings = await listingsStore.findNearby(userId, lat, lng, radius, limit);
    } else {
      listings = await listingsStore.findFeed(userId);
    }

    await allergensStore.attachToListings(listings);

    res.status(200).json({ listings: listings });
  } catch (err) {
    next(err);
  }
}

export async function createListing(req, res, next) {
  let photoFilename = null;
  if (req.file) {
    photoFilename = req.file.filename;
  }

  try {
    if (req.file) {
      const detectedType = await detectImageType(req.file.path);

      if (detectedType === null) {
        await removeUploadedFile(photoFilename);
        return res.status(400).json({ error: INVALID_PHOTO_MESSAGE, fields: { photo: INVALID_PHOTO_MESSAGE } });
      }
    }

    const parsed = parseListingBody(req.body);
    const fields = parsed.fields;
    const values = parsed.values;
    const allergenIds = parseAllergenIds(req.body.allergen_ids);

    if (await hasUnknownAllergenIds(allergenIds)) {
      fields.allergens = UNKNOWN_ALLERGENS_MESSAGE;
    }

    if (Object.keys(fields).length > 0) {
      await removeUploadedFile(photoFilename);
      return res.status(400).json({ error: 'Σφάλμα επικύρωσης', fields: fields });
    }

    const cookId = req.session.userId;

    const listingId = await withTransaction(async function (conn) {
      const insertedId = await listingsStore.insertListing(conn, cookId, photoFilename, values);

      for (const allergenId of allergenIds) {
        await allergensStore.linkToListing(conn, insertedId, allergenId);
      }

      return insertedId;
    });

    res.status(201).json({ listing_id: listingId });
  } catch (err) {
    await removeUploadedFile(photoFilename);
    next(err);
  }
}

export async function updateListing(req, res, next) {
  let newPhotoFilename = null;
  if (req.file) {
    newPhotoFilename = req.file.filename;
  }

  try {
    const listingId = parseListingId(req.params.id);

    if (listingId === null) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(400).json({ error: 'Μη έγκυρο αναγνωριστικό αγγελίας' });
    }

    if (req.file) {
      const detectedType = await detectImageType(req.file.path);

      if (detectedType === null) {
        await removeUploadedFile(newPhotoFilename);
        return res.status(400).json({ error: INVALID_PHOTO_MESSAGE, fields: { photo: INVALID_PHOTO_MESSAGE } });
      }
    }

    const existing = await listingsStore.findForOwnerAction(listingId);

    if (existing === null) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(404).json({ error: 'Η αγγελία δεν βρέθηκε' });
    }

    if (existing.cookId !== req.session.userId) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(403).json({ error: 'Η αγγελία δεν σου ανήκει' });
    }

    if (existing.status === 'deleted') {
      await removeUploadedFile(newPhotoFilename);
      return res.status(409).json({ error: 'Η αγγελία έχει διαγραφεί' });
    }

    const openRequests = await requestsStore.countOpenForListing(listingId);

    if (openRequests > 0) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(409).json({
        error: 'Δεν μπορείς να επεξεργαστείς την αγγελία ενώ υπάρχουν εκκρεμή ή εγκεκριμένα αιτήματα.'
      });
    }

    const parsed = parseListingBody(req.body);
    const fields = parsed.fields;
    const values = parsed.values;
    const allergenIds = parseAllergenIds(req.body.allergen_ids);

    if (await hasUnknownAllergenIds(allergenIds)) {
      fields.allergens = UNKNOWN_ALLERGENS_MESSAGE;
    }

    if (Object.keys(fields).length > 0) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(400).json({ error: 'Σφάλμα επικύρωσης', fields: fields });
    }

    const portionsClaimed = existing.portionsTotal - existing.portionsAvailable;
    const newPortionsAvailable = values.portions - portionsClaimed;

    if (newPortionsAvailable < 0) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(409).json({
        error: 'Δεν μπορείς να μειώσεις τις μερίδες κάτω από τον αριθμό που έχουν ήδη διεκδικηθεί.'
      });
    }

    let photoFilename = existing.photoFilename;
    if (newPhotoFilename !== null) {
      photoFilename = newPhotoFilename;
    }

    await withTransaction(async function (conn) {
      await listingsStore.updateListing(conn, listingId, photoFilename, newPortionsAvailable, values);
      await allergensStore.unlinkAllFromListing(conn, listingId);

      for (const allergenId of allergenIds) {
        await allergensStore.linkToListing(conn, listingId, allergenId);
      }
    });

    if (newPhotoFilename !== null && existing.photoFilename) {
      await removeUploadedFile(existing.photoFilename);
    }

    res.status(200).json({ listing_id: listingId });
  } catch (err) {
    await removeUploadedFile(newPhotoFilename);
    next(err);
  }
}

export async function deleteListing(req, res, next) {
  try {
    const listingId = parseListingId(req.params.id);

    if (listingId === null) {
      return res.status(400).json({ error: 'Μη έγκυρο αναγνωριστικό αγγελίας' });
    }

    const listing = await listingsStore.findForOwnerAction(listingId);

    if (listing === null) {
      return res.status(404).json({ error: 'Η αγγελία δεν βρέθηκε' });
    }

    if (listing.cookId !== req.session.userId) {
      return res.status(403).json({ error: 'Η αγγελία δεν σου ανήκει' });
    }

    if (listing.status === 'deleted') {
      return res.status(409).json({ error: 'Η αγγελία έχει ήδη διαγραφεί' });
    }

    await listingsStore.markDeleted(listingId);

    res.status(200).json({ listing_id: listingId });
  } catch (err) {
    next(err);
  }
}
