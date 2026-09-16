import { request } from './http.js';

export async function submitRating(requestId, score, comment) {
    return request('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: requestId, score: score, comment: comment })
    });
}
