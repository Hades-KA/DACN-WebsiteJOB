import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getStats();
      setStats(res.data.data);
      const apps = res.data.data?.applications || {};
      const total = Object.values(apps).reduce((a,b)=>a+b,0);
      const months = ['T5','T6','T7','T8','T9','T10'];
      const base = Math.max(1, total);
      const tmp = months.map((m, i) => ({
        name: m,
        don: Math.round((i+3) * base/10),
        xem: Math.round((i+2) * base/12)
      }));
      setSeries(tmp);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được thống kê');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentJobs = async () => {
    try {
      const res = await adminService.listJobs({ page: 1, limit: 5 });
      setRecentJobs(res?.data?.data || []);
    } catch (_) {}
  };

  useEffect(() => {
    fetchStats();
    fetchRecentJobs();
  }, []);

  const CARD = 'bg-white border rounded-lg shadow-sm p-4';
  const COLORS = ['#2563EB','#22D3EE','#10B981','#F59E0B','#EF4444','#9CA3AF'];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Tổng quan</h1>
      {error && <div className="mb-3 text-red-600">{error}</div>}
      {loading && <div className="mb-3">Đang tải...</div>}
      {stats && (
        <>
          {/* --- Các thẻ thống kê tổng --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={CARD}>
              <div className="text-sm text-gray-600">Người dùng</div>
              <div className="text-2xl font-semibold">{stats.users.total}</div>
              <div className="text-xs text-gray-600 mt-1">
                Ứng viên: {stats.users.candidates} · Nhà tuyển dụng: {stats.users.employers} · Admin: {stats.users.admins}
              </div>
            </div>
            <div className={CARD}>
              <div className="text-sm text-gray-600">Việc làm</div>
              <div className="text-2xl font-semibold">{stats.jobs.total}</div>
              <div className="text-xs text-gray-600 mt-1">
                Đang mở: {stats.jobs.active} · Nổi bật: {stats.jobs.featured}
              </div>
            </div>
            <div className={CARD}>
              <div className="text-sm text-gray-600">Đơn ứng tuyển</div>
              <div className="text-2xl font-semibold">
                {Object.values(stats.applications).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Chờ duyệt: {stats.applications.pending} · Đang xem: {stats.applications.reviewing} · Đã phỏng vấn: {stats.applications.interviewed}
              </div>
            </div>
          </div>

          {/* --- Biểu đồ --- */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={CARD}>
              <h2 className="text-lg font-semibold mb-3">Thống kê theo tháng</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="don" name="Đơn ứng tuyển" stroke={COLORS[0]} strokeWidth={2} />
                    <Line type="monotone" dataKey="xem" name="Lượt xem" stroke={COLORS[1]} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={CARD}>
              <h2 className="text-lg font-semibold mb-3">Phân bố trạng thái đơn</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.applications).map(([k,v])=>({ 
                        name: ({
                          pending:'Chờ duyệt', reviewing:'Đang xem', shortlisted:'Được chọn sơ bộ',
                          interviewed:'Đã phỏng vấn', accepted:'Được nhận', rejected:'Bị từ chối'
                        }[k]||k), value:v 
                      }))}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      {Object.entries(stats.applications).map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          /* --- Hoạt động gần đây (di chuyển xuống dưới) --- */
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={CARD}>
              <h2 className="text-lg font-semibold mb-3">Hoạt động gần đây</h2>
              <div className="space-y-3">
                {recentJobs.length === 0 ? (
                  <div className="text-sm text-gray-500">Chưa có hoạt động</div>
                ) : (
                  recentJobs.map((j) => (
                    <div key={j.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">{j.title}</div>
                        <div className="text-xs text-gray-600">{j.company} · {j.location}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${j.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
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
