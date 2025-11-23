// src/components/NotificationBell.jsx
import React, { useEffect, useRef, useState } from 'react';
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

  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications({ limit: 10, page: 1 });
      const list = res?.data?.data || res?.data || [];
      const arr = Array.isArray(list) ? list : [];
      setItems(arr);
      setUnread(arr.filter(n => !n.read).length);
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
  }, []);

  useOnClickOutside(ref, () => setOpen(false));

  const onIconClick = () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    setOpen(o => !o);
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
    navigate('/profile/notifications');
  };

  const goItem = (n) => {
    setOpen(false);
    if (n?.jobId) navigate(`/jobs/${n.jobId}`);
    else navigate('/profile/notifications');
  };

  // Optional: ẩn chuông nếu không đăng nhập hoặc không phải candidate
  const raw = localStorage.getItem('user');
  let userType = null;
  try { userType = raw ? JSON.parse(raw).userType : null; } catch {}
  const token = localStorage.getItem('token');
  if (!token || (userType && userType !== 'candidate' && userType !== 'admin')) {
    // Nếu chỉ muốn hiện cho candidate, giữ điều kiện trên; nếu muốn ai login cũng thấy, hãy return null ở đây
    // return null;
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={onIconClick}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 text-gray-700"
        title="Thông báo"
      >
        {unread > 0 ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
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
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${n.read ? 'bg-white' : 'bg-blue-50/40'}`}
                  >
                    <div className={`text-sm ${n.read ? 'text-gray-800' : 'text-blue-800 font-medium'}`}>
                      {n.title || 'Thông báo'}
                    </div>
                    {(n.message || n.content) && (
                      <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {n.message || n.content}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-400 mt-1">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : ''}
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