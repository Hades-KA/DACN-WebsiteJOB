import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

const PROVINCES = [
  'Hà Nội','Hồ Chí Minh','Đà Nẵng','Hải Phòng','Cần Thơ','An Giang','Bà Rịa Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Dương','Bình Định','Bình Phước','Bình Thuận','Cà Mau','Cao Bằng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Tĩnh','Hải Dương','Hậu Giang','Hòa Bình','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'
];
const LEVELS = ['Mới tốt nghiệp','Thực tập','Fresher','Junior','Middle','Senior','Lead','Manager'];
const WORK_TYPES = ['Toàn thời gian','Bán thời gian','Remote','Hợp đồng'];
const DEGREES = ['THPT','Trung cấp','Cao đẳng','Đại học','Thạc sĩ','Tiến sĩ'];
const INDUSTRIES = ['Công nghệ thông tin','Tài chính - Ngân hàng','Thương mại điện tử','Sản xuất','Dịch vụ'];
const CATEGORIES = ['Frontend','Backend','Fullstack','UI/UX','QA/Tester','BA','Data'];
const EXPERIENCES = ['Chưa có','0-1 năm','1-3 năm','3-5 năm','5+ năm'];

const colCls = { 12: 'md:col-span-12', 6: 'md:col-span-6' };

export default function ProfileBasicModal({ open, onClose, onSave, initial }) {
  const user = useMemo(() => {
    try { const raw = localStorage.getItem('user'); return raw && raw !== 'undefined' && raw !== 'null' ? JSON.parse(raw) : {}; }
    catch { return {}; }
  }, []);

  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    title: '',
    level: '',
    workType: '',
    degree: '',
    industry: '',
    category: '',
    experience: '',
    salary: '',
    location: '',
    email: '',
    phone: '',
    birthdate: '',
    address: '',
    gender: '',
    maritalStatus: '',
  });

  useEffect(() => {
    if (!open) return;
    setValues(v => ({
      ...v,
      ...(initial || {}),
      email: (initial?.email ?? '') || user?.email || '',
    }));
  }, [open, initial, user?.email]);

  if (!open) return null;

  const set = (k, v) => setValues(s => ({ ...s, [k]: v }));
  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try {
      if (typeof onSave === 'function') await onSave(values);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 overflow-y-auto">
        <form noValidate onSubmit={handleSubmit} className="relative w-full max-w-[920px] rounded-2xl bg-white shadow-2xl border border-gray-200">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-semibold">
                {(user?.name || user?.email || 'U').slice(0,1).toUpperCase()}
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">Thông Tin Cơ Bản</h3>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[72vh] overflow-y-auto">
            <div className="grid grid-cols-12 gap-4">
              <Field col={6} label="Họ"><Input value={values.firstName} onChange={(e)=>set('firstName', e.target.value)} placeholder="Nhập họ" /></Field>
              <Field col={6} label="Tên"><Input value={values.lastName} onChange={(e)=>set('lastName', e.target.value)} placeholder="Nhập tên" /></Field>
            </div>

            <Divider />

            <div className="grid grid-cols-12 gap-4">
              <Field col={6} label="Chức danh"><Input value={values.title} onChange={(e)=>set('title', e.target.value)} placeholder="VD: Frontend Developer" /></Field>
              <Field col={6} label="Cấp bậc hiện tại"><Select value={values.level} onChange={(e)=>set('level', e.target.value)} options={LEVELS} /></Field>
              <Field col={6} label="Hình thức làm việc"><Select value={values.workType} onChange={(e)=>set('workType', e.target.value)} options={WORK_TYPES} /></Field>
              <Field col={6} label="Bằng cấp cao nhất"><Select value={values.degree} onChange={(e)=>set('degree', e.target.value)} options={DEGREES} /></Field>
              <Field col={6} label="Lĩnh vực"><Select value={values.industry} onChange={(e)=>set('industry', e.target.value)} options={INDUSTRIES} /></Field>
              <Field col={6} label="Ngành nghề"><Select value={values.category} onChange={(e)=>set('category', e.target.value)} options={CATEGORIES} /></Field>
              <Field col={6} label="Kinh nghiệm làm việc"><Select value={values.experience} onChange={(e)=>set('experience', e.target.value)} options={EXPERIENCES} /></Field>
              <Field col={6} label="Mức lương mong muốn">
                <div className="relative">
                  <Input type="number" value={values.salary} onChange={(e)=>set('salary', e.target.value)} placeholder="VD: 15000000" className="pr-12" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">VND</span>
                </div>
              </Field>
            </div>

            <Divider />

            <div className="grid grid-cols-12 gap-4">
              <Field col={6} label="Tỉnh/Thành phố"><Select value={values.location} onChange={(e)=>set('location', e.target.value)} options={PROVINCES} /></Field>
              <Field col={6} label="Ngày sinh"><Input type="date" value={values.birthdate} onChange={(e)=>set('birthdate', e.target.value)} /></Field>
              <Field col={6} label="Email"><Input value={values.email} onChange={(e)=>set('email', e.target.value)} placeholder="Email" /></Field>
              <Field col={6} label="Số điện thoại"><Input value={values.phone} onChange={(e)=>set('phone', e.target.value)} placeholder="Số điện thoại" /></Field>
              <Field col={12} label="Địa chỉ"><Input value={values.address} onChange={(e)=>set('address', e.target.value)} placeholder="Số nhà, đường, phường/xã..." /></Field>
            </div>

            <Divider />

            <div className="grid grid-cols-12 gap-4">
              <Field col={6} label="Giới tính">
                <ChipGroup value={values.gender} onChange={(v)=>set('gender', v)} items={[
                  { label: 'Nam', value: 'male' },
                  { label: 'Nữ', value: 'female' },
                ]}/>
              </Field>
              <Field col={6} label="Tình trạng hôn nhân">
                <ChipGroup value={values.maritalStatus} onChange={(v)=>set('maritalStatus', v)} items={[
                  { label: 'Độc thân', value: 'single' },
                  { label: 'Đã kết hôn', value: 'married' },
                ]}/>
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 z-10 bg-white/90 backdrop-blur px-6 py-4 border-t flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Hủy</button>
            <button type="button" onClick={handleSubmit} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* sub components */
function Field({ col = 12, label, required, children }) {
  return (
    <div className={`col-span-12 ${colCls[col] || ''}`}>
      <label className="block text-[13px] font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
function Input({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-[14px]
                 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    />
  );
}
function Select({ options = [], ...props }) {
  return (
    <select
      {...props}
      className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-[14px]
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">— Chọn —</option>
      {options.map((op) => (
        <option key={op} value={op}>{op}</option>
      ))}
    </select>
  );
}
function ChipGroup({ value, onChange, items }) {
  return (
    <div className="flex items-center gap-2">
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(active ? '' : it.value)}
            className={`px-3 py-1.5 rounded-md border text-sm transition
                        ${active ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
function Divider() { return <div className="my-5 h-px bg-gray-100" />; }