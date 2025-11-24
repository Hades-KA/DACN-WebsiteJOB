import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { companyService, jobService } from '../../services/api';
import { FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import JobFormModal from '../../components/employer/JobFormModal';

const PAGE_SIZE = 10;

const TABS = [
  { key: 'all',        label: 'Tất cả tin' },
  { key: 'approved',   label: 'Đã duyệt' },   // isActive = true
  { key: 'locked',     label: 'Đã khóa' },    // isActive = false
  { key: 'pending',    label: 'Chờ duyệt' },  // để khớp giao diện (chưa có dữ liệu)
];

// Mã tin hiển thị
const jobCode = (index, page, pageSize) =>
  `JOB-${String((page - 1) * pageSize + index + 1).padStart(5, '0')}`;

// Ngày đăng dạng VI
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

// Badge trạng thái – xét deadline -> Hết hạn / Đã duyệt (vàng) / Đã khóa
const StatusBadge = ({ isActive, deadline }) => {
  const now = Date.now();
  const deadlineTs = deadline ? new Date(deadline).getTime() : null;
  const isExpired = deadlineTs != null && deadlineTs < now;

  let text = 'Đã khóa';
  let classes = 'bg-gray-100 text-gray-600 ring-gray-200';

  if (isExpired) {
    text = 'Hết hạn';
    classes = 'bg-orange-50 text-orange-700 ring-orange-200';
  } else if (isActive) {
    text = 'Đã duyệt';
    // ⬇️ đổi sang màu vàng (amber)
    classes = 'bg-amber-50 text-amber-700 ring-amber-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ${classes}`}
    >
      {text}
    </span>
  );
};

export default function MyJobs() {
  const navigate = useNavigate();

  const [tab, setTab] = useState('all');
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null); // trạng thái khi bấm Xóa

  // State cho modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  // Lấy user local
  const getLocalUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  };

  const getEmployerId = (u) =>
    u?.id || u?.userId || getLocalUser()?.id || getLocalUser()?.userId;

  // Map tab -> tham số active cho API
  const activeParam = useMemo(() => {
    if (tab === 'approved') return 'true';
    if (tab === 'locked') return 'false';
    return 'all';
  }, [tab]);

  // Tải danh sách job
  const load = async (p = page) => {
    setLoading(true);
    try {
      let u = getLocalUser();
      try {
        const meRes = await api.get('/auth/me');
        u = meRes.data?.user || meRes.data || u;
      } catch {
        /* dùng local nếu /auth/me lỗi */
      }

      const employerId = getEmployerId(u);
      if (!employerId) {
        setRows([]);
        setPagination({
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: PAGE_SIZE,
        });
        return;
      }

      const res = await companyService.getCompanyJobs(employerId, {
        active: activeParam,
        page: p,
        limit: PAGE_SIZE,
      });

      const data = res.data?.data || res.data || [];
      const pag =
        res.data?.pagination || {
          currentPage: p,
          totalPages: Math.max(1, Math.ceil((data.length || 0) / PAGE_SIZE)),
          totalItems: data.length || 0,
          itemsPerPage: PAGE_SIZE,
        };

      const finalRows =
        tab === 'pending' || tab === 'violations'
          ? []
          : Array.isArray(data)
          ? data
          : [];

      setRows(finalRows);
      setPagination(pag);
      setPage(pag.currentPage || p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Phân trang
  const toPage = async (to) => {
    if (to < 1 || to > (pagination?.totalPages || 1)) return;
    await load(to);
  };

  // Xóa (nếu DELETE lỗi thì fallback đóng tin)
  const handleDelete = async (job) => {
    if (!window.confirm(`Xóa tin "${job.title}"? Hành động không thể hoàn tác.`))
      return;
    try {
      setWorkingId(job.id);
      await jobService.deleteJob(job.id);
      await load(page);
    } catch (e) {
      try {
        await jobService.updateJobStatus(job.id, {
          isActive: false,
          isFeatured: false,
        });
        await load(page);
        alert(
          'Không xóa được do ràng buộc dữ liệu. Tin đã được đóng (ẩn) để thay thế.'
        );
      } catch {
        alert(e?.response?.data?.message || 'Xóa thất bại');
      }
    } finally {
      setWorkingId(null);
    }
  };

  const handleCreateNew = () => {
    setEditingJob(null);
    setModalOpen(true);
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setModalOpen(true);
  };

  return (
    <div className="relative">
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5">
        {/* Header */}
        <div className="px-8 py-4 border-b flex items-center justify-between">
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            Quản lý tin tuyển dụng
          </div>
          <button
            onClick={handleCreateNew}
            className="px-3.5 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Tạo tin mới
          </button>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-2">
          <div className="flex items-center gap-8 text-sm">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-2 -mb-px border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bảng */}
        <div className="px-8 pb-0 overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="py-2 px-3 text-left w-[120px]">Mã tin</th>
                <th className="py-2 px-3 text-left">Tiêu đề</th>
                <th className="py-2 px-3 text-center w-[120px]">Ngày đăng</th>
                <th className="py-2 px-3 text-center w-[110px]">Lượt xem</th>
                <th className="py-2 px-3 text-center w-[130px]">Lượt ứng tuyển</th>
                <th className="py-2 px-3 text-center w-[110px]">Trạng thái</th>
                <th className="py-2 px-3 text-left w-[220px]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                rows.map((j, idx) => (
                  <tr
                    key={j.id}
                    className="border-b last:border-b-0 hover:bg-gray-50/60"
                  >
                    <td className="py-2 px-3 align-middle">
                      {jobCode(
                        idx,
                        page,
                        pagination.itemsPerPage || PAGE_SIZE
                      )}
                    </td>

                    <td className="py-2 px-3 align-middle">
                      <div className="font-medium text-gray-900 truncate leading-[18px]">
                        {j.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {j.location || ''}
                      </div>
                    </td>

                    <td className="py-2 px-3 text-center align-middle">
                      {formatDate(j.createdAt)}
                    </td>

                    <td className="py-2 px-3 text-center align-middle">
                      {j.viewsCount ?? 0}
                    </td>

                    <td className="py-2 px-3 text-center align-middle">
                      {j.applicationsCount ?? 0}
                    </td>

                    <td className="py-2 px-3 text-center align-middle">
                      <StatusBadge
                        isActive={!!j.isActive}
                        deadline={j.deadline}
                      />
                    </td>

                    <td className="py-2 px-3 align-middle">
                      <div className="flex items-center gap-4 whitespace-nowrap">
                        <Link
                          to={`/employer/jobs/${j.id}/applicants`}
                          className="text-blue-600 hover:text-blue-700"
                          title="Chi tiết"
                        >
                          Chi tiết
                        </Link>

                        <button
                          onClick={() => handleEdit(j)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Chỉnh sửa"
                        >
                          Chỉnh sửa
                        </button>

                        <button
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          onClick={() => handleDelete(j)}
                          disabled={workingId === j.id}
                          title="Xóa"
                        >
                          {workingId === j.id ? 'Đang xóa…' : 'Xóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="px-8 py-2 border-t flex items-center justify-end text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 grid place-items-center rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
              onClick={() => toPage(page - 1)}
              disabled={page <= 1 || loading}
              title="Trước"
            >
              <FiChevronLeft />
            </button>
            <div className="h-8 min-w-[32px] grid place-items-center rounded border bg-white text-gray-800">
              {page}
            </div>
            <button
              className="h-8 w-8 grid place-items-center rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
              onClick={() => toPage(page + 1)}
              disabled={page >= (pagination.totalPages || 1) || loading}
              title="Sau"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Nút tạo tin nổi */}
      <button
        onClick={handleCreateNew}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white flex items-center justify-center shadow-lg"
        title="Tạo tin mới"
      >
        <FiPlus />
      </button>

      {/* Modal tạo/sửa tin */}
      <JobFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingJob(null);
        }}
        job={editingJob}
        onSuccess={() => {
          setModalOpen(false);
          setEditingJob(null);
          load(page); // Reload danh sách
        }}
      />
    </div>
  );
}