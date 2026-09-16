import { request } from './http.js';

export async function fetchFeed() {
    return request('/api/listings');
}

export async function fetchNearbyListings(lat, lng, radius, limit) {
    const url = `/api/listings?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`;
    return request(url);
}

export async function fetchMyListings() {
    return request('/api/listings/mine');
}

export async function fetchListing(listingId) {
    return request('/api/listings/' + listingId);
}

export async function createListing(formData) {
    return request('/api/listings', {
        method: 'POST',
        body: formData
    });
}

export async function updateListing(listingId, formData) {
    return request('/api/listings/' + listingId, {
        method: 'PUT',
        body: formData
    });
}

export async function deleteListing(listingId) {
    return request('/api/listings/' + listingId, { method: 'DELETE' });
}
