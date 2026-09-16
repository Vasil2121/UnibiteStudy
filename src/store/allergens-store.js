import pool from '../database/connection.js';

function toAllergenObject(row) {
  const allergen = {};
  allergen.id = Number(row.id);
  allergen.name_el = row.name_el;
  allergen.name_en = row.name_en;
  allergen.icon = row.icon;
  return allergen;
}

function toListingAllergenObject(row) {
  const allergen = {};
  allergen.id = Number(row.id);
  allergen.name_el = row.name_el;
  allergen.icon = row.icon;
  return allergen;
}

export async function findAll() {
  const result = await pool.query('SELECT id, name_el, name_en, icon FROM allergens');
  const rows = result[0];
  return rows.map((row) => toAllergenObject(row));
}

export async function attachToListings(listings) {
  if (listings.length === 0) {
    return listings;
  }

  const listingIds = listings.map((listing) => listing.id);
  const placeholders = listingIds.map(() => '?').join(',');

  const result = await pool.execute(
    `SELECT link.listing_id, allergen.id, allergen.name_el, allergen.icon
       FROM listing_allergens AS link
       JOIN allergens AS allergen ON allergen.id = link.allergen_id
      WHERE link.listing_id IN (${placeholders})
      ORDER BY allergen.id`,
    listingIds
  );
  const rows = result[0];

  for (const row of rows) {
    const listingId = Number(row.listing_id);
    const listing = listings.find((candidate) => candidate.id === listingId);

    if (listing) {
      listing.allergens.push(toListingAllergenObject(row));
    }
  }

  return listings;
}

export async function countExisting(allergenIds) {
  const placeholders = allergenIds.map(() => '?').join(',');

  const result = await pool.execute(
    `SELECT id FROM allergens WHERE id IN (${placeholders})`,
    allergenIds
  );
  const rows = result[0];

  return rows.length;
}

export async function linkToListing(conn, listingId, allergenId) {
  await conn.execute(
    'INSERT INTO listing_allergens (listing_id, allergen_id) VALUES (?, ?)',
    [listingId, allergenId]
  );
}

export async function unlinkAllFromListing(conn, listingId) {
  await conn.execute('DELETE FROM listing_allergens WHERE listing_id = ?', [listingId]);
}
