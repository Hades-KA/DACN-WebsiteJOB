import React, { useMemo, useState } from 'react';
import { authService } from '../../services/api';
import { toast } from 'react-toastify';

export default function ResetPassword() {
  const token = useMemo(() => new URLSearchParams(location.search).get('token') || '', []);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Thiếu token');
    if (!password || password.length < 6) return toast.error('Mật khẩu tối thiểu 6 ký tự');
    setSaving(true);
    try {
      await authService.resetPassword(token, password);
      toast.success('Đặt lại mật khẩu thành công');
    } catch (e2) {
      toast.error(e2?.response?.data?.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-md p-6 rounded-xl border bg-white space-y-4">
        <h1 className="text-lg font-semibold">Đặt lại mật khẩu</h1>
        <input
          type="password"
          className="w-full h-10 px-3 rounded-md border"
          placeholder="Mật khẩu mới"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button disabled={saving} className="w-full h-10 rounded-md bg-blue-600 text-white">
          {saving ? 'Đang lưu...' : 'Xác nhận'}
        </button>
      </form>
    </div>
  );
}