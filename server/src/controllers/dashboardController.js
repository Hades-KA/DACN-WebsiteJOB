// Dashboard controller (mock version for testing)
const getDashboardData = async (req, res) => {
  try {
    // Mock dashboard data
    const dashboardData = {
      totalJobs: 0,
      totalCandidates: 0,
      analyzedCVs: 0,
      aiAnalysis: 0,
      recentJobs: [],
      aiStats: {
        averageScore: 0,
        highQualityCVs: 0
      }
    };

    res.json({
      message: 'Dashboard data retrieved successfully',
      data: dashboardData
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      message: 'Failed to retrieve dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getDashboardData
};
