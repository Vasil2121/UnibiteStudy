import { request } from './http.js';

export async function fetchAllergens() {
    return request('/api/allergens');
}
