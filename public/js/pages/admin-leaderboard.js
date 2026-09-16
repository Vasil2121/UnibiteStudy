import { initLayout } from '../shared/layout.js';
import * as adminApi from '../api/admin-api.js';
import { escapeHtml } from '../shared/escape.js';
import { formatDateTime } from '../shared/format.js';
import { showAlert } from '../shared/alerts.js';

const contentRoot = document.getElementById('leaderboard-content');
const donorsBody = document.getElementById('leaderboard-donors');
const ratedBody = document.getElementById('leaderboard-rated');
const commentsRoot = document.getElementById('leaderboard-comments');
const alertBox = document.getElementById('leaderboard-alert');

function renderDonors(topDonors) {
    if (!topDonors || topDonors.length === 0) {
        donorsBody.innerHTML = '<tr><td colspan="3" style="padding: 15px; color: #888; font-style: italic;">Δεν υπάρχουν ακόμη δεδομένα προσφοράς.</td></tr>';
        return;
    }
    donorsBody.innerHTML = topDonors.map((row, index) => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: bold; color: #555;">${index + 1}°</td>
                <td style="padding: 12px;">
                    <div style="font-weight: 500; color: #2c3e50;">${escapeHtml(row.full_name)}</div>
                    <div style="font-size: 12px; color: #7f8c8d;">${escapeHtml(row.email)}</div>
                </td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #27ae60;">${row.portions_shared}</td>
            </tr>`).join('');
}

function renderRated(topRated) {
    if (!topRated || topRated.length === 0) {
        ratedBody.innerHTML = '<tr><td colspan="3" style="padding: 15px; color: #888; font-style: italic;">Δεν υπάρχουν ακόμη αξιολογήσεις γευμάτων.</td></tr>';
        return;
    }
    ratedBody.innerHTML = topRated.map((row, index) => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: bold; color: #555;">${index + 1}°</td>
                <td style="padding: 12px;">
                    <div style="font-weight: 500; color: #2c3e50;">${escapeHtml(row.title)}</div>
                    <div style="font-size: 11px; color: #7f8c8d;">${row.total_ratings} κριτικές · ${escapeHtml(row.cook_name)}</div>
                </td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #f39c12;">
                    🌟 ${Math.round(Number(row.avg_score) * 100) / 100} / 5
                </td>
            </tr>`).join('');
}

function renderComments(recentComments) {
    if (!recentComments || recentComments.length === 0) {
        commentsRoot.innerHTML = '<p style="color: #888; font-style: italic; margin-bottom: 0;">Δεν υπάρχουν ακόμη γραπτά σχόλια στην πλατφόρμα.</p>';
        return;
    }
    const items = recentComments.map((comment) => `
            <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #f1c40f;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>Για τον μάγειρα: <span style="color: #34495e;">${escapeHtml(comment.cook_name)}</span></strong>
                    <span style="color: #f39c12; font-weight: bold;">⭐ ${comment.score}/5</span>
                </div>
                <p style="margin: 0; color: #555; font-style: italic;">"${escapeHtml(comment.comment)}"</p>
                <small style="color: #999; display: block; margin-top: 5px; text-align: right;">
                    ${formatDateTime(comment.rated_at)}
                </small>
            </div>`).join('');
    commentsRoot.innerHTML = `<div style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px;">${items}</div>`;
}

function showPageAlert(message) {
    contentRoot.innerHTML = '';
    showAlert(alertBox, message);
}

async function initPage() {
    await initLayout();

    if (!contentRoot) {
        return;
    }

    try {
        const data = await adminApi.fetchLeaderboard();
        renderDonors(data.topDonors);
        renderRated(data.topRated);
        renderComments(data.recentComments);
    } catch (error) {
        if (error.status === 403) {
            showPageAlert('Απαγορεύεται η πρόσβαση. Η σελίδα είναι μόνο για διαχειριστές.');
            return;
        }

        if (error.status === undefined) {
            console.error('Failed to load leaderboard:', error);
        }

        showPageAlert('Δεν ήταν δυνατή η φόρτωση των στατιστικών.');
    }
}

initPage();
