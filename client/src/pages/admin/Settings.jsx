import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/api';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [form, setForm] = useState({
    general: { siteName: '', logoUrl: '', faviconUrl: '' },
    smtp: { host: '', port: 587, user: '', pass: '', fromEmail: '' },
    oauth: { googleClientId: '', googleClientSecret: '', linkedinClientId: '', linkedinClientSecret: '' },
    seo: { defaultTitle: '', defaultDescription: '', analyticsId: '' },
    security: { requireApprovalForJobs: true, admin2FA: false },
  });
  const [tab, setTab] = useState('general');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getSettings();
      setForm({ ...form, ...res.data.data });
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      setOk('');
      setError('');
      await adminService.saveSettings(form);
      setOk('Đã lưu cài đặt');
    } catch (e) {
      setError(e?.response?.data?.message || 'Lưu cài đặt thất bại');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Field = ({ label, children }) => (
    <label className="block mb-3">
      <div className="text-sm text-gray-700 mb-1">{label}</div>
      {children}
    </label>
  );

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Cài đặt</h1>

      <div className="mb-3 flex gap-2">
        {['general','smtp','oauth','seo','security'].map(t => (
          <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded border ${tab===t?'bg-gray-200 font-semibold':''}`}>{
            t==='general'?'Chung': t==='smtp'?'Email (SMTP)': t==='oauth'?'Đăng nhập (OAuth)': t==='seo'?'SEO/Giao diện': 'Bảo mật'
          }</button>
        ))}
      </div>

      {loading && <div className="mb-3">Đang tải...</div>}
      {error && <div className="mb-3 text-red-600">{error}</div>}
      {ok && <div className="mb-3 text-green-700">{ok}</div>}

      {/* General */}
      {tab==='general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tên website">
            <input className="border rounded px-3 py-2 w-full" value={form.general.siteName}
                   onChange={e=>setForm(f=>({...f, general:{...f.general, siteName:e.target.value}}))}/>
          </Field>
          <Field label="Logo URL">
            <input className="border rounded px-3 py-2 w-full" value={form.general.logoUrl}
                   onChange={e=>setForm(f=>({...f, general:{...f.general, logoUrl:e.target.value}}))}/>
          </Field>
          <Field label="Favicon URL">
            <input className="border rounded px-3 py-2 w-full" value={form.general.faviconUrl}
                   onChange={e=>setForm(f=>({...f, general:{...f.general, faviconUrl:e.target.value}}))}/>
          </Field>
        </div>
      )}

      {/* SMTP */}
      {tab==='smtp' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="SMTP Host">
            <input className="border rounded px-3 py-2 w-full" value={form.smtp.host}
                   onChange={e=>setForm(f=>({...f, smtp:{...f.smtp, host:e.target.value}}))}/>
          </Field>
          <Field label="SMTP Port">
            <input type="number" className="border rounded px-3 py-2 w-full" value={form.smtp.port}
                   onChange={e=>setForm(f=>({...f, smtp:{...f.smtp, port:parseInt(e.target.value)||0}}))}/>
          </Field>
          <Field label="Từ email (From)">
            <input className="border rounded px-3 py-2 w-full" value={form.smtp.fromEmail}
                   onChange={e=>setForm(f=>({...f, smtp:{...f.smtp, fromEmail:e.target.value}}))}/>
          </Field>
          <Field label="SMTP User">
            <input className="border rounded px-3 py-2 w-full" value={form.smtp.user}
                   onChange={e=>setForm(f=>({...f, smtp:{...f.smtp, user:e.target.value}}))}/>
          </Field>
          <Field label="SMTP Password">
            <input type="password" className="border rounded px-3 py-2 w-full" value={form.smtp.pass}
                   onChange={e=>setForm(f=>({...f, smtp:{...f.smtp, pass:e.target.value}}))}/>
          </Field>
        </div>
      )}

      {/* OAuth */}
      {tab==='oauth' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Google Client ID">
            <input className="border rounded px-3 py-2 w-full" value={form.oauth.googleClientId}
                   onChange={e=>setForm(f=>({...f, oauth:{...f.oauth, googleClientId:e.target.value}}))}/>
          </Field>
          <Field label="Google Client Secret">
            <input className="border rounded px-3 py-2 w-full" value={form.oauth.googleClientSecret}
                   onChange={e=>setForm(f=>({...f, oauth:{...f.oauth, googleClientSecret:e.target.value}}))}/>
          </Field>
          <Field label="LinkedIn Client ID">
            <input className="border rounded px-3 py-2 w-full" value={form.oauth.linkedinClientId}
                   onChange={e=>setForm(f=>({...f, oauth:{...f.oauth, linkedinClientId:e.target.value}}))}/>
          </Field>
          <Field label="LinkedIn Client Secret">
            <input className="border rounded px-3 py-2 w-full" value={form.oauth.linkedinClientSecret}
                   onChange={e=>setForm(f=>({...f, oauth:{...f.oauth, linkedinClientSecret:e.target.value}}))}/>
          </Field>
        </div>
      )}

      {/* SEO/UI */}
      {tab==='seo' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tiêu đề mặc định">
            <input className="border rounded px-3 py-2 w-full" value={form.seo.defaultTitle}
                   onChange={e=>setForm(f=>({...f, seo:{...f.seo, defaultTitle:e.target.value}}))}/>
          </Field>
          <Field label="Mô tả mặc định">
            <input className="border rounded px-3 py-2 w-full" value={form.seo.defaultDescription}
                   onChange={e=>setForm(f=>({...f, seo:{...f.seo, defaultDescription:e.target.value}}))}/>
          </Field>
          <Field label="Analytics ID">
            <input className="border rounded px-3 py-2 w-full" value={form.seo.analyticsId}
                   onChange={e=>setForm(f=>({...f, seo:{...f.seo, analyticsId:e.target.value}}))}/>
          </Field>
        </div>
      )}

      {/* Security */}
      {tab==='security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Duyệt job thủ công">
            <input type="checkbox" checked={!!form.security.requireApprovalForJobs}
                   onChange={e=>setForm(f=>({...f, security:{...f.security, requireApprovalForJobs:e.target.checked}}))}/>
          </Field>
          <Field label="Bật 2FA cho admin (khung sẵn)">
            <input type="checkbox" checked={!!form.security.admin2FA}
                   onChange={e=>setForm(f=>({...f, security:{...f.security, admin2FA:e.target.checked}}))}/>
          </Field>
        </div>
      )}

      <div className="mt-6">
        <button onClick={save} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {saving? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </div>
    </div>
  );
}
