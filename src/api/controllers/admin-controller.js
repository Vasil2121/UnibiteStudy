import * as adminStore from '../../store/admin-store.js';

const LEADERBOARD_LIMIT = 10;
const RECENT_COMMENTS_LIMIT = 5;

export async function getStats(req, res, next) {
  try {
    const portionsShared = await adminStore.countPortionsSharedLastMonth();
    const totalUsers = await adminStore.countUsers();
    const activeListings = await adminStore.countActiveListings();
    const ratingSummary = await adminStore.findRatingSummary();

    res.status(200).json({
      period: 'last_30_days',
      portionsSharedLastMonth: portionsShared,
      totalUsers: totalUsers,
      activeListings: activeListings,
      averageRating: ratingSummary.averageScore,
      totalRatings: ratingSummary.totalRatings
    });
  } catch (err) {
    next(err);
  }
}

export async function getLeaderboard(req, res, next) {
  try {
    const topDonors = await adminStore.findTopDonors(LEADERBOARD_LIMIT);
    const topRated = await adminStore.findTopRatedListings(LEADERBOARD_LIMIT);
    const recentComments = await adminStore.findRecentComments(RECENT_COMMENTS_LIMIT);

    res.status(200).json({
      topDonors: topDonors,
      topRated: topRated,
      recentComments: recentComments
    });
  } catch (err) {
    next(err);
  }
}
