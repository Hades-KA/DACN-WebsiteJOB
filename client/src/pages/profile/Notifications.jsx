import React, { useEffect, useState } from 'react';
import { notificationService } from '../../services/api';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink, Sparkles } from 'lucide-react';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications({ limit: 100, page: 1 });
      const list = res?.data?.data || res?.data || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Load notifications failed:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    try {
      setMarking(true);
      await notificationService.markAllAsRead();
      load();
    } catch (err) {
      console.error('Mark all failed:', err);
    } finally { 
      setMarking(false); 
    }
  };

  const markOne = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Mark one failed:', err);
    }
  };

  const unreadCount = items.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <Bell className="w-6 h-6" />
              </div>
              Thông báo việc làm
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {unreadCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  {unreadCount} thông báo chưa đọc
                </span>
              ) : (
                <span className="text-gray-500">Tất cả thông báo đã được đọc</span>
              )}
            </p>
          </div>
          <button
            onClick={markAll}
            disabled={marking || unreadCount === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-blue-200 bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
          >
            <CheckCheck className="w-4 h-4" />
            {marking ? 'Đang cập nhật...' : 'Đánh dấu tất cả đã đọc'}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 mb-4">
              <Sparkles className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-xl font-semibold text-gray-900">Chưa có thông báo</p>
            <p className="text-sm text-gray-500 mt-2">Các thông báo về việc làm sẽ hiển thị tại đây</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {items.map((n) => (
            <div 
              key={n.id} 
              className={`group p-6 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 transition-all duration-200 ${
                !n.read ? 'bg-blue-50/30 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                    )}
                    <div className="flex-1">
                      <div className={`font-semibold text-base ${n.read ? 'text-gray-700' : 'text-blue-900'}`}>
                        {n.title || 'Thông báo'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {n.message || n.content || 'Không có nội dung'}
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="text-xs text-gray-400">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : ''}
                        </div>
                        {n.jobId && (
                          <Link 
                            to={`/jobs/${n.jobId}`} 
                            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium group-hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Xem công việc
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markOne(n.id)}
                    className="flex-shrink-0 px-4 py-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all hover:shadow-md"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}