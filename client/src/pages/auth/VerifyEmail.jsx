import React, { useEffect, useMemo, useState } from 'react';
import { authService } from '../../services/api';
import { toast } from 'react-toastify';

export default function VerifyEmail() {
  const token = useMemo(() => new URLSearchParams(location.search).get('token') || '', []);
  const [msg, setMsg] = useState('Đang xác thực...');
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      if (!token) { setMsg('Thiếu token'); return; }
      try {
        const res = await authService.verifyEmail(token);
        setMsg(res?.data?.message || 'Xác thực email thành công');
      } catch (e) {
        setMsg(e?.response?.data?.message || 'Token không hợp lệ hoặc đã dùng');
      }
    })();
  }, [token]);

  const resend = async () => {
    if (!email) return toast.error('Nhập email');
    try {
      const res = await authService.resendVerification(email);
      toast.success(res?.data?.message || 'Đã gửi lại email xác thực');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gửi lại thất bại');
    }
  };

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="w-full max-w-md p-6 rounded-xl border bg-white space-y-4 text-center">
        <h1 className="text-lg font-semibold">Xác thực email</h1>
        <div className="text-slate-700">{msg}</div>
        <div className="pt-2">
          <div className="text-sm text-slate-500 mb-2">Chưa nhận được email?</div>
          <div className="flex gap-2">
            <input
              className="flex-1 h-10 px-3 rounded-md border"
              placeholder="Nhập email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={resend} className="h-10 px-3 rounded-md bg-blue-600 text-white">Gửi lại</button>
          </div>
        </div>
      </div>
    </div>
  );
}