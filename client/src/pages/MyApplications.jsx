// client/src/pages/MyApplications.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { applicationService } from '../services/api';     
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const groupStatus = (apiStatus) => {
  const s = String(apiStatus || '').toLowerCase();
  if (s === 'reviewing') return 'pending';
  if (s === 'shortlisted' || s === 'interviewed') return 'interview';
  if (s === 'accepted') return 'accepted';
  if (s === 'rejected') return 'rejected';
  return 'pending'; // mặc định coi là pending
};

const StatusBadge = ({ status }) => {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800',
    interview: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  const label = {
    pending: 'Đang xử lý',
    interview: 'Phỏng vấn',
    accepted: 'Đã nhận',
    rejected: 'Từ chối',
  };
  const cls = map[status] || 'bg-gray-100 text-gray-800';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label[status] || status}</span>;
};

export default function MyApplications() {
  const [raw, setRaw] = useState([]);          // dữ liệu thô từ API
  const [status, setStatus] = useState('all'); // all | pending | interview | accepted | rejected
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const PAGE_SIZE = 10;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // Gọi 1 lần: lấy tất cả để client gom nhóm + lọc
      const res = await applicationService.getMyApplications({ status: 'all', page: 1, limit: 1000 });
      const rows = res.data?.data || [];
      // map thêm uiStatus + rawStatus để hiển thị
      const data = rows.map(a => ({
        ...a,
        rawStatus: String(a.status || '').toLowerCase(),
        uiStatus: groupStatus(a.status),
      }));
      setRaw(data);
      setPage(1); // reset khi đổi nguồn dữ liệu
    } catch (e) {
      console.error(e);
      setRaw([]);
      const msg = e?.response?.data?.message || 'Không tải được danh sách ứng tuyển';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Lọc + phân trang trên client
  const filtered = useMemo(() => {
    if (status === 'all') return raw;
    return raw.filter(a => a.uiStatus === status);
  }, [raw, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Rút đơn: chỉ khi đang xử lý (uiStatus === 'pending' và rawStatus thực sự là 'pending')
  const withdraw = async (id, rawStatus) => {
    if (rawStatus !== 'pending') {
      toast.info('Chỉ có thể rút đơn khi trạng thái là Đang xử lý');
      return;
    }
    if (!window.confirm('Bạn chắc chắn muốn rút đơn này?')) return;
    try {
      await applicationService.deleteApplication(id);
      toast.success('Đã rút đơn');
      load();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Rút đơn thất bại');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + Filter */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ứng tuyển của tôi</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Trạng thái:</span>
          <select
            value={status}
            onChange={(e)=>{ setStatus(e.target.value); setPage(1); }}
            className="border rounded px-3 py-1 text-sm bg-white"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Đang xử lý</option>
            <option value="interview">Phỏng vấn</option>
            <option value="accepted">Đã nhận</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && <div className="p-4 bg-red-50 text-red-700 rounded border">{error}</div>}

      {/* Content */}
      {loading ? (
        <div className="p-6 bg-white rounded border text-gray-500">Đang tải...</div>
      ) : (
        <>
          <div className="bg-white rounded border divide-y">
            {pagedItems.length === 0 && (
              <div className="p-6 text-gray-500">
                Chưa có đơn ứng tuyển. <Link to="/jobs" className="text-blue-600">Tìm việc ngay</Link>
              </div>
            )}
            {pagedItems.map(app => (
              <div key={app.id} className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {app.job?.title} · <span className="text-gray-600">{app.job?.company}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(app.createdAt).toLocaleDateString()} · {app.job?.location || 'N/A'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={app.uiStatus} />
                  <Link to={`/jobs/${app.job?.id}`} className="text-blue-600 text-sm hover:underline">
                    Xem job
                  </Link>
                  <button
                    onClick={() => withdraw(app.id, app.rawStatus)}
                    disabled={app.rawStatus !== 'pending'}
                    className="text-sm px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
                    title={app.rawStatus !== 'pending' ? 'Chỉ rút đơn khi Đang xử lý' : 'Rút đơn'}
                  >
                    Rút đơn
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 bg-white"
              >
                Trang trước
              </button>
              <span className="text-sm text-gray-600">Trang {page}/{totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 bg-white"
              >
                Trang sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}