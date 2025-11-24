// client/src/pages/employer/Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  FiBriefcase,
  FiUsers,
  FiEye,
  FiCheckCircle,
  FiPlus,
} from 'react-icons/fi';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import StatCard from '../../components/employer/StatCard';
import JobCard from '../../components/employer/JobCard';
import api, {
  companyService,
  applicationService,
  analyticsService,
} from '../../services/api';
import { Link } from 'react-router-dom';

// Theme
const THEME = {
  primary: '#2563EB',
  success: '#22C55E',
  warn: '#F59E0B',
  danger: '#EF4444',
  neutral: '#64748B',
};
const COLORS = [THEME.primary, THEME.success, THEME.warn];

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  reviewing: 'Đang xem xét',
  shortlisted: 'Sơ tuyển',
  interviewed: 'Phỏng vấn',
  accepted: 'Đã nhận',
};
const STATUS_ORDER = [
  'pending',
  'reviewing',
  'shortlisted',
  'interviewed',
  'accepted',
]; // ẩn rejected

// Helpers
const toNum = (v) => Number(v || 0);
const fmtDayLabel = (label) => {
  if (!label) return '';
  const parts = String(label).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return label;
};

// Lấy user giống MyJobs
const getLocalUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const getEmployerId = (u) =>
  u?.id || u?.userId || getLocalUser()?.id || getLocalUser()?.userId;

