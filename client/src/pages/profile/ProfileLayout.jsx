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
  const userRaw = localStorage.getItem('user');
  const user = userRaw && userRaw !== 'undefined' && userRaw !== 'null'
    ? JSON.parse(userRaw)
    : {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="md:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="text-sm text-gray-500 mb-2">Xin chào</div>
              <div className="font-semibold text-gray-900 mb-4">
                {user?.name || user?.email || 'User'}
              </div>

              <nav className="space-y-1">
                <NavLink end to="/profile" className={itemClass}>
                  <LayoutGrid className="w-4 h-4" />
                  Tổng quan
                </NavLink>

                <NavLink to="/profile/personal" className={itemClass}>
                  <User className="w-4 h-4" />
                  Hồ sơ của tôi
                </NavLink>

                <NavLink to="/profile/my-applications" className={itemClass}>
                  <Briefcase className="w-4 h-4" />
                  Ứng tuyển của tôi
                </NavLink>

                <NavLink to="/profile/saved-jobs" className={itemClass}>
                  <Bookmark className="w-4 h-4" />
                  Việc làm đã lưu
                </NavLink>

                <NavLink to="/profile/notifications" className={itemClass}>
                  <Bell className="w-4 h-4" />
                  Thông báo
                </NavLink>

                <NavLink to="/profile/account" className={itemClass}>
                  <Settings className="w-4 h-4" />
                  Cài đặt tài khoản
                </NavLink>
              </nav>
            </div>
          </aside>

          {/* Nội dung chính */}
          <section className="md:col-span-9">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}