import { request } from './http.js';

export async function fetchMyTransactions() {
    return request('/api/profile/transactions');
}
