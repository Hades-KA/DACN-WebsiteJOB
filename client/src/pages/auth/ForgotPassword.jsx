import React, { useState } from 'react';
import { authService } from '../../services/api';
import { toast } from 'react-toastify';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Nhập email');
    setSending(true);
    try {
      await authService.forgotPassword(email);
      toast.success('Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.');
    } catch (e2) {
      toast.error(e2?.response?.data?.message || 'Gửi email thất bại');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-md p-6 rounded-xl border bg-white space-y-4">
        <h1 className="text-lg font-semibold">Quên mật khẩu</h1>
        <input
          className="w-full h-10 px-3 rounded-md border"
          placeholder="Nhập email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button disabled={sending} className="w-full h-10 rounded-md bg-blue-600 text-white">
          {sending ? 'Đang gửi...' : 'Gửi hướng dẫn đặt lại'}
        </button>
      </form>
    </div>
  );
}