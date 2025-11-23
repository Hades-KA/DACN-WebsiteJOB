import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutGrid,
  User,
  Briefcase,
  Bell,
  Settings,
  Bookmark,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const itemClass = ({ isActive }) =>
  `group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
    isActive 
      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' 
      : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-md'
  }`;

export default function ProfileLayout() {
  const navigate = useNavigate();
  const raw = localStorage.getItem('user');
  const user = raw && raw !== 'undefined' && raw !== 'null' ? JSON.parse(raw) : {};
  const initials = String(user?.name || user?.email || 'U').slice(0, 2).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6">
        <div className="mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px]">
          <div className="grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-6 lg:gap-8">
            
            {/* Sidebar - ĐÃ LÀM ĐẸP */}
            <aside className="md:sticky md:top-20 h-fit">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 overflow-hidden">
                {/* Header card với gradient */}
                <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                  
                  <div className="relative flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-bold text-xl shadow-lg border-2 border-white/30">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-lg truncate drop-shadow-sm">
                        {user?.name || 'Người dùng'}
                      </div>
                      <div className="text-xs text-blue-100 truncate mt-0.5">
                        {user?.email || ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                  <NavLink end to="/profile" className={itemClass}>
                    <LayoutGrid className="w-5 h-5" />
                    <span>Tổng Quan</span>
                  </NavLink>

                  <NavLink to="/profile/myprofile" className={itemClass}>
                    <User className="w-5 h-5" />
                    <span>Hồ Sơ Của Tôi</span>
                  </NavLink>

                  <NavLink to="/profile/my-applications" className={itemClass}>
                    <Briefcase className="w-5 h-5" />
                    <span>Việc Làm Của Tôi</span>
                  </NavLink>

                  <NavLink to="/profile/saved-jobs" className={itemClass}>
                    <Bookmark className="w-5 h-5" />
                    <span>Việc Đã Lưu</span>
                  </NavLink>

                  <NavLink to="/profile/notifications" className={itemClass}>
                    <Bell className="w-5 h-5" />
                    <span>Thông Báo</span>
                  </NavLink>

                  <NavLink to="/profile/account" className={itemClass}>
                    <Settings className="w-5 h-5" />
                    <span>Cài Đặt Tài Khoản</span>
                  </NavLink>
                </nav>
              </div>
            </aside>

            {/* Nội dung chính */}
            <section className="min-h-[calc(100vh-160px)]">
              <Outlet />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}