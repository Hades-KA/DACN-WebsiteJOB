// client/src/pages/admin/Users.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/api';
import BlockUserModal from '../../components/admin/BlockUserModal';
import {
  Search,
  X,
  Mail,
  User as UserIcon,
  ShieldAlert,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Users() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Actions
  const [blockingUser, setBlockingUser] = useState(null);
  const [detailUser, setDetailUser] = useState(null);

  const me = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw && raw !== 'undefined' && raw !== 'null' ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const isProtected = (u) => u.userType === 'admin' || u.id === me.id;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { search, page, limit };
      if (userType) params.userType = userType;
      if (isActive !== '') params.isActive = isActive;

      const res = await adminService.listUsers(params);
      const list = res?.data?.data || [];
      const pagination = res?.data?.pagination || {};
      setTotal(pagination.total || 0);

      const filtered = userType === '' ? list.filter(u => u.userType !== 'admin') : list;
      const final = filtered.filter(u => u.id !== me.id);
      setUsers(final);
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
  const onSearchEnter = (e) => {
    if (e.key === 'Enter') onSearch();
  };
  const onReset = () => {
    setSearch('');
    setUserType('');
    setIsActive('');
    setPage(1);
    fetchUsers();
  };

  const handleBlock = async (id, reason) => {
    try {
      await adminService.blockUser(id, reason);
      setBlockingUser(null);
      setDetailUser(null);
      fetchUsers();
    } catch (e) {
      alert(e?.response?.data?.message || 'Khóa tài khoản thất bại');
    }
  };

  const handleUnblock = async (id) => {
    if (!window.confirm('Bạn có chắc muốn kích hoạt (mở khóa) tài khoản này?')) return;
    try {
      await adminService.unblockUser(id);
      setDetailUser(null);
      fetchUsers();
    } catch (e) {
      alert(e?.response?.data?.message || 'Kích hoạt thất bại');
    }
  };

  const rowIndex = (idx) => (page - 1) * limit + idx + 1;
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '');

  const RoleBadge = ({ role }) => {
    const map = {
      candidate: 'bg-teal-50 text-teal-700 border-teal-200',
      employer: 'bg-blue-50 text-blue-700 border-blue-200',
      admin: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    const label = role === 'candidate' ? 'Người dùng' : role === 'employer' ? 'Nhà tuyển dụng' : 'Admin';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${map[role] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>{label}</span>;
  };

  const StatusBadge = ({ active }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
      active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'
    }`}>
      {active ? 'Hoạt động' : 'Tạm khóa'}
    </span>
  );

  const Initial = ({ name = '' }) => {
    const ch = String(name || '').trim().slice(0, 1).toUpperCase() || 'U';
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-semibold">
        {ch}
      </div>
    );
  };

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Quản lý người dùng</h1>
      </div>

      {/* Toolbar: Search + Tất cả trạng thái đặt cạnh nhau bên trái */}
      <div className="mb-4 bg-white border rounded-xl shadow-sm p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search group */}
            <div className="flex w-full sm:max-w-[520px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onSearchEnter}
                placeholder="Tìm theo tên hoặc email..."
                className="h-10 flex-1 border border-r-0 border-gray-300 rounded-l px-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={onSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-r flex items-center justify-center transition-colors"
                title="Tìm"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Tất cả trạng thái ngay cạnh search */}
            <select
              value={isActive}
              onChange={(e) => setIsActive(e.target.value)}
              className="w-full sm:w-[180px] border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Hoạt động</option>
              <option value="false">Tạm khóa</option>
            </select>
          </div>

          {/* Các filter còn lại & nút */}
          <div className="grid grid-cols-1 sm:grid-cols-[200px_160px_auto] gap-2">
            <select value={userType} onChange={(e) => setUserType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Tất cả vai trò</option>
              <option value="candidate">Người dùng</option>
              <option value="employer">Nhà tuyển dụng</option>
              <option value="admin">Quản trị</option>
            </select>

            <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 text-sm bg-white">
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>

            <div className="flex gap-2">
              <button onClick={onSearch} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Áp dụng</button>
              <button onClick={onReset} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">Reset</button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr className="text-gray-600">
                <th className="px-3 py-2 w-12">#</th>
                <th className="px-3 py-2">Họ tên</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Vai trò</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Ngày tạo</th>
                <th className="px-3 py-2 w-[180px]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-6 text-center" colSpan={7}>
                  <div className="inline-flex items-center gap-2 text-gray-500">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" /> Đang tải...
                  </div>
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={7}>Không có dữ liệu</td></tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={u.id} className="border-t hover:bg-gray-50/60">
                    <td className="px-3 py-2 text-gray-500">{rowIndex(idx)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Initial name={u.name || u.email} />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{u.name}</div>
                          <div className="text-xs text-gray-400">ID: {u.id?.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2"><RoleBadge role={u.userType} /></td>
                    <td className="px-3 py-2"><StatusBadge active={u.isActive} /></td>
                    <td className="px-3 py-2 text-gray-700">{fmtDate(u.createdAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetailUser(u)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                        >
                          Chi tiết
                        </button>
                        {!u.isActive && (
                          <button
                            onClick={() => handleUnblock(u.id)}
                            className={`px-3 py-1.5 rounded-lg text-white text-xs ${
                              isProtected(u) ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                            }`}
                            disabled={isProtected(u)}
                            title={isProtected(u) ? 'Không thể kích hoạt admin hoặc chính bạn' : 'Kích hoạt tài khoản'}
                          >
                            Kích hoạt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination kiểu Jobs */}
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

            <div className="px-3 py-1 bg-blue-50 text-blue-600 font-medium text-sm rounded">
              {page}/{totalPages}
            </div>

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

      {blockingUser && (
        <BlockUserModal
          user={blockingUser}
          onClose={() => setBlockingUser(null)}
          onConfirm={(reason) => handleBlock(blockingUser.id, reason)}
        />
      )}

      {detailUser && (
        <DetailDrawer
          user={detailUser}
          onClose={() => setDetailUser(null)}
          isProtected={isProtected(detailUser)}
          onRequestBlock={(u) => setBlockingUser(u)}
          onRequestUnblock={(id) => handleUnblock(id)}
        />
      )}
    </div>
  );
}

/* ================= Drawer & helpers ================= */

function DetailDrawer({ user, onClose, isProtected, onRequestBlock, onRequestUnblock }) {
  const fmt = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '');
  const roleLabel = user.userType === 'candidate' ? 'Người dùng' : user.userType === 'employer' ? 'Nhà tuyển dụng' : 'Admin';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl border-l flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Chi tiết người dùng</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" title="Đóng">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold">
              {(user.name || user.email || 'U').slice(0,1).toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{user.name || '—'}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Mail className="w-3.5 h-3.5" /> {user.email}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <InfoRow icon={<UserIcon className="w-4 h-4 text-blue-600" />} label="Vai trò" value={roleLabel} />
            <InfoRow icon={<ShieldAlert className="w-4 h-4 text-emerald-600" />} label="Trạng thái" value={user.isActive ? 'Hoạt động' : 'Tạm khóa'} />
            {user.company && <InfoRow icon={<Building2 className="w-4 h-4 text-gray-600" />} label="Công ty" value={user.company} />}
            <InfoRow icon={<CalendarDays className="w-4 h-4 text-gray-600" />} label="Ngày tạo" value={fmt(user.createdAt)} />
            <InfoRow icon={<CalendarDays className="w-4 h-4 text-gray-600" />} label="Cập nhật" value={fmt(user.updatedAt)} />
          </div>

          {isProtected && (
            <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
              Tài khoản quản trị hoặc chính bạn – không thể khóa/mở khóa tại đây.
            </div>
          )}
        </div>

        <div className="mt-auto px-4 py-3 border-t bg-gray-50 flex items-center justify-end gap-2">
          {user.isActive ? (
            <button
              onClick={() => onRequestBlock(user)}
              className={`px-4 py-2 rounded-lg text-white text-sm ${isProtected ? 'bg-orange-300 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}
              disabled={isProtected}
              title={isProtected ? 'Không thể khóa admin hoặc chính bạn' : 'Khóa tài khoản này'}
            >
              Khóa tài khoản
            </button>
          ) : (
            <button
              onClick={() => onRequestUnblock(user.id)}
              className={`px-4 py-2 rounded-lg text-white text-sm ${isProtected ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={isProtected}
              title={isProtected ? 'Không thể kích hoạt admin hoặc chính bạn' : 'Kích hoạt tài khoản'}
            >
              Kích hoạt
            </button>
          )}

          <button onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-100 text-sm">Đóng</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-medium text-gray-900">{value || '—'}</div>
      </div>
    </div>
  );
}