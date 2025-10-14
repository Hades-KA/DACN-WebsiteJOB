import React, { useEffect, useState } from 'react';

export default function AdminHome() {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    const t = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt');
    fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:5001'}/api/admin/health`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      credentials: 'include',
      cache: 'no-store'
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.message || `HTTP ${r.status}`);
        setState({ loading: false, data: json, error: null });
      })
      .catch((e) => setState({ loading: false, data: null, error: e.message }));
  }, []);

  if (state.loading) return <div className="p-6">Đang kiểm tra quyền Admin...</div>;
  if (state.error) return <div className="p-6 text-red-600">Lỗi: {state.error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Admin</h1>
      <p className="text-gray-700">Guard hoạt động. Phản hồi:</p>
      <pre className="mt-3 p-3 bg-gray-100 rounded text-sm overflow-auto">{JSON.stringify(state.data, null, 2)}</pre>
    </div>
  );
}
