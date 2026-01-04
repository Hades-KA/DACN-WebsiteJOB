import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  User as UserIcon, LogOut, Home, LayoutDashboard, 
  Building2, Briefcase, Users2, FileText, Settings, 
  ChevronDown, ChevronRight 
} from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State để kiểm soát việc mở/đóng menu Quản lý
  // Mặc định kiểm tra xem nếu đang ở trang con thì tự động mở ra
  const [isManagementOpen, setIsManagementOpen] = useState(false);

  // Effect này giúp menu tự mở khi người dùng truy cập trực tiếp vào link con (ví dụ F5 trang)
  useEffect(() => {
    if (location.pathname.includes('/admin/users') || 
        location.pathname.includes('/admin/companies') || 
        location.pathname.includes('/admin/jobs')) {
      setIsManagementOpen(true);
    }
  }, [location.pathname]);

  // Class cho các item thường (cấp 1)
  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md transition-colors mb-1 ${
      isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  // Class cho các item con (cấp 2) - Thụt đầu dòng và font nhỏ hơn chút
  const subNavLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm mb-1 ml-4 ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm' // Style khi được chọn (giống cái màu hồng trong ảnh của bạn)
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <AdminTopbar />

      <div className="flex">
        {/* SIDEBAR */}
        <aside className="w-64 bg-slate-900 text-slate-200 min-h-[calc(100vh-56px)] flex flex-col">
          <nav className="flex-1 p-4 space-y-1">
            
            {/* 1. TỔNG QUAN */}
            <NavLink end to="/admin" className={navLinkClass}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Tổng quan</span>
            </NavLink>

            {/* 2. QUẢN LÝ (Dropdown) */}
            <div>
              <button
                onClick={() => setIsManagementOpen(!isManagementOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors mb-1 ${
                  isManagementOpen ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Quản lý</span>
                </div>
                {/* Icon mũi tên xoay lên/xuống */}
                {isManagementOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* MENU CON (Chỉ hiện khi isManagementOpen = true) */}
              {isManagementOpen && (
                <div className="mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  <NavLink to="/admin/users" className={subNavLinkClass}>
                    {/* Bạn có thể bỏ icon ở đây nếu muốn giống hệt ảnh, hoặc giữ lại cho đẹp */}
                    <span>Quản lý người dùng</span>
                  </NavLink>

                  <NavLink to="/admin/companies" className={subNavLinkClass}>
                    <span>Quản lý công ty</span>
                  </NavLink>

                  <NavLink to="/admin/jobs" className={subNavLinkClass}>
                    <span>Quản lý tin tuyển dụng</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* 3. THEO DÕI APPLICATIONS */}
            <NavLink to="/admin/applications" className={navLinkClass}>
              <FileText className="w-5 h-5" />
              <span className="font-medium">Theo dõi Applications</span>
            </NavLink>

          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <section className="flex-1 p-6 bg-slate-50 overflow-y-auto h-[calc(100vh-56px)]">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

// --- Component Topbar (Giữ nguyên logic cũ, chỉ sửa giao diện theo yêu cầu) ---
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
    <header className="h-14 bg-slate-900 text-slate-100 shadow border-b border-slate-800 flex items-center justify-between px-6 relative z-30">
      <div className="font-bold text-xl tracking-tight">
        JobHire Admin
      </div>
      
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 hover:bg-slate-800 py-1 px-2 rounded-md transition-colors"
        >
          <span className="hidden md:block text-sm font-medium">{user?.name || user?.email || 'Administrator'}</span>
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 py-1 ring-1 ring-black ring-opacity-5 focus:outline-none">
            <Link to="/" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setOpen(false)}>
              <Home className="w-4 h-4 mr-2" />Về trang chủ
            </Link>
            <button onClick={handleLogout} className="w-full flex items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100">
              <LogOut className="w-4 h-4 mr-2" />Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}