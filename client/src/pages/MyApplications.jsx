// client/src/pages/MyApplications.jsx
// TRANG QUẢN LÝ ĐƠN ỨNG TUYỂN CỦA ỨNG VIÊN

import React, { useEffect, useMemo, useState } from 'react';
import { applicationService } from '../services/api';     
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

// Hàm gom nhóm trạng thái từ backend thành 4 nhóm chính
const groupStatus = (apiStatus) => {
  const s = String(apiStatus || '').toLowerCase();
  if (s === 'reviewing') return 'pending';
  if (s === 'shortlisted' || s === 'interviewed') return 'interview';
  if (s === 'accepted') return 'accepted';
  if (s === 'rejected') return 'rejected';
  return 'pending'; // Mặc định coi là đang xử lý
};

// Component hiển thị badge trạng thái với màu sắc
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
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label[status] || status}
    </span>
  );
};

export default function MyApplications() {
  // State quản lý dữ liệu
  const [raw, setRaw] = useState([]);          // Dữ liệu thô từ API
  const [status, setStatus] = useState('all'); // Filter: all | pending | interview | accepted | rejected
  const [page, setPage] = useState(1);         // Trang hiện tại
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState('');      // Error message

  const PAGE_SIZE = 10; // Số items mỗi trang

  // Hàm load dữ liệu từ API
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // SỬA LỖI 404: Đổi từ getMyApplications sang getApplications
      // Backend route /applications tự filter theo user đang login (qua middleware auth)
      const res = await applicationService.getApplications({ 
        status: 'all', 
        page: 1, 
        limit: 1000 
      });

      const rows = res.data?.data || [];
      
      // Map thêm 2 field: uiStatus (nhóm) và rawStatus (gốc)
      const data = rows.map(a => ({
        ...a,
        rawStatus: String(a.status || '').toLowerCase(),
        uiStatus: groupStatus(a.status),
      }));
      
      setRaw(data);
      setPage(1); // Reset về trang 1 khi load lại
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

  // Load dữ liệu khi component mount
  useEffect(() => { 
    load(); 
  }, []);

  // Lọc theo status (client-side filtering)
  const filtered = useMemo(() => {
    if (status === 'all') return raw;
    return raw.filter(a => a.uiStatus === status);
  }, [raw, status]);

  // Tính toán phân trang
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Hàm rút đơn (chỉ cho phép khi trạng thái là pending)
  const withdraw = async (id, rawStatus) => {
    // Kiểm tra trạng thái
    if (rawStatus !== 'pending') {
      toast.info('Chỉ có thể rút đơn khi trạng thái là Đang xử lý');
      return;
    }
    
    // Xác nhận
    if (!window.confirm('Bạn chắc chắn muốn rút đơn này?')) return;
    
    try {
      await applicationService.deleteApplication(id);
      toast.success('Đã rút đơn thành công');
      load(); // Reload danh sách
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Rút đơn thất bại');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + Bộ lọc trạng thái */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ứng tuyển của tôi</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Trạng thái:</span>
          <select
            value={status}
            onChange={(e) => { 
              setStatus(e.target.value); 
              setPage(1); // Reset về trang 1 khi đổi filter
            }}
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

      {/* Hiển thị lỗi (nếu có) */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded border">
          {error}
        </div>
      )}

      {/* Nội dung chính */}
      {loading ? (
        // Loading state
        <div className="p-6 bg-white rounded border text-gray-500">
          Đang tải danh sách ứng tuyển...
        </div>
      ) : (
        <>
          {/* Danh sách ứng tuyển */}
          <div className="bg-white rounded border divide-y">
            {pagedItems.length === 0 && (
              // Empty state
              <div className="p-6 text-gray-500">
                Chưa có đơn ứng tuyển.{' '}
                <Link to="/jobs" className="text-blue-600 hover:underline">
                  Tìm việc ngay
                </Link>
              </div>
            )}
            
            {/* Render từng item */}
            {pagedItems.map(app => (
              <div key={app.id} className="p-4 flex items-center justify-between">
                {/* Thông tin job */}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">
                    {app.job?.title} · <span className="text-gray-600">{app.job?.company}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(app.createdAt).toLocaleDateString('vi-VN')} · {app.job?.location || 'N/A'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 ml-4">
                  {/* Badge trạng thái */}
                  <StatusBadge status={app.uiStatus} />
                  
                  {/* Link xem job */}
                  <Link 
                    to={`/jobs/${app.job?.id}`} 
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Xem job
                  </Link>
                  
                  {/* Nút rút đơn */}
                  <button
                    onClick={() => withdraw(app.id, app.rawStatus)}
                    disabled={app.rawStatus !== 'pending'}
                    className="text-sm px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={app.rawStatus !== 'pending' ? 'Chỉ rút đơn khi Đang xử lý' : 'Rút đơn'}
                  >
                    Rút đơn
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination (chỉ hiện khi có nhiều hơn 1 trang) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
              >
                Trang trước
              </button>
              <span className="text-sm text-gray-600">
                Trang {page}/{totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
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