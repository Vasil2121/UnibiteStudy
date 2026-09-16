import { request } from './http.js';

export async function fetchStats() {
    return request('/api/admin/stats');
}

export async function fetchLeaderboard() {
    return request('/api/admin/leaderboard');
}
