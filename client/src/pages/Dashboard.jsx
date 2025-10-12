import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  FileText, 
  TrendingUp, 
  Star, 
  Eye, 
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import { dashboardService } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalCandidates: 0,
    totalCVs: 0,
    aiAnalysisCount: 0
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [topCandidates, setTopCandidates] = useState([]);
  const [aiInsights, setAiInsights] = useState({
    averageScore: 0,
    highQualityCVs: 0,
    matchRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardService.getDashboardData();
      const data = response.data || {};
      setStats(prev => ({ ...prev, ...(data.stats || {}) }));
      setRecentJobs(data.recentJobs || []);
      setTopCandidates(data.topCandidates || []);
      setAiInsights(prev => ({ ...prev, ...(data.aiInsights || {}) }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Tổng quan hệ thống tuyển dụng với AI phân tích</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng việc làm</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalJobs || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ứng viên</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalCandidates || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">CV đã phân tích</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalCVs || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Phân tích AI</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.aiAnalysisCount || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Jobs & AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Việc làm gần đây</h2>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">Xem tất cả</button>
              </div>
              <div className="space-y-4">
                {recentJobs.length > 0 ? recentJobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{job.title}</h3>
                      <p className="text-sm text-gray-600">{job.company}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {job.createdAt}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{job.applications} ứng viên</span>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )) : <p className="text-gray-500">Không có dữ liệu việc làm gần đây</p>}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Thống kê AI</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Điểm trung bình</span>
                  <span className="font-semibold text-gray-900">{aiInsights?.averageScore || 0}/10</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">CV chất lượng cao</span>
                  <span className="font-semibold text-green-600">{aiInsights?.highQualityCVs || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tỷ lệ phù hợp</span>
                  <span className="font-semibold text-blue-600">{aiInsights?.matchRate || 0}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Top ứng viên</h2>
              <div className="space-y-4">
                {topCandidates.length > 0 ? topCandidates.map((candidate, index) => (
                  <div key={candidate.id} className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{candidate.name}</p>
                      <p className="text-sm text-gray-600">{candidate.position}</p>
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="text-sm font-medium">{candidate.score}</span>
                    </div>
                  </div>
                )) : <p className="text-gray-500">Không có dữ liệu ứng viên</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Thống kê theo tháng</h2>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Biểu đồ thống kê</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Phân bố ứng viên</h2>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Biểu đồ phân bố</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <Briefcase className="w-6 h-6 text-blue-600 mb-2" />
              <h3 className="font-medium text-gray-900">Đăng tin tuyển dụng</h3>
              <p className="text-sm text-gray-600">Tạo tin tuyển dụng mới</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <FileText className="w-6 h-6 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Xem danh sách CV</h3>
              <p className="text-sm text-gray-600">Quản lý hồ sơ ứng viên</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
              <h3 className="font-medium text-gray-900">Báo cáo AI</h3>
              <p className="text-sm text-gray-600">Xem phân tích chi tiết</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
