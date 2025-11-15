import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutGrid,
  User,
  Briefcase,
  Bell,
  Settings,
  Bookmark,
} from 'lucide-react';

const itemClass = ({ isActive }) =>
  `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
    isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
  }`;

export default function ProfileLayout() {
  const raw = localStorage.getItem('user');
  const user = raw && raw !== 'undefined' && raw !== 'null' ? JSON.parse(raw) : {};
  const initials = String(user?.name || user?.email || 'U').slice(0, 1).toUpperCase();

  return (
    <div className="bg-gray-50">
      {/* FULL-WIDTH + max width lớn để lấp màn hình */}
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3">
        <div className="mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px]">
          {/* 2 cột: sidebar 300px + content giãn hết */}
          <div className="grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] gap-4 lg:gap-6">
            {/* Sidebar */}
            <aside className="md:sticky md:top-20 h-fit">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {user?.name || user?.email || 'Người dùng'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{user?.email || ''}</div>
                  </div>
                </div>

                <div className="my-4 border-t border-gray-100" />

                <nav className="space-y-1">
                  <NavLink end to="/profile" className={itemClass}>
                    <LayoutGrid className="w-4 h-4" />
                    Tổng Quan
                  </NavLink>

                  <NavLink to="/profile/myprofile" className={itemClass}>
                    <User className="w-4 h-4" />
                    Hồ Sơ Của Tôi
                  </NavLink>

                  <NavLink to="/profile/my-applications" className={itemClass}>
                    <Briefcase className="w-4 h-4" />
                    Việc Làm Của Tôi
                  </NavLink>

                  <NavLink to="/profile/saved-jobs" className={itemClass}>
                    <Bookmark className="w-4 h-4" />
                    Việc làm đã lưu
                  </NavLink>

                  <NavLink to="/profile/notifications" className={itemClass}>
                    <Bell className="w-4 h-4" />
                    Thông Báo Việc Làm
                  </NavLink>

                  <NavLink to="/profile/account" className={itemClass}>
                    <Settings className="w-4 h-4" />
                    Quản Lý Tài Khoản
                  </NavLink>
                </nav>
              </div>
            </aside>

            {/* Nội dung chính: chiếm toàn bộ phần còn lại */}
            <section className="min-h-[calc(100vh-160px)]">
              <Outlet />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}