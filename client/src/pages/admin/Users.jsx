import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/api';

export default function Users() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { search, page, limit };
      if (userType) params.userType = userType;
      if (isActive !== '') params.isActive = isActive;
      const res = await adminService.listUsers(params);
      setUsers(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const onSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleChangeRole = async (id, nextRole) => {
    try {
      await adminService.updateUserRole(id, nextRole);
      fetchUsers();
    } catch (e) {
      alert(e?.response?.data?.message || 'Đổi vai trò thất bại');
    }
  };

  const handleToggleActive = async (id, current) => {
    try {
      await adminService.updateUserStatus(id, !current);
      fetchUsers();
    } catch (e) {
      alert(e?.response?.data?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa người dùng này?')) return;
    try {
      await adminService.deleteUser(id);
      fetchUsers();
    } catch (e) {
      alert(e?.response?.data?.message || 'Xóa thất bại');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Người dùng</h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc email"
          className="border rounded px-3 py-2"
        />
        <select value={userType} onChange={(e) => setUserType(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Tất cả vai trò</option>
          <option value="candidate">Ứng viên</option>
          <option value="employer">Nhà tuyển dụng</option>
          <option value="admin">Quản trị</option>
        </select>
        <select value={isActive} onChange={(e) => setIsActive(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Trạng thái</option>
          <option value="true">Hoạt động</option>
          <option value="false">Tạm khóa</option>
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
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Vai trò</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2 w-56">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4" colSpan={5}>Đang tải...</td></tr>
            ) : users.length === 0 ? (
              <tr><td className="px-3 py-4" colSpan={5}>Không có dữ liệu</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">
                    <select
                      value={u.userType}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="candidate">Ứng viên</option>
                      <option value="employer">Nhà tuyển dụng</option>
                      <option value="admin">Quản trị</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleToggleActive(u.id, u.isActive)}
                      className={`px-3 py-1 rounded ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}
                    >
                      {u.isActive ? 'Hoạt động' : 'Tạm khóa'}
                    </button>
                  </td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="px-3 py-1 rounded bg-red-600 text-white"
                    >
                      Xóa
                    </button>
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
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >Prev</button>
          <span className="text-sm">{page}/{totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >Next</button>
        </div>
      </div>
    </div>
  );
}
