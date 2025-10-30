import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/api';

export default function Companies() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { search, page, limit };
      if (isActive !== '') params.isActive = isActive;
      const res = await adminService.listCompanies(params);
      setCompanies(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được danh sách công ty');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const onSearch = () => {
    setPage(1);
    fetchCompanies();
  };

  const toggleActive = async (id, curr) => {
    try {
      await adminService.updateCompanyStatus(id, !curr);
      fetchCompanies();
    } catch (e) {
      alert(e?.response?.data?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Công ty</h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên/email/công ty"
               className="border rounded px-3 py-2"/>
        <select value={isActive} onChange={(e) => setIsActive(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Trạng thái</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="border rounded px-3 py-2">
          <option value={10}>10 / trang</option>
          <option value={20}>20 / trang</option>
          <option value={50}>50 / trang</option>
        </select>
        <button onClick={onSearch} className="bg-blue-600 text-white rounded px-4 py-2">Tìm</button>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Tên</th>
              <th className="px-3 py-2">Công ty</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2 w-40">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4" colSpan={5}>Đang tải...</td></tr>
            ) : companies.length === 0 ? (
              <tr><td className="px-3 py-4" colSpan={5}>Không có dữ liệu</td></tr>
            ) : (
              companies.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2">{c.company}</td>
                  <td className="px-3 py-2">{c.email}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => toggleActive(c.id, c.isActive)}
                            className={`px-3 py-1 rounded ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-3 py-2">
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
