import { request } from './http.js';

export async function createRequest(listingId, slot) {
    return request('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listingId, slot: slot })
    });
}

export async function fetchMyRequests() {
    return request('/api/requests/mine');
}

export async function fetchIncomingRequests() {
    return request('/api/requests/incoming');
}

export async function updateRequestStatus(requestId, status) {
    return request('/api/requests/' + requestId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status })
    });
}
