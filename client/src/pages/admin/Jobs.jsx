import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom'; // ✅ THÊM IMPORT NÀY
import { adminService } from '../../services/api';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

// Helpers
const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('vi-VN');
};

const getDeadline = (j) =>
  j?.deadline || j?.expireDate || j?.expiresAt || j?.closingDate || j?.deadlineAt || j?.endDate || null;

const getStatusInfo = (job) => {
  const dl = getDeadline(job);
  const now = new Date();
  if (dl) {
    const d = new Date(dl);
    if (!isNaN(d.getTime()) && d < now) return { label: 'Hết hạn', tone: 'expired' };
  }
  if (job?.isActive) return { label: 'Đang hiển thị', tone: 'active' };
  return { label: 'Đã ẩn', tone: 'inactive' };
};

const badgeClass = (tone) => {
  switch (tone) {
    case 'active': return 'bg-green-50 text-green-600 border border-green-200';
    case 'expired': return 'bg-gray-600 text-white';
    default: return 'bg-gray-100 text-gray-600 border border-gray-200';
  }
};

export default function Jobs() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { search, page, limit };
      if (isActive !== '') params.isActive = isActive;

      const res = await adminService.listJobs(params);
      setJobs(res?.data?.data || []);
      setTotal(res?.data?.pagination?.total || 0);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được danh sách Quản lý tin tuyển dụng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); /* eslint-disable-next-line */ }, [page]);

  const onSearch = () => { setPage(1); fetchJobs(); };
  const onSearchEnter = (e) => { if (e.key === 'Enter') onSearch(); };

  const toggleActive = async (id, curr) => {
    try {
      await adminService.updateJobStatus(id, !curr);
      fetchJobs();
    } catch (e) {
      alert(e?.response?.data?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-xl font-semibold">Quản lý tin tuyển dụng</h1>
      </div>

      {/* Tabs đồng bộ với Companies */}
      <div className="mb-3">
        <div className="flex items-center gap-3 text-sm border-b">
          <button className="relative pb-2 -mb-px border-b-2 border-blue-600 text-blue-600">
            Danh sách tin tuyển dụng
          </button>
          <span className="relative pb-2 -mb-px border-b-2 border-transparent text-gray-300 cursor-default">
            Chi tiết tin tuyển dụng
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 bg-white border rounded-xl shadow-sm p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex w-full sm:max-w-[520px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onSearchEnter}
              placeholder="Tìm kiếm theo tiêu đề..."
              className="h-10 flex-1 border border-r-0 border-gray-300 rounded-l px-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={onSearch}
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-r flex items-center justify-center transition-colors"
              title="Tìm"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          <select
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
            className="h-10 w-full sm:w-[180px] border rounded-lg px-3 text-sm bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hiển thị</option>
            <option value="false">Đã ẩn</option>
          </select>
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      {/* List */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Tiêu đề</th>
                <th className="px-4 py-3">Công ty</th>
                <th className="px-4 py-3">Ngày đăng</th>
                <th className="px-4 py-3">Hạn nộp</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Đang tải dữ liệu...</td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Không có dữ liệu</td>
                </tr>
              ) : (
                jobs.map((j) => {
                  const postedAt = j?.createdAt;
                  const deadline = getDeadline(j);
                  const status = getStatusInfo(j);
                  const isExpired = status.tone === 'expired';
                  const canToggle = !isExpired;

                  return (
                    <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 font-medium text-gray-900">{j.title}</td>
                      <td className="px-4 py-4 text-gray-700">{j.company}</td>
                      <td className="px-4 py-4 text-gray-700">{formatDate(postedAt)}</td>
                      <td className="px-4 py-4 text-gray-700">{formatDate(deadline)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${badgeClass(status.tone)}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {/* ✅ ĐỔI BUTTON → LINK */}
                          <Link
                            to={`/admin/jobs/${j.id}`}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors"
                          >
                            Chi tiết
                          </Link>

                          {canToggle && (
                            <button
                              onClick={() => toggleActive(j.id, j.isActive)}
                              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                                j.isActive
                                  ? 'text-red-600 border-red-200 hover:bg-red-50'
                                  : 'text-green-700 border-green-200 hover:bg-green-50'
                              }`}
                            >
                              {j.isActive ? 'Hủy duyệt' : 'Duyệt tin'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <span className="text-sm text-gray-600">
            Hiển thị {total ? from : 0}–{to} trong tổng số <strong>{total}</strong> kết quả
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 bg-blue-50 text-blue-600 font-medium text-sm rounded">{page}</div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}