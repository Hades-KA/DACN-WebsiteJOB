// client/src/pages/admin/Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/api';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  PieChart as RCPieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import {
  Users as UsersIcon,
  Briefcase,
  ClipboardList,
  Gauge,
  TrendingUp as TrendingUpIcon,
  PieChart as PieIcon,
  BarChart3,
  CalendarDays,
} from 'lucide-react';

export default function Dashboard() {
  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Main data
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [scoreDistribution, setScoreDistribution] = useState([]);

  // Activities
  const [activities, setActivities] = useState([]);
  const [activityLimit, setActivityLimit] = useState(10);
  const [loadingActs, setLoadingActs] = useState(false);

  // Recent jobs
  const [recentJobs, setRecentJobs] = useState([]);
  const [jobLimit, setJobLimit] = useState(5);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Trend window
  const [timeWindow, setTimeWindow] = useState('7d'); // '7d' | '30d'

  const COLORS = ['#2563EB', '#22D3EE', '#10B981', '#F59E0B', '#EF4444', '#9CA3AF'];
  const STATUS_LABELS = {
    pending: 'Chờ duyệt',
    reviewing: 'Đang xem',
    shortlisted: 'Được chọn sơ bộ',
    interviewed: 'Đã phỏng vấn',
    accepted: 'Được nhận',
    rejected: 'Bị từ chối (AI)',
  };
  const STATUS_ORDER = ['rejected', 'pending', 'reviewing', 'interviewed', 'shortlisted', 'accepted'];

  const CARD = 'bg-white border rounded-xl shadow-sm p-4';
  const IconWrap = ({ children, from = 'from-blue-500', to = 'to-blue-600' }) => (
    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${from} ${to} text-white flex items-center justify-center shadow`}>
      {children}
    </div>
  );

  function shortLabel(key = '') {
    if (!key) return '';
    const parts = key.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`; // dd/MM
    if (parts.length === 2) return `${parts[1]}/${String(parts[0]).slice(2)}`; // MM/yy
    return key;
  }

  async function fetchMain() {
    try {
      setLoading(true);
      setError('');
      const trendParams = timeWindow === '7d' ? { days: 7 } : { days: 30 };

      const [statsRes, trendsRes, distRes] = await Promise.all([
        adminService.getStats(),                  // /api/admin/stats
        adminService.getTrends(trendParams),     // /api/analytics/trends?days=...
        adminService.getScoreDistribution(),     // /api/analytics/score-distribution
      ]);

      // 1) Stats tổng
      setStats(statsRes?.data?.data || null);

      // 2) Trends
      const trendsData = trendsRes?.data?.data || [];
      setTrends(trendsData.map(t => ({
        name: shortLabel(t.month),
        don: t.applications || 0,
        xem: Math.round((t.applications || 0) * 1.5),
      })));

      // 3) Score distribution (bucket/range -> label)
      const distRaw = distRes?.data?.data || [];
      setScoreDistribution(distRaw.map(it => ({
        label: it.bucket || it.range || '',
        count: Number(it.count || 0),
      })));
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được thống kê');
    } finally {
      setLoading(false);
    }
  }

  async function fetchActivities(limit = activityLimit) {
    try {
      setLoadingActs(true);
      const res = await adminService.getActivities({ limit });
      setActivities(res?.data?.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingActs(false);
    }
  }

  async function fetchRecentJobs(limit = jobLimit) {
    try {
      setLoadingJobs(true);
      const res = await adminService.listJobs({ page: 1, limit });
      setRecentJobs(res?.data?.data || []);
      setJobsTotal(res?.data?.pagination?.total || 0);
    } catch {
      // ignore
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    // Khi đổi 7/30 ngày: tải stats + trends + distribution
    fetchMain();
    // Tải list theo limit hiện tại
    fetchActivities(activityLimit);
    fetchRecentJobs(jobLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeWindow]);

  useEffect(() => {
    // Khi bấm Tải thêm/Thu gọn activities
    fetchActivities(activityLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityLimit]);

  useEffect(() => {
    // Khi bấm Tải thêm/Thu gọn jobs
    fetchRecentJobs(jobLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobLimit]);

  // Hook luôn gọi trước mọi return
  const pieData = useMemo(() => {
    if (!stats?.applications) return [];
    return STATUS_ORDER.map((k) => ({
      key: k,
      name: STATUS_LABELS[k] || k,
      value: stats.applications[k] || 0,
    })).filter(d => d.value > 0);
  }, [stats]);

  return (
    <div>
      {/* Header + Toggle 7/30 ngày */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Tổng quan</h1>
        <div className="inline-flex items-center gap-1 bg-white border rounded-lg p-1">
          <button
            type="button"
            onClick={() => setTimeWindow('7d')}
            className={`px-3 py-1.5 text-sm rounded-md ${timeWindow === '7d' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            7 ngày
          </button>
          <button
            type="button"
            onClick={() => setTimeWindow('30d')}
            className={`px-3 py-1.5 text-sm rounded-md ${timeWindow === '30d' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            30 ngày
          </button>
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      {/* Spinner khi chưa có stats và đang tải */}
      {!stats && loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {stats && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={CARD}>
              <div className="flex items-center gap-3">
                <IconWrap from="from-sky-500" to="to-sky-600"><UsersIcon size={18} /></IconWrap>
                <div className="text-sm text-gray-600">Người dùng</div>
              </div>
              <div className="mt-2 text-2xl font-semibold">{stats.users.total}</div>
              <div className="text-xs text-gray-600 mt-1">
                Ứng viên: {stats.users.candidates} · NTD: {stats.users.employers} · Admin: {stats.users.admins}
              </div>
            </div>

            <div className={CARD}>
              <div className="flex items-center gap-3">
                <IconWrap from="from-emerald-500" to="to-emerald-600"><Briefcase size={18} /></IconWrap>
                <div className="text-sm text-gray-600">Việc làm</div>
              </div>
              <div className="mt-2 text-2xl font-semibold">{stats.jobs.total}</div>
              <div className="text-xs text-gray-600 mt-1">
                Đang mở: {stats.jobs.active} · Nổi bật: {stats.jobs.featured}
              </div>
            </div>

            <div className={CARD}>
              <div className="flex items-center gap-3">
                <IconWrap from="from-violet-500" to="to-violet-600"><ClipboardList size={18} /></IconWrap>
                <div className="text-sm text-gray-600">Đơn ứng tuyển</div>
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {Object.values(stats.applications).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Chờ duyệt: {stats.applications.pending} · Phỏng vấn: {stats.applications.interviewed}
              </div>
            </div>

            <div className={CARD}>
              <div className="flex items-center gap-3">
                <IconWrap from="from-amber-500" to="to-amber-600"><Gauge size={18} /></IconWrap>
                <div className="text-sm text-gray-600">Điểm AI trung bình</div>
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {Number(stats.avgMatchScore ?? 0).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">Hiệu suất matching của hệ thống AI</div>
            </div>
          </div>

          {/* Charts: Trends + Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Xu hướng */}
            <div className={CARD}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUpIcon size={18} className="text-blue-600" />
                  Xu hướng ứng tuyển ({timeWindow === '7d' ? '7 ngày' : '30 ngày'})
                </h2>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <CalendarDays size={14} />
                  Cập nhật theo thời gian
                </div>
              </div>
              <div className="h-64">
                {trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="don" name="Đơn ứng tuyển" stroke="#2563EB" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="xem" name="Lượt xem (ước tính)" stroke="#22D3EE" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                    Chưa có dữ liệu
                  </div>
                )}
              </div>
            </div>

            {/* Pie trạng thái */}
            <div className={CARD}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <PieIcon size={18} className="text-emerald-600" />
                Phân bố trạng thái đơn
              </h2>
              <div className="h-64">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RCPieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </RCPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                    Chưa có dữ liệu
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Score distribution */}
          <div className={`${CARD} mb-6`}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BarChart3 size={18} className="text-violet-600" />
              Phân bố điểm AI Score
            </h2>
            <div className="h-64">
              {scoreDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Số lượng" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                  Chưa có dữ liệu
                </div>
              )}
            </div>
          </div>

          {/* Activities + Recent jobs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Activities */}
            <div className={CARD}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Hoạt động gần đây</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivityLimit(l => l + 10)}
                    className="px-3 py-1.5 text-xs rounded-md border hover:bg-gray-50"
                    disabled={loadingActs}
                    title="Tải thêm 10"
                  >
                    {loadingActs ? 'Đang tải...' : 'Tải thêm 10'}
                  </button>
                  {activityLimit > 10 && (
                    <button
                      type="button"
                      onClick={() => setActivityLimit(10)}
                      className="px-3 py-1.5 text-xs rounded-md border hover:bg-gray-50"
                      disabled={loadingActs}
                      title="Thu gọn về 10"
                    >
                      Thu gọn
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-auto pr-1">
                {activities.length === 0 ? (
                  <div className="text-sm text-gray-500">Chưa có hoạt động</div>
                ) : (
                  activities.map((a, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 border rounded-md hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900">{a.message}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : ''}
                        </div>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs flex-shrink-0 ml-2 ${
                          a.type === 'user_registered' ? 'bg-blue-100 text-blue-700'
                            : a.type === 'job_created' ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {a.type === 'user_registered' ? 'User' : a.type === 'job_created' ? 'Job' : 'Application'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent jobs */}
            <div className={CARD}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Tin tuyển dụng gần đây</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setJobLimit(l => l + 5)}
                    className="px-3 py-1.5 text-xs rounded-md border hover:bg-gray-50"
                    disabled={loadingJobs || (!!jobsTotal && jobLimit >= jobsTotal)}
                    title="Tải thêm 5"
                  >
                    {loadingJobs ? 'Đang tải...' : 'Tải thêm 5'}
                  </button>
                  {jobLimit > 5 && (
                    <button
                      type="button"
                      onClick={() => setJobLimit(5)}
                      className="px-3 py-1.5 text-xs rounded-md border hover:bg-gray-50"
                      disabled={loadingJobs}
                      title="Thu gọn về 5"
                    >
                      Thu gọn
                    </button>
                  )}
                  <Link
                    to="/admin/jobs"
                    className="px-3 py-1.5 text-xs rounded-md border bg-white hover:bg-gray-50"
                    title="Xem tất cả"
                  >
                    Xem tất cả
                  </Link>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-auto pr-1">
                {recentJobs.length === 0 ? (
                  <div className="text-sm text-gray-500">Chưa có dữ liệu</div>
                ) : (
                  recentJobs.map((j) => (
                    <div key={j.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{j.title}</div>
                        <div className="text-xs text-gray-600">{j.company} · {j.location}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs flex-shrink-0 ml-2 ${
                        j.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {j.isActive ? 'Đang mở' : 'Đã tắt'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}