import React, { useEffect, useMemo, useState } from 'react';
import { FiBriefcase, FiUsers, FiEye, FiCheckCircle, FiPlus } from 'react-icons/fi';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import StatCard from '../../components/employer/StatCard';
import JobCard from '../../components/employer/JobCard';
import api, { companyService, applicationService } from '../../services/api';
import { Link } from 'react-router-dom';

// Slate theme palette
const THEME = {
  primary: '#2563EB',  // blue-600
  success: '#22C55E',  // green-500
  warn:    '#F59E0B',  // amber-500
  danger:  '#EF4444',  // red-500
  neutral: '#64748B',  // slate-500
};
const COLORS = [THEME.primary, THEME.success, THEME.warn, THEME.danger, THEME.neutral];

const STATUS_LABELS = {
  pending: 'Chờ duyệt',
  reviewing: 'Đang xem',
  shortlisted: 'Được chọn sơ bộ',
  interviewed: 'Đã phỏng vấn',
  accepted: 'Được nhận',
  rejected: 'Bị từ chối',
};
const STATUS_ORDER = ['pending','reviewing','shortlisted','interviewed','accepted','rejected'];

export default function EmployerDashboard() {
  const [me, setMe] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const getCachedUser = () => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } };
  const getEmployerId = (u) => u?.id || u?.userId || getCachedUser()?.id || getCachedUser()?.userId;

  useEffect(() => {
    const load = async () => {
      try {
        let u = getCachedUser();
        try { const meRes = await api.get('/auth/me'); u = meRes.data?.user || meRes.data || u; } catch {}
        setMe(u);

        const employerId = getEmployerId(u);
        if (employerId) {
          const jobsRes = await companyService.getCompanyJobs(employerId);
          setJobs(jobsRes.data?.data || jobsRes.data || []);
        } else setJobs([]);

        try {
          const appsRes = await applicationService.getApplications({});
          setApps(appsRes.data?.data || appsRes.data || []);
        } catch { setApps([]); }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const activeJobs = useMemo(() => jobs.filter(j => j.isActive).length, [jobs]);
  const totalViews = useMemo(() => jobs.reduce((s, j) => s + (j.viewsCount || 0), 0), [jobs]);
  const newApplicants = useMemo(() => apps.length, [apps]);
  const approvedCV = 0;

  const monthKey = (d) => { const dt = new Date(d); return `T${(dt.getMonth() + 1)}`; };
  const lineData = useMemo(() => {
    const v = {}, a = {};
    jobs.forEach(j => { const k = j.createdAt ? monthKey(j.createdAt) : 'T1'; v[k] = (v[k] || 0) + (j.viewsCount || 0); });
    apps.forEach(x => { const k = x.createdAt ? monthKey(x.createdAt) : 'T1'; a[k] = (a[k] || 0) + 1; });
    const keys = Array.from(new Set([...Object.keys(v), ...Object.keys(a)])).sort((x,y)=>Number(x.slice(1))-Number(y.slice(1)));
    const arr = keys.map(k => ({ name: k, views: v[k] || 0, apply: a[k] || 0 }));
    return arr.length ? arr : [
      { name: 'T1', views: 160, apply: 40 },
      { name: 'T2', views: 200, apply: 45 },
      { name: 'T3', views: 180, apply: 35 },
      { name: 'T4', views: 240, apply: 60 },
      { name: 'T5', views: 220, apply: 50 },
      { name: 'T6', views: 230, apply: 55 },
    ];
  }, [jobs, apps]);

  const pieData = useMemo(() => {
    const now = Date.now();
    let showing = 0, expired = 0, pending = 0;
    jobs.forEach(j => {
      const isExpired = j.deadline ? new Date(j.deadline).getTime() < now : false;
      if (isExpired) expired++;
      else if (j.isActive) showing++;
      else pending++;
    });
    return [
      { name: 'Đang hiển thị', value: showing },
      { name: 'Chờ duyệt', value: pending },
      { name: 'Hết hạn', value: expired },
    ];
  }, [jobs]);

  const barData = useMemo(() => {
    const map = Object.fromEntries(STATUS_ORDER.map(k => [k, 0]));
    apps.forEach(a => { map[a.status] = (map[a.status] || 0) + 1; });
    return STATUS_ORDER.map(k => ({ key: k, name: STATUS_LABELS[k], value: map[k] || 0 }));
  }, [apps]);

  const recentJobs = useMemo(() => [...jobs].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5), [jobs]);

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
          <p className="text-sm text-gray-500 mt-1">Thống kê và hoạt động gần đây</p>
        </div>
        <Link
          to="/employer/jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white shadow"
          style={{ backgroundColor: THEME.primary }}
          onMouseEnter={(e)=> e.currentTarget.style.backgroundColor = '#1D4ED8' }
          onMouseLeave={(e)=> e.currentTarget.style.backgroundColor = THEME.primary }
        >
          <FiPlus /> Đăng tin mới
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tin tuyển dụng đang đăng" value={activeJobs} icon={<FiBriefcase className="h-6 w-6" />} />
        <StatCard title="Lượt xem tin" value={totalViews} icon={<FiEye className="h-6 w-6" />} />
        <StatCard title="Ứng viên mới" value={newApplicants} icon={<FiUsers className="h-6 w-6" />} />
        <StatCard title="CV đã duyệt" value={approvedCV} icon={<FiCheckCircle className="h-6 w-6" />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4 lg:col-span-2">
          <div className="font-medium mb-2">Thống kê lượt xem và ứng tuyển</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="views" stroke={THEME.primary} strokeWidth={2} dot={false} name="Lượt xem" />
                <Line type="monotone" dataKey="apply" stroke={THEME.success} strokeWidth={2} dot={false} name="Lượt ứng tuyển" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4">
          <div className="font-medium mb-2">Trạng thái tin tuyển dụng</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bar + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4">
          <div className="font-medium mb-2">Trạng thái ứng tuyển</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} />
                <Tooltip formatter={(v) => [v, 'Số lượng']} />
                <Bar dataKey="value" fill="#8B5CF6" barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4">
          <div className="font-medium mb-2">Hoạt động gần đây</div>
          <ul className="space-y-3">
            {recentJobs.length ? recentJobs.map(j => (
              <li key={j.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">{j.title}</div>
                  <div className="text-xs text-gray-500">{j.company} • {j.location}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${j.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {j.isActive ? 'Đang mở' : 'Đã đóng'}
                </span>
              </li>
            )) : <li className="text-gray-500 text-sm">Chưa có dữ liệu</li>}
          </ul>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5">
        <div className="px-4 py-4 border-b">
          <div className="font-medium">Tin tuyển dụng gần đây</div>
          <div className="text-sm text-gray-500">Danh sách các tin đăng gần đây</div>
        </div>
        <div>
          {jobs.length ? (
            <ul className="divide-y divide-gray-200">
              {jobs.slice(0, 5).map(job => <li key={job.id}><JobCard job={job} /></li>)}
            </ul>
          ) : <div className="p-6 text-center text-gray-500">Chưa có tin tuyển dụng nào. Hãy tạo tin mới!</div>}
        </div>
      </div>

      {/* FAB (giữ màu tím nếu bạn thích; có thể đổi sang THEME.primary) */}
      <Link to="/employer/jobs/new" className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white flex items-center justify-center shadow-lg">
        <FiPlus />
      </Link>
    </div>
  );
}