export default function EmployerDashboard() {
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const [lastDays, setLastDays] = useState(28);
  const [trends, setTrends] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // ===== Load jobs + applications =====
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let u = getLocalUser();
        try {
          const meRes = await api.get('/auth/me');
          u = meRes.data?.data || meRes.data?.user || meRes.data || u;
        } catch {
          // ignore, dùng local nếu /auth/me lỗi
        }

        const employerId = getEmployerId(u);
        if (!employerId) {
          setJobs([]);
          setApps([]);
          return;
        }

        const [jobsRes, appsRes] = await Promise.all([
          companyService.getCompanyJobs(employerId, {
            active: 'all', // lấy tất cả tin: đang mở, đã khóa, hết hạn
            limit: 500,
          }),
          applicationService.getApplications({}),
        ]);

        setJobs(jobsRes?.data?.data || jobsRes?.data || []);
        setApps(appsRes?.data?.data || appsRes?.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ===== Load xu hướng từ analytics =====
  useEffect(() => {
    const fetchTrends = async () => {
      setTrendLoading(true);
      try {
        const res = await analyticsService.getTrends({ days: lastDays });
        setTrends(res?.data?.data || []);
      } catch {
        setTrends([]);
      } finally {
        setTrendLoading(false);
      }
    };
    fetchTrends();
  }, [lastDays]);

  // KPI
  const activeJobs = useMemo(
    () => jobs.filter((j) => j.isActive).length,
    [jobs]
  );
  const totalViews = useMemo(
    () => jobs.reduce((s, j) => s + (j.viewsCount || 0), 0),
    [jobs]
  );
  const newApplicants = useMemo(() => apps.length, [apps]);
  const approvedCV = useMemo(
    () => apps.filter((a) => a.status === 'accepted').length,
    [apps]
  );

  // Xu hướng (đồng nhất Reports)
  const trendData = useMemo(
    () =>
      (trends || []).map((t) => ({
        day: fmtDayLabel(t.month),
        applications: toNum(t.applications),
        avgScore: toNum(t.avgScore),
      })),
    [trends]
  );

  const nowTs = Date.now();

  // Pie: trạng thái tin tuyển dụng
  const pieData = useMemo(() => {
    let showing = 0;
    let expired = 0;
    let pending = 0;

    jobs.forEach((j) => {
      const deadlineTs = j.deadline ? new Date(j.deadline).getTime() : null;
      const isExpired = deadlineTs != null && deadlineTs < nowTs;
      const isActive = !!j.isActive;

      // Quy ước:
      // - Đang hiển thị: isActive && chưa hết hạn
      // - Hết hạn: deadline < hiện tại (kể cả bạn tự đóng hay chưa)
      // - Chờ duyệt: !isActive && chưa hết hạn (hiện tại gần như không dùng)
      if (isExpired) {
        expired++;
      } else if (isActive) {
        showing++;
      } else {
        pending++;
      }
    });

    return [
      { name: 'Đang hiển thị', value: showing },
      { name: 'Chờ duyệt', value: pending },
      { name: 'Hết hạn', value: expired },
    ];
  }, [jobs, nowTs]);

  // Bar: trạng thái ứng tuyển (ẩn rejected)
  const barData = useMemo(() => {
    const map = Object.fromEntries(STATUS_ORDER.map((k) => [k, 0]));
    apps.forEach((a) => {
      const s = String(a.status || '').toLowerCase();
      if (map[s] !== undefined) map[s] += 1;
    });
    return STATUS_ORDER.map((k) => ({
      key: k,
      name: STATUS_LABELS[k],
      value: map[k] || 0,
    }));
  }, [apps]);

  const recentJobs = useMemo(
    () =>
      [...jobs]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    [jobs]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Thống kê và hoạt động gần đây
          </p>
        </div>
        <Link
          to="/employer/jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white shadow bg-blue-600 hover:bg-blue-700"
        >
          <FiPlus /> Đăng tin mới
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tin tuyển dụng đang đăng"
          value={activeJobs}
          icon={<FiBriefcase className="h-6 w-6" />}
        />
        <StatCard
          title="Lượt xem tin (tổng)"
          value={totalViews}
          icon={<FiEye className="h-6 w-6" />}
        />
        <StatCard
          title="Ứng viên mới"
          value={newApplicants}
          icon={<FiUsers className="h-6 w-6" />}
        />
        <StatCard
          title="CV đã nhận"
          value={approvedCV}
          icon={<FiCheckCircle className="h-6 w-6" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Xu hướng theo ngày: đồng nhất Reports */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="font-medium mb-2">
              Xu hướng ứng tuyển (theo ngày)
            </div>
            <div className="flex items-center gap-2 text-xs">
              {[7, 14, 28].map((d) => (
                <button
                  key={d}
                  onClick={() => setLastDays(d)}
                  className={`px-2 py-1 rounded border ${
                    lastDays === d
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            {trendLoading ? (
              <div className="h-full grid place-items-center text-gray-500 text-sm">
                Đang tải xu hướng…
              </div>
            ) : trendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorApply" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={THEME.success}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor={THEME.success}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={THEME.primary}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor={THEME.primary}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" allowDecimals={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                  />
                  <Tooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="applications"
                    name="Số đơn/ngày"
                    stroke={THEME.success}
                    fill="url(#colorApply)"
                    fillOpacity={1}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgScore"
                    name="Điểm AI TB (%)"
                    stroke={THEME.primary}
                    fill="url(#colorScore)"
                    fillOpacity={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-gray-500 text-sm">
                Chưa có dữ liệu trong {lastDays} ngày qua
              </div>
            )}
          </div>
        </div>

        {/* Trạng thái tin tuyển dụng */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4">
          <div className="font-medium mb-2">Trạng thái tin tuyển dụng</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trạng thái ứng tuyển + Hoạt động gần đây */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trạng thái ứng tuyển */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4 lg:col-span-2">
          <div className="font-medium mb-2">Trạng thái ứng tuyển</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 8, right: 16, bottom: 8, left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} />
                <Tooltip formatter={(v) => [v, 'Số lượng']} />
                <Bar dataKey="value" fill="#8B5CF6" barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hoạt động gần đây */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4">
          <div className="font-medium mb-2">Hoạt động gần đây</div>
          <ul className="space-y-3">
            {recentJobs.length ? (
              recentJobs.map((j) => {
                const deadlineTs = j.deadline
                  ? new Date(j.deadline).getTime()
                  : null;
                const isExpired =
                  deadlineTs != null && deadlineTs < nowTs;
                const isActive = !!j.isActive;

                let label = 'Đã đóng';
                let classes =
                  'bg-gray-100 text-gray-600 border border-gray-200';

                if (isActive && !isExpired) {
                  label = 'Đang mở';
                  classes =
                    'bg-green-50 text-green-700 border border-green-200';
                } else if (isExpired) {
                  label = 'Hết hạn';
                  classes =
                    'bg-orange-50 text-orange-700 border border-orange-200';
                }

                return (
                  <li key={j.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800">
                        {j.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {j.company} • {j.location}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${classes}`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })
            ) : (
              <li className="text-gray-500 text-sm">Chưa có dữ liệu</li>
            )}
          </ul>
        </div>
      </div>

      {/* Tin gần đây */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5">
        <div className="px-4 py-4 border-b">
          <div className="font-medium">Tin tuyển dụng gần đây</div>
          <div className="text-sm text-gray-500">
            Danh sách các tin đăng gần đây
          </div>
        </div>
        <div>
          {jobs.length ? (
            <ul className="divide-y divide-gray-200">
              {jobs.slice(0, 5).map((job) => (
                <li key={job.id}>
                  <JobCard job={job} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-gray-500">
              Chưa có tin tuyển dụng nào. Hãy tạo tin mới!
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <Link
        to="/employer/jobs/new"
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white flex items-center justify-center shadow-lg"
      >
        <FiPlus />
      </Link>
    </div>
  );
}