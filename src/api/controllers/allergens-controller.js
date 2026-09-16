import * as allergensStore from '../../store/allergens-store.js';

export async function listAllergens(req, res, next) {
  try {
    const allergens = await allergensStore.findAll();
    res.status(200).json(allergens);
  } catch (err) {
    next(err);
  }
}
