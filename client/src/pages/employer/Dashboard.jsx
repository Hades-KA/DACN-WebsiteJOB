// client/src/pages/employer/Dashboard.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
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
import JobFormModal from '../../components/employer/JobFormModal';

// Theme
const THEME = {
  primary: '#2563EB',
  success: '#22C55E',
  warn: '#F59E0B',
  danger: '#EF4444',
  neutral: '#64748B',
};
const COLORS = [THEME.primary, THEME.success, THEME.warn];

/**
 * Trạng thái ứng tuyển – NHẤN MẠNH AI LÀ THẰNG LÀM VIỆC
 */
const STATUS_LABELS = {
  pending: 'Đã nộp đơn',
  reviewing: 'AI phân tích CV',
  shortlisted: 'AI đề xuất',
  interviewed: 'Đã có lịch phỏng vấn',
  accepted: 'Đã nhận',
  rejected: 'Từ chối',
};

const STATUS_ORDER = [
  'pending',
  'reviewing',
  'shortlisted',
  'interviewed',
  'accepted',
  'rejected',
];

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

// Ngưỡng AI gợi ý global (được Applicants lưu vào localStorage)
const GLOBAL_STRONG_THRESHOLD_KEY = 'jobhire_ai_strong_threshold_global';
const DEFAULT_STRONG_THRESHOLD = 70;

const getGlobalStrongThreshold = () => {
  try {
    const v = localStorage.getItem(GLOBAL_STRONG_THRESHOLD_KEY);
    const num = Number(v);
    if (Number.isFinite(num) && num >= 50 && num <= 100) return num;
  } catch {}
  return DEFAULT_STRONG_THRESHOLD;
};

export default function EmployerDashboard() {
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]); // đã có aiScore như Applicants
  const [loading, setLoading] = useState(true);

  const [lastDays, setLastDays] = useState(28);
  const [trends, setTrends] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // Mở/đóng modal đăng tin
  const [openJobModal, setOpenJobModal] = useState(false);

  // ===== Hàm load jobs + applications + aiScore cho từng application =====
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Lấy user/employerId
      let u = getLocalUser();
      try {
        const meRes = await api.get('/auth/me');
        u = meRes.data?.data || meRes.data?.user || meRes.data || u;
      } catch {
        // ignore
      }

      const employerId = getEmployerId(u);
      if (!employerId) {
        setJobs([]);
        setApps([]);
        return;
      }

      // 2. Lấy danh sách job của NTD
      const jobsRes = await companyService.getCompanyJobs(employerId, {
        active: 'all',
        limit: 500,
      });
      const jobsData = jobsRes?.data?.data || jobsRes?.data || [];
      setJobs(jobsData);

      if (!jobsData.length) {
        setApps([]);
        return;
      }

      // 3. Lấy applications cho từng job
      const appsPerJob = await Promise.all(
        jobsData.map((job) =>
          applicationService
            .getJobApplications(job.id, { limit: 1000 })
            .then((res) => res?.data?.data || res?.data || [])
            .catch(() => []),
        ),
      );
      const allApps = appsPerJob.flat();

      if (!allApps.length) {
        setApps([]);
        return;
      }

      // 4. Lấy điểm AI cho từng application (giống Applicants)
      const appsWithScores = await Promise.all(
        allApps.map(async (app) => {
          try {
            const scoreRes = await api.get(`/applications/${app.id}/score`, {
              params: { _t: Date.now() },
              headers: { 'Cache-Control': 'no-cache' },
            });
            const aiScore = scoreRes.data?.data || scoreRes.data || null;
            return { ...app, aiScore };
          } catch (error) {
            console.warn(
              `Failed to get score for ${app.id}:`,
              error?.response?.status || error?.message,
            );
            return { ...app, aiScore: null };
          }
        }),
      );

      setApps(appsWithScores);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== Load xu hướng từ analytics (giữ nguyên) =====
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
    [jobs],
  );
  const totalViews = useMemo(
    () => jobs.reduce((s, j) => s + (j.viewsCount || 0), 0),
    [jobs],
  );

  // Số ứng viên duy nhất (unique candidate) – đúng nghiệp vụ
  const uniqueCandidates = useMemo(() => {
    const ids = new Set();
    apps.forEach((a) => {
      const cid =
        a.candidateId ??
        a.candidate?.id ??
        a.userId ??
        a.candidate?.userId ??
        a.candidate?.email; // fallback cuối cùng nếu backend không có id rõ ràng
      if (cid != null) ids.add(String(cid));
    });
    return ids.size;
  }, [apps]);

  const approvedCV = useMemo(
    () => apps.filter((a) => a.status === 'accepted').length,
    [apps],
  );

  // Xu hướng (đồng nhất Reports)
  const trendData = useMemo(
    () =>
      (trends || []).map((t) => ({
        day: fmtDayLabel(t.month),
        applications: toNum(t.applications),
        avgScore: toNum(t.avgScore),
      })),
    [trends],
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

  // Bar: trạng thái ứng tuyển – tính từ apps + aiScore (KHÔNG dùng analytics)
  const barData = useMemo(() => {
    const total = apps.length;
    const strongThreshold = getGlobalStrongThreshold();

    let reviewing = 0; // AI phân tích CV
    let shortlisted = 0; // AI đề xuất
    let interviewed = 0;
    let accepted = 0;
    let rejected = 0;

    apps.forEach((a) => {
      const score = Number(a.aiScore?.scoreTotal ?? NaN);
      if (!Number.isNaN(score)) {
        reviewing++;
        if (score >= strongThreshold && score >= 50) {
          shortlisted++;
        }
      }
      const s = String(a.status || '').toLowerCase();
      if (s === 'interviewed') interviewed++;
      if (s === 'accepted') accepted++;
      if (s === 'rejected') rejected++;
    });

    return [
      {
        key: 'pending',
        name: STATUS_LABELS.pending,
        value: total,
      },
      {
        key: 'reviewing',
        name: STATUS_LABELS.reviewing,
        value: reviewing,
      },
      {
        key: 'shortlisted',
        name: STATUS_LABELS.shortlisted,
        value: shortlisted,
      },
      {
        key: 'interviewed',
        name: STATUS_LABELS.interviewed,
        value: interviewed,
      },
      {
        key: 'accepted',
        name: STATUS_LABELS.accepted,
        value: accepted,
      },
      {
        key: 'rejected',
        name: STATUS_LABELS.rejected,
        value: rejected,
      },
    ];
  }, [apps]);

  const recentJobs = useMemo(
    () =>
      [...jobs]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    [jobs],
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
        <button
          type="button"
          onClick={() => setOpenJobModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white shadow bg-blue-600 hover:bg-blue-700"
        >
          <FiPlus /> Đăng tin mới
        </button>
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
          title="Ứng viên "
          value={uniqueCandidates}
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
        {/* Xu hướng theo ngày */}
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
                <YAxis type="category" dataKey="name" width={180} />
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
                const isExpired = deadlineTs != null && deadlineTs < nowTs;
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
      <button
        type="button"
        onClick={() => setOpenJobModal(true)}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white flex items-center justify-center shadow-lg"
      >
        <FiPlus />
      </button>

      {/* Modal tạo/chỉnh sửa tin tuyển dụng */}
      <JobFormModal
        open={openJobModal}
        onClose={() => setOpenJobModal(false)}
        job={null}
        onSuccess={() => {
          setOpenJobModal(false);
          loadData();
        }}
      />
    </div>
  );
}