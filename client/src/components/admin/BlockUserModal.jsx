import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function BlockUserModal({ user, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do khóa tài khoản');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      console.error('Block user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickReasons = [
    'Vi phạm chính sách',
    'Spam',
    'Thông tin giả mạo',
    'Hành vi lừa đảo',
    'Yêu cầu của người dùng'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Khóa tài khoản
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800">
                <strong>Người dùng:</strong> {user?.name || 'N/A'}
              </p>
              <p className="text-sm text-orange-700 mt-1">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lý do khóa <span className="text-red-500">*</span>
            </label>
            
            <div className="mb-2 flex flex-wrap gap-2">
              {quickReasons.map((qr, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(qr)}
                  className="px-3 py-1 text-xs rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  {qr}
                </button>
              ))}
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do khóa tài khoản..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Lý do này sẽ được ghi lại trong hệ thống
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận khóa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}