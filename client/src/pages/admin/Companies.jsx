// client/src/pages/admin/Companies.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/api';
import {
  Search,
  Phone,
  Mail,
  Building2,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const PAGE_SIZE = 10;

export default function AdminCompanies() {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [items, setItems]   = useState([]);
  const [total, setTotal]   = useState(0);

  // Filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const fetchList = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { search: q, page, limit: PAGE_SIZE };
      if (status !== '') params.isActive = status;
      const res = await adminService.listCompanies(params);
      const data = res?.data?.data || res?.data || [];
      const pagination = res?.data?.pagination || {};
      setItems(Array.isArray(data) ? data : []);
      setTotal(pagination.total || 0);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được danh sách công ty');
      setItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [page]);
  useEffect(() => { setPage(1); /* page effect sẽ fetch */ }, [status]);

  const onSearch = () => { setPage(1); fetchList(); };
  const onSearchEnter = (e) => { if (e.key === 'Enter') onSearch(); };

  const toggleActive = async (row, next) => {
    if (!window.confirm(`${next ? 'Khôi phục' : 'Tạm ngưng'} hoạt động cho ${row.company || row.name}?`)) return;
    try { await adminService.updateCompanyStatus(row.id, next); fetchList(); }
    catch (e) { alert(e?.response?.data?.message || 'Cập nhật trạng thái thất bại'); }
  };

  const from = (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-xl font-semibold">Quản lý công ty</h1>
      </div>

      {/* Tabs */}
      <div className="mb-3">
        <div className="flex items-center gap-3 text-sm border-b">
          <button className="relative pb-2 -mb-px border-b-2 border-blue-600 text-blue-600">Danh sách công ty</button>
          <span className="relative pb-2 -mb-px border-b-2 border-transparent text-gray-300 cursor-default">
            Chi tiết công ty
          </span>
        </div>
      </div>

      {/* Toolbar đồng bộ: Search + Tất cả trạng thái cạnh nhau, cùng h-10 */}
      <div className="mb-4 bg-white border rounded-xl shadow-sm p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search */}
          <div className="flex w-full sm:max-w-[520px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onSearchEnter}
              placeholder="Tìm tên/email/công ty..."
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

          {/* Tất cả trạng thái */}
          <select
            value={status}
            onChange={(e)=>setStatus(e.target.value)}
            className="h-10 w-full sm:w-[180px] border rounded-lg px-3 text-sm bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Tạm ngưng</option>
          </select>
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      {/* List */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.6fr_1.2fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-3 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
          <div>Công ty</div>
          <div>Thông tin liên hệ</div>
          <div>Quy mô</div>
          <div>Tin tuyển dụng</div>
          <div>Trạng thái</div>
          <div>Thao tác</div>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-gray-500">Không có dữ liệu</div>
        ) : (
          <ul className="divide-y">
            {items.map((c) => (
              <li key={c.id} className="px-4 py-3 hover:bg-gray-50/60">
                <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1.2fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-3 items-center">
                  <CompanyCell logoUrl={c.logoUrl} company={c.company || c.name} city={c.companyCity} />
                  <ContactCell contactName={c.name} email={c.email} phone={c.phone} />
                  <SizeCell size={c.companySize} />
                  <JobsCell open={c.jobsOpen} total={c.jobsTotal} />
                  <StatusCell active={c.isActive} />
                  <ActionsCell
                    active={c.isActive}
                    onToggle={() => toggleActive(c, !c.isActive)}
                    detailHref={`/admin/companies/${c.id}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination đồng bộ */}
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

/* ===== Sub components giữ nguyên ===== */
function CompanyLogo({ src }) {
  return (
    <div className="w-10 h-10 rounded bg-white ring-1 ring-gray-200 overflow-hidden flex items-center justify-center">
      {src ? <img src={src} alt="logo" className="w-full h-full object-contain" /> : <Building2 className="w-5 h-5 text-gray-400" />}
    </div>
  );
}
function CompanyCell({ logoUrl, company, city }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <CompanyLogo src={logoUrl} />
      <div className="min-w-0">
        <div className="font-semibold text-gray-900 truncate">{company || '—'}</div>
        <div className="text-xs text-gray-500 truncate">{city || ''}</div>
      </div>
    </div>
  );
}
function DotIcon({ children, title, disabled }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full ring-1 text-gray-500 ${
        disabled ? 'bg-gray-50 ring-gray-100 opacity-40 cursor-not-allowed' : 'bg-gray-50 ring-gray-200 hover:text-blue-600 hover:ring-blue-200'
      }`}
      title={title}
    >
      {children}
    </span>
  );
}
function ContactCell({ contactName, email, phone }) {
  const hasEmail = !!email;
  const hasPhone = !!phone;
  return (
    <div className="text-sm text-gray-700">
      <div className="font-medium truncate">{contactName || '—'}</div>
      <div className="flex items-center gap-2 mt-1">
        <a href={hasEmail ? `mailto:${email}` : undefined} onClick={(e) => !hasEmail && e.preventDefault()} className="inline-block">
          <DotIcon title={email || 'Không có email'} disabled={!hasEmail}>
            <Mail className="w-3.5 h-3.5" />
          </DotIcon>
        </a>
        <a href={hasPhone ? `tel:${phone}` : undefined} onClick={(e) => !hasPhone && e.preventDefault()} className="inline-block">
          <DotIcon title={phone || 'Không có số điện thoại'} disabled={!hasPhone}>
            <Phone className="w-3.5 h-3.5" />
          </DotIcon>
        </a>
      </div>
    </div>
  );
}
function SizeCell({ size }) {
  return (
    <div className="text-sm">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 text-xs">
        <Users className="w-3.5 h-3.5 text-gray-500" />
        {size || '—'}
      </span>
    </div>
  );
}
function JobsCell({ open, total }) {
  return (
    <div className="text-sm">
      <div className="font-semibold text-gray-900">{open || 0} / {total || 0}</div>
      <div className="text-[11px] text-gray-500">Đang tuyển / Tổng số</div>
    </div>
  );
}
function StatusCell({ active }) {
  return (
    <div>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
      }`}>
        {active ? 'Đang hoạt động' : 'Tạm ngưng'}
      </span>
    </div>
  );
}
function ActionsCell({ active, onToggle, detailHref }) {
  return (
    <div className="flex items-center gap-2">
      <Link to={detailHref} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700">
        Chi tiết
      </Link>
      <button
        onClick={onToggle}
        className={`px-3 py-1.5 rounded-lg text-xs border ${
          active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-700 border-green-200 hover:bg-green-50'
        }`}
      >
        {active ? 'Tạm ngưng' : 'Khôi phục'}
      </button>
    </div>
  );
}