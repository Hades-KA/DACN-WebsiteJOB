import React, { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/api';
import { Eye, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

export default function Applications() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applications, setApplications] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  
  const [filters, setFilters] = useState({
    status: '',
    scoreMin: '',
    scoreMax: '',
    dateFrom: '',
    dateTo: ''
  });

  const [appliedFilters, setAppliedFilters] = useState({});

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit, ...appliedFilters };
      const res = await adminService.getApplications(params);
      setApplications(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được danh sách đơn ứng tuyển');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [page, limit, appliedFilters]);

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    setFilters({
      status: '',
      scoreMin: '',
      scoreMax: '',
      dateFrom: '',
      dateTo: ''
    });
    setPage(1);
    setAppliedFilters({});
  };

  const stats = useMemo(() => {
    const total = applications.length;
    const byStatus = {
      pending: 0,
      reviewing: 0,
      shortlisted: 0,
      interviewed: 0,
      accepted: 0,
      rejected: 0
    };
    
    let totalScore = 0;
    let scoreCount = 0;

    applications.forEach(app => {
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
      if (app.aiMatchScore != null) {
        totalScore += app.aiMatchScore * 10;
        scoreCount++;
      }
    });

    const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : 0;
    const successRate = total > 0 ? ((byStatus.accepted / total) * 100).toFixed(1) : 0;

    return { total, byStatus, avgScore, successRate };
  }, [applications]);

  const COLORS = ['#3B82F6', '#22D3EE', '#10B981', '#F59E0B', '#EF4444', '#9CA3AF'];
  const STATUS_LABELS = {
    pending: 'Chờ duyệt',
    reviewing: 'Đang xem',
    shortlisted: 'Sơ tuyển',
    interviewed: 'Phỏng vấn',
    accepted: 'Đã nhận',
    rejected: 'Bị loại (AI)'
  };

  const pieData = Object.entries(stats.byStatus)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count
    }));

  const scoreRanges = useMemo(() => {
    const ranges = {
      '0-20%': 0,
      '20-40%': 0,
      '40-60%': 0,
      '60-80%': 0,
      '80-100%': 0
    };

    applications.forEach(app => {
      if (app.aiMatchScore != null) {
        const score = app.aiMatchScore * 10;
        if (score < 20) ranges['0-20%']++;
        else if (score < 40) ranges['20-40%']++;
        else if (score < 60) ranges['40-60%']++;
        else if (score < 80) ranges['60-80%']++;
        else ranges['80-100%']++;
      }
    });

    return Object.entries(ranges).map(([range, count]) => ({ range, count }));
  }, [applications]);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      shortlisted: 'bg-cyan-100 text-cyan-800',
      interviewed: 'bg-purple-100 text-purple-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (score) => {
    if (score == null) return 'text-gray-400';
    const percent = score * 10;
    if (percent >= 80) return 'text-green-600 font-semibold';
    if (percent >= 60) return 'text-blue-600 font-semibold';
    if (percent >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Theo dõi đơn ứng tuyển</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Tổng đơn</div>
          <div className="text-2xl font-semibold">{total}</div>
        </div>
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Chờ duyệt</div>
          <div className="text-2xl font-semibold text-yellow-600">{stats.byStatus.pending}</div>
        </div>
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Tỷ lệ thành công</div>
          <div className="text-2xl font-semibold text-green-600">{stats.successRate}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.byStatus.accepted} / {total} đơn
          </div>
        </div>
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Điểm AI TB</div>
          <div className="text-2xl font-semibold text-blue-600">{stats.avgScore}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Pie Chart - Status */}
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-3">Phân bố trạng thái</h2>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart - Score Distribution */}
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-3">Phân bố điểm AI</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreRanges}>
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Bộ lọc</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="reviewing">Đang xem</option>
            <option value="shortlisted">Sơ tuyển</option>
            <option value="interviewed">Phỏng vấn</option>
            <option value="accepted">Đã nhận</option>
            <option value="rejected">Bị loại</option>
          </select>

          <input
            type="number"
            placeholder="Điểm tối thiểu (%)"
            value={filters.scoreMin}
            onChange={(e) => setFilters(f => ({ ...f, scoreMin: e.target.value }))}
            className="border rounded px-3 py-2 text-sm"
            min="0"
            max="100"
          />

          <input
            type="number"
            placeholder="Điểm tối đa (%)"
            value={filters.scoreMax}
            onChange={(e) => setFilters(f => ({ ...f, scoreMax: e.target.value }))}
            className="border rounded px-3 py-2 text-sm"
            min="0"
            max="100"
          />

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="border rounded px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="border rounded px-3 py-2 text-sm"
          />

          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Áp dụng
            </button>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      {/* Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ứng viên</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Công việc</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Điểm AI</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ngày nộp</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Không tìm thấy đơn ứng tuyển
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {app.candidate?.name || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {app.candidate?.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {app.job?.title || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {app.job?.company}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={getScoreColor(app.aiMatchScore)}>
                        {app.aiMatchScore != null 
                          ? `${(app.aiMatchScore * 10).toFixed(0)}%` 
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {STATUS_LABELS[app.status] || app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => alert(`View details: ${app.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 text-sm"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                        Xem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-600">
            Tổng: {total} đơn (Trang {page}/{totalPages})
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}