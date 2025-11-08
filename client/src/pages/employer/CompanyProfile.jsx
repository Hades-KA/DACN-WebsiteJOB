// client/src/pages/employer/CompanyProfile.jsx
import React, { useEffect, useState } from 'react';
import api, { companyService } from '../../services/api';

const readUser = () => { try { return JSON.parse(localStorage.getItem('user')||'null'); } catch { return null; } };

export default function CompanyProfile() {
  const [me, setMe] = useState(readUser());
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get('/auth/me');
        const u = r.data?.user || r.data || me;
        setMe(u);
        const res = await companyService.getCompanyById(u.id);
        setData(res.data?.data || res.data);
      } catch {
        const u = readUser();
        setMe(u);
        if (u?.id) {
          const res = await companyService.getCompanyById(u.id);
          setData(res.data?.data || res.data);
        }
      }
    };
    load();
  }, []);

  const onChange = (e) => setData({ ...data, [e.target.name]: e.target.value });

  const save = async () => {
    try {
      setSaving(true);
      await companyService.updateCompany(me.id, {
        company: data.company,
        companyWebsite: data.companyWebsite,
        companySize: data.companySize,
        industry: data.industry,
        taxCode: data.taxCode,
        businessLicense: data.businessLicense,
        companyCity: data.companyCity,
        companyAddress: data.companyAddress,
        logoUrl: data.logoUrl,
        companyAbout: data.companyAbout,
        phone: data.phone,
        email: data.email,
        name: data.name,
      });
      setEditing(false);
    } catch (e) {
      alert(e?.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <div className="p-4 bg-white rounded-lg shadow-sm ring-1 ring-black/5">Đang tải hồ sơ công ty...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">Hồ Sơ Công Ty</div>
          <div className="text-sm text-gray-500 mt-1">Thông tin cơ bản • Liên hệ • Thông tin khác</div>
        </div>
        {!editing ? (
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md" onClick={()=>setEditing(true)}>Chỉnh sửa</button>
        ) : (
          <div className="flex gap-2">
            <button className="px-3 py-2 border rounded-md" onClick={()=>setEditing(false)}>Hủy</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded-md" onClick={save} disabled={saving}>
              {saving?'Đang lưu...':'Lưu'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Thông tin cơ bản">
          <Field label="Tên công ty"      name="company"        value={data.company}        editing={editing} onChange={onChange}/>
          <Field label="Website"          name="companyWebsite" value={data.companyWebsite} editing={editing} onChange={onChange}/>
          <Field label="Quy mô (size)"    name="companySize"    value={data.companySize}    editing={editing} onChange={onChange} placeholder="1-10 / 11-50 / 51-200 / 200+"/>
          <Field label="Lĩnh vực"         name="industry"       value={data.industry}       editing={editing} onChange={onChange}/>
          <Field label="Mã số thuế"       name="taxCode"        value={data.taxCode}        editing={editing} onChange={onChange}/>
          <Field label="Giấy phép KD"     name="businessLicense"value={data.businessLicense}editing={editing} onChange={onChange}/>
        </Section>

        <Section title="Thông tin liên hệ">
          <Field label="Tỉnh/Thành phố"  name="companyCity"    value={data.companyCity}    editing={editing} onChange={onChange}/>
          <Field label="Địa chỉ"          name="companyAddress" value={data.companyAddress} editing={editing} onChange={onChange}/>
          <Field label="Điện thoại"       name="phone"          value={data.phone}          editing={editing} onChange={onChange}/>
          <Field label="Email"            name="email"          value={data.email}          editing={editing} onChange={onChange}/>
          <Field label="Logo (URL)"       name="logoUrl"        value={data.logoUrl}        editing={editing} onChange={onChange} placeholder="https://..."/>
        </Section>
      </div>

      <Section title="Mô tả công ty">
        <Textarea name="companyAbout" value={data.companyAbout || ''} editing={editing} onChange={onChange} placeholder="Mô tả ngắn về công ty, văn hóa, sản phẩm..." />
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-gray-50 rounded-md p-4 ring-1 ring-black/5">
      <div className="font-semibold mb-3">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, name, value, editing, onChange, placeholder }) {
  return (
    <div className="flex flex-col">
      <label className="text-sm text-gray-600 mb-1">{label}</label>
      {!editing ? (
        <div className="text-gray-900">{value || '—'}</div>
      ) : (
        <input
          className="px-3 py-2 border rounded-md"
          name={name}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function Textarea({ name, value, editing, onChange, placeholder }) {
  return (
    <div className="flex flex-col">
      {!editing ? (
        <div className="text-gray-900 whitespace-pre-wrap">{value || '—'}</div>
      ) : (
        <textarea
          className="px-3 py-2 border rounded-md min-h-[120px]"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}