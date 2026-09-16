import { request } from './http.js';

export async function login(identifier, password) {
    return request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier, password: password })
    });
}

export async function register(registration) {
    return request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registration)
    });
}

export async function logout() {
    return request('/api/auth/logout', { method: 'POST' });
}

export async function fetchCurrentUser() {
    return request('/api/auth/me');
}
