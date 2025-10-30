import React, { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, LogOut, Home, LayoutDashboard, Building2, Briefcase, Users2 } from 'lucide-react';

export default function AdminLayout() {
  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopbar />

      <div className="flex">
        <aside className="w-60 bg-slate-900 text-slate-200 min-h-[calc(100vh-56px)] p-4">
          <h2 className="text-sm uppercase tracking-wide text-slate-400 mb-3">Quản trị</h2>
          <nav className="space-y-2">
            {/* Tổng quan */}
            <NavLink to="/admin" end className={navLinkClass}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Tổng quan</span>
            </NavLink>

            {/* Quản lý công ty */}
            <div>
              <div className="text-xs text-slate-400 px-1 mb-1">Quản lý công ty</div>
              <NavLink to="/admin/companies" className={navLinkClass}>
                <Building2 className="w-4 h-4" />
                <span>Danh sách công ty</span>
              </NavLink>
            </div>

            {/* Tuyển dụng */}
            <div>
              <div className="text-xs text-slate-400 px-1 mb-1">Tuyển dụng</div>
              <div className="space-y-1">
                <NavLink to="/admin/jobs" className={navLinkClass}>
                  <Briefcase className="w-4 h-4" />
                  <span>Quản lý tin tuyển dụng</span>
                </NavLink>
                <NavLink to="/admin/users" className={navLinkClass}>
                  <Users2 className="w-4 h-4" />
                  <span>Quản lý ứng viên</span>
                </NavLink>
                <button disabled className="flex items-center gap-2 px-3 py-2 rounded-md text-slate-500 cursor-not-allowed w-full text-left">
                  <Users2 className="w-4 h-4" />
                  <span>Quản lý CV (sắp có)</span>
                </button>
              </div>
            </div>

            {/* (Bỏ nhóm 'Báo cáo & Thống kê' vì trùng với Tổng quan) */}

            {/* Gói dịch vụ */}
            <div>
              <div className="text-xs text-slate-400 px-1 mb-1">Gói dịch vụ</div>
              <button disabled className="flex items-center gap-2 px-3 py-2 rounded-md text-slate-500 cursor-not-allowed w-full text-left">
                <Briefcase className="w-4 h-4" />
                <span>Quản lý gói (sắp có)</span>
              </button>
            </div>
          </nav>
        </aside>
        <section className="flex-1 p-6">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

function AdminTopbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const userString = localStorage.getItem('user');
  const user = userString && userString !== 'undefined' && userString !== 'null' ? JSON.parse(userString) : {};

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    setOpen(false);
  };

  return (
    <header className="h-14 bg-slate-900 text-slate-100 shadow flex items-center justify-between px-4 relative z-30">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-blue-600" />
        <span className="font-semibold">JobHire Admin</span>
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-slate-100/90 hover:text-white"
        >
          <span className="hidden md:block text-sm">{user?.name || user?.email || 'Admin'}</span>
          <div className="w-8 h-8 bg-blue-500/20 border border-blue-400/30 rounded-full flex items-center justify-center">
            <UserIcon className="w-4 h-4" />
          </div>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white text-slate-800 rounded-md shadow-lg border border-slate-200 py-2">
            <Link to="/" className="flex items-center px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setOpen(false)}>
              <Home className="w-4 h-4 mr-2" />Về trang chủ
            </Link>
            <button onClick={handleLogout} className="w-full flex items-center px-3 py-2 text-left text-sm hover:bg-slate-50">
              <LogOut className="w-4 h-4 mr-2" />Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
