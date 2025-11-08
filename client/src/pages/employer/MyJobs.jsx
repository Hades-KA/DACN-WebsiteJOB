// client/src/pages/employer/MyJobs.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { companyService, jobService } from '../../services/api';

export default function MyJobs() {
  const [me, setMe] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  const getCachedUser = () => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } };
  const getEmployerId = (u) => u?.id || u?.userId || getCachedUser()?.id || getCachedUser()?.userId;

  useEffect(() => {
    api.get('/auth/me')
      .then(r => setMe(r.data?.user || r.data))
      .catch(() => setMe(getCachedUser()));
  }, []);

  const loadJobs = async (empId) => {
    try {
      const r = await companyService.getCompanyJobs(empId, { active: 'all' });
      setJobs(r.data?.data || r.data || []);
    } catch {
      setJobs([]);
    }
  };

  useEffect(() => {
    const id = getEmployerId(me);
    if (!id) return;
    loadJobs(id);
  }, [me]);

  const toggleStatus = async (job) => {
    try {
      setUpdatingId(job.id);
      const next = !job.isActive;
      const { data } = await jobService.updateJobStatus(job.id, { isActive: next });
      const updated = data?.data || data;
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, isActive: updated.isActive } : j));
    } catch (e) {
      console.error('Toggle status error:', e);
      alert(e?.response?.data?.message || 'Không đổi trạng thái được');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-lg">Quản lý tin tuyển dụng</div>
        <Link to="/employer/jobs/new" className="px-3 py-2 bg-blue-600 text-white rounded-md">Đăng tin</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2">Vị trí</th>
              <th>Công ty</th>
              <th>Địa điểm</th>
              <th>Trạng thái</th>
              <th>Lượt xem</th>
              <th>Đơn</th>
              <th className="text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id} className="border-b">
                <td className="py-2">{j.title}</td>
                <td>{j.company}</td>
                <td>{j.location}</td>
                <td>{j.isActive ? <span className="text-green-600">Đang mở</span> : <span className="text-gray-600">Đã đóng</span>}</td>
                <td>{j.viewsCount || 0}</td>
                <td>{j.applicationsCount || 0}</td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/employer/jobs/${j.id}/applicants`} className="text-blue-600 hover:underline">
                      Xem ứng viên
                    </Link>
                    <button
                      onClick={() => toggleStatus(j)}
                      disabled={updatingId === j.id}
                      className={`px-3 py-1.5 rounded-md border ${
                        j.isActive ? 'text-gray-700 bg-gray-100 hover:bg-gray-200' : 'text-green-700 bg-green-100 hover:bg-green-200'
                      } ${updatingId === j.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {j.isActive ? 'Đóng tin' : 'Mở tin'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!jobs.length && (
              <tr><td colSpan={7} className="py-6 text-center text-gray-500">Chưa có tin nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}