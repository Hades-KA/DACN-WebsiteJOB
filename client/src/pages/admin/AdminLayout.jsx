import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  const navLinkClass = ({ isActive }) =>
    `block px-3 py-2 rounded hover:bg-gray-100 ${isActive ? 'bg-gray-200 font-semibold' : ''}`;

  return (
    <div className="flex min-h-[60vh]">
      <aside className="w-56 border-r p-4">
        <h2 className="text-lg font-semibold mb-3">Admin</h2>
        <nav className="space-y-1">
          <NavLink to="/admin" end className={navLinkClass}>Dashboard</NavLink>
          <NavLink to="/admin/companies" className={navLinkClass}>Companies</NavLink>
          <NavLink to="/admin/jobs" className={navLinkClass}>Jobs</NavLink>
          <NavLink to="/admin/users" className={navLinkClass}>Users</NavLink>
          <NavLink to="/admin/settings" className={navLinkClass}>Settings</NavLink>
        </nav>
      </aside>
      <section className="flex-1 p-6">
        <Outlet />
      </section>
    </div>
  );
}
