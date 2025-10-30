import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/api';

export default function Jobs() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [isActive, setIsActive] = useState('');
  const [isFeatured, setIsFeatured] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { search, page, limit };
      if (company) params.company = company;
      if (location) params.location = location;
      if (isActive !== '') params.isActive = isActive;
      if (isFeatured !== '') params.isFeatured = isFeatured;
      const res = await adminService.listJobs(params);
      setJobs(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được danh sách việc làm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const onSearch = () => {
    setPage(1);
    fetchJobs();
  };

  const toggleActive = async (id, curr) => {
    try {
      await adminService.updateJobStatus(id, !curr);
      fetchJobs();
    } catch (e) {
      alert(e?.response?.data?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  const toggleFeatured = async (id, curr) => {
    try {
      await adminService.updateJobFeatured(id, !curr);
      fetchJobs();
    } catch (e) {
      alert(e?.response?.data?.message || 'Cập nhật nổi bật thất bại');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Việc làm</h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tiêu đề/công ty"
               className="border rounded px-3 py-2"/>
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Công ty"
               className="border rounded px-3 py-2"/>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Địa điểm"
               className="border rounded px-3 py-2"/>
        <select value={isActive} onChange={(e) => setIsActive(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Trạng thái</option>
          <option value="true">Đang mở</option>
          <option value="false">Đã tắt</option>
        </select>
        <select value={isFeatured} onChange={(e) => setIsFeatured(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Nổi bật</option>
          <option value="true">Có</option>
          <option value="false">Không</option>
        </select>
        <button onClick={onSearch} className="bg-blue-600 text-white rounded px-4 py-2">Tìm</button>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Tiêu đề</th>
              <th className="px-3 py-2">Công ty</th>
              <th className="px-3 py-2">Địa điểm</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2">Nổi bật</th>
              <th className="px-3 py-2 w-56">Hành động</th>
            </tr>
          </thead>
          <tbody>
          {loading ? (
            <tr><td className="px-3 py-4" colSpan={6}>Đang tải...</td></tr>
          ) : jobs.length === 0 ? (
            <tr><td className="px-3 py-4" colSpan={6}>Không có dữ liệu</td></tr>
          ) : (
            jobs.map(j => (
              <tr key={j.id} className="border-t">
                <td className="px-3 py-2">{j.title}</td>
                <td className="px-3 py-2">{j.company}</td>
                <td className="px-3 py-2">{j.location}</td>
                <td className="px-3 py-2">
                  <button onClick={() => toggleActive(j.id, j.isActive)}
                          className={`px-3 py-1 rounded ${j.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                    {j.isActive ? 'Đang mở' : 'Đã tắt'}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => toggleFeatured(j.id, j.isFeatured)}
                          className={`px-3 py-1 rounded ${j.isFeatured ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-700'}`}>
                    {j.isFeatured ? 'Có' : 'Không'}
                  </button>
                </td>
                <td className="px-3 py-2 space-x-2">
                  <button className="px-3 py-1 border rounded">Xem</button>
                </td>
              </tr>
            ))
          )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-sm text-gray-600">Tổng: {total}</span>
        <div className="space-x-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
          <span className="text-sm">{page}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
