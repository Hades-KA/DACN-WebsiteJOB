// src/components/NotificationBell.jsx
import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { Bell, BellRing } from 'lucide-react';
import { notificationService } from '../services/api';
import { useNavigate } from 'react-router-dom';

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export default function NotificationBell({ className = '' }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Lấy userType để quyết định route "xem tất cả"
  const rawUser = localStorage.getItem('user');
  let userType = null;
  try {
    userType = rawUser ? JSON.parse(rawUser).userType : null;
  } catch {
    userType = null;
  }
  const token = localStorage.getItem('token');

  const load = async () => {
    if (!token) {
      setItems([]);
      setUnread(0);
      return;
    }

    setLoading(true);
    try {
      const res = await notificationService.getNotifications({
        limit: 10,
        page: 1,
      });
      const list = res?.data?.data || res?.data || [];
      const arr = Array.isArray(list)
        ? list.map((n) => ({
            ...n,
            // Chuẩn hoá field read từ isRead
            read:
              typeof n.read === 'boolean'
                ? n.read
                : typeof n.isRead === 'boolean'
                ? n.isRead
                : false,
          }))
        : [];
      setItems(arr);
      setUnread(arr.filter((n) => !n.read).length);
    } catch {
      setItems([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    const iv = setInterval(load, 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    const raw = import.meta?.env?.VITE_API_URL || window.location.origin || '';
    const base = String(raw).replace(/\/$/, '').replace(/\/api$/i, '');
    const socket = io(base, { auth: { token } });

    const onNew = (n) => {
      const mapped = {
        ...n,
        read: typeof n.read === 'boolean' ? n.read : typeof n.isRead === 'boolean' ? n.isRead : false,
      };
      setItems((prev) => [mapped, ...prev].slice(0, 10));
      setUnread((u) => u + (mapped.read ? 0 : 1));
    };
    socket.on('new_notification', onNew);
    return () => {
      socket.off('new_notification', onNew);
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useOnClickOutside(ref, () => setOpen(false));

  const onIconClick = () => {
    const t = localStorage.getItem('token');
    if (!t) return navigate('/login');
    setOpen((o) => !o);
  };

  const markAll = async (e) => {
    e?.stopPropagation?.();
    try {
      await notificationService.markAllAsRead();
      load();
    } catch {}
  };

  const goAll = () => {
    setOpen(false);
    // Employer -> /employer/notifications, Candidate -> /profile/notifications
    if (userType === 'employer') navigate('/employer/notifications');
    else navigate('/profile/notifications');
  };

  const goItem = (n) => {
    setOpen(false);
    if (n?.jobId) {
      // Với thông báo liên quan job -> nhảy sang trang job public
      navigate(`/jobs/${n.jobId}`);
    } else {
      goAll();
    }
  };

  // Ẩn chuông nếu chưa đăng nhập hoặc userType không phải candidate/employer/admin
  if (
    !token ||
    (userType &&
      !['candidate', 'employer', 'admin'].includes(String(userType).toLowerCase()))
  ) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={onIconClick}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-gray-200 md:text-gray-700"
        title="Thông báo"
      >
        {unread > 0 ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] grid place-items-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-white shadow-lg ring-1 ring-black/5 z-40">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <div className="text-sm font-medium text-gray-800">Thông báo</div>
            <button
              onClick={markAll}
              className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50"
            >
              Đánh dấu tất cả đã đọc
            </button>
          </div>
          <div className="max-h-80 overflow-auto">
            {loading ? (
              <div className="p-3 text-sm text-gray-500">Đang tải...</div>
            ) : items.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">Chưa có thông báo</div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => goItem(n)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${
                      n.read ? 'bg-white' : 'bg-blue-50/40'
                    }`}
                  >
                    <div
                      className={`text-sm ${
                        n.read ? 'text-gray-800' : 'text-blue-800 font-medium'
                      }`}
                    >
                      {n.title || 'Thông báo'}
                    </div>
                    {(n.message || n.content) && (
                      <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {n.message || n.content}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-400 mt-1">
                      {n.createdAt
                        ? new Date(n.createdAt).toLocaleString('vi-VN')
                        : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-2 border-t">
            <button
              onClick={goAll}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}