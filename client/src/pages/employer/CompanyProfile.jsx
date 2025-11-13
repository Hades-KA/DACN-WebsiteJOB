// client/src/pages/employer/CompanyProfile.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api, { companyService, userService } from '../../services/api';

const readUser = () => { try { return JSON.parse(localStorage.getItem('user')||'null'); } catch { return null; } };
function cx(...args) { return args.filter(Boolean).join(' '); }

// ===== Helpers =====
const pickFirst = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '');
const pullCompanyId = (u) => {
  if (!u) return null;
  return pickFirst(
    u.companyId, u.companyID,
    u.company?.id,
    u.employer?.companyId,
    u.profile?.companyId,
    // nhiều đồ án map trùng userId = companyId:
    u.userId, u.id, u.accountId, u.uid
  );
};
const getPhoneFromUser = (u) => pickFirst(u?.phone, u?.phoneNumber, u?.mobile, u?.tel, u?.contactPhone, u?.profile?.phone);
const getEmailFromUser = (u) => pickFirst(u?.email, u?.profile?.email);

const tryGetCompanyById = async (id) => {
  if (!id) return null;
  try {
    const res = await companyService.getCompanyById(id);
    const c = res.data?.data || res.data;
    if (c && (c.id || c.companyId || c.name || c.company)) return c;
  } catch (_) {}
  return null;
};
const tryListCompanies = async (params) => {
  try {
    const r = await companyService.getCompanies(params);
    const list = r.data?.data || r.data?.items || r.data;
    if (Array.isArray(list) && list.length) return list;
  } catch (_) {}
  return null;
};
const findCompanyForUser = async (u) => {
  if (!u) return { company: null, companyId: null };
  const candidates = [pullCompanyId(u)].filter(Boolean);
  const more = [u.company?.id, u.userId, u.id, u.accountId, u.uid].filter(Boolean);
  for (const x of more) if (!candidates.includes(x)) candidates.push(x);
  for (const id of candidates) {
    const c = await tryGetCompanyById(id);
    if (c) return { company: c, companyId: c.id || id };
  }
  const queryTrials = [
    u.id ? { userId: u.id } : null,
    u.id ? { ownerId: u.id } : null,
    u.id ? { createdBy: u.id } : null,
    u.id ? { employerId: u.id } : null,
    u.email ? { email: u.email } : null,
    { mine: true },
    { limit: 1 }
  ].filter(Boolean);
  for (const q of queryTrials) {
    const list = await tryListCompanies(q);
    if (list && list[0]) return { company: list[0], companyId: list[0].id };
  }
  return { company: null, companyId: null };
};

export default function CompanyProfile() {
  const [me, setMe] = useState(readUser() || {});
  const [data, setData] = useState(null);

  const [activeTab, setActiveTab] = useState('basic'); // basic | contact | stats
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  // stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [loadError, setLoadError] = useState('');

  const companyId = useMemo(() => pullCompanyId(me), [me]);

  useEffect(() => {
    const load = async () => {
      setLoadError('');
      try {
        // 1) /auth/me
        let u = null;
        try {
          const r = await api.get('/auth/me');
          u = r.data?.user || r.data || null;
        } catch (_) {
          u = readUser();
        }
        // 2) /users/profile (để chắc có phone/email)
        let profile = null;
        try {
          const r2 = await userService.getProfile();
          profile = r2.data?.data || r2.data || null;
        } catch (_) {}

        const merged = { ...(readUser()||{}), ...(u||{}), ...(profile||{}) };
        setMe(merged);
        try { localStorage.setItem('user', JSON.stringify(merged)); } catch {}

        // 3) Tìm công ty
        const { company, companyId: cid } = await findCompanyForUser(merged);
        if (!cid || !company) {
          setLoadError('Không tìm thấy companyId/hồ sơ công ty từ thông tin tài khoản. Vui lòng kiểm tra mapping user → company hoặc tạo hồ sơ công ty trước.');
          setData({});
          return;
        }
        setMe(prev => ({ ...(prev || {}), companyId: cid }));
        setData(company);
      } catch (e) {
        console.error('Load company profile failed:', e);
        setLoadError(e?.response?.data?.message || 'Không tải được hồ sơ công ty.');
        setData({});
      }
    };
    load();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!companyId || stats || statsLoading) return;
      setStatsLoading(true);
      setStatsError('');
      try {
        const s = await companyService.getCompanyStats(companyId);
        setStats(s.data?.data || s.data);
      } catch (e) {
        setStatsError(e?.response?.data?.message || 'Chưa có dữ liệu thống kê hoặc API chưa triển khai');
      } finally {
        setStatsLoading(false);
      }
    };
    if (activeTab === 'stats') fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, companyId]);

  // onChange cho company
  const onChange = (e) => setData({ ...data, [e.target.name]: e.target.value });
  // onChange cho user (phone/email)
  const onChangeUser = (e) => setMe(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const uploadLogoFile = async (file) => {
    if (!file || !companyId) {
      if (!companyId) alert('Chưa xác định được companyId.');
      return;
    }
    try {
      setLogoLoading(true);
      const res = await companyService.uploadLogo(companyId, file);
      const url = res.data?.data?.logoUrl;
      if (url) setData(prev => ({ ...prev, logoUrl: url }));
    } catch (e) {
      alert(e?.response?.data?.message || 'Upload logo thất bại');
    } finally {
      setLogoLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    try {
      const r = await userService.getProfile();
      const profile = r.data?.data || r.data || null;
      if (profile) {
        const merged = { ...(me||{}), ...profile };
        setMe(merged);
        try { localStorage.setItem('user', JSON.stringify(merged)); } catch {}
      }
    } catch {}
  };

  const save = async () => {
    if (!companyId) {
      alert('Không có companyId nên không thể lưu.');
      return;
    }
    try {
      setSaving(true);

      // 1) Lưu thông tin công ty
      await companyService.updateCompany(companyId, {
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
      });

      // 2) Lưu phone/email của user
      const phoneVal = getPhoneFromUser(me);
      const emailVal = getEmailFromUser(me);
      const payloadUser = {};
      if (phoneVal !== undefined) payloadUser.phone = phoneVal;      // BE của bạn dùng "phone"
      if (emailVal !== undefined) payloadUser.email = emailVal;
      // gửi kèm alias nếu backend dùng tên khác
      payloadUser.phoneNumber = phoneVal;
      payloadUser.mobile = phoneVal;

      try {
        await userService.updateProfile(payloadUser);
      } catch (e) {
        console.warn('Cập nhật user profile (phone/email) lỗi:', e?.response?.data || e.message);
      }

      await refreshUserProfile();

      setEditing(false);
      if (activeTab === 'stats') {
        try {
          const s = await companyService.getCompanyStats(companyId);
          setStats(s.data?.data || s.data);
        } catch {}
      }
    } catch (e) {
      alert(e?.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return <div className="p-4 bg-white rounded-lg shadow-sm ring-1 ring-black/5">Đang tải hồ sơ công ty...</div>;
  }

  const displayPhone = getPhoneFromUser(me) ?? data.phone;  // Ưu tiên user.phone
  const displayEmail = getEmailFromUser(me) ?? data.email;

  return (
    <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl font-bold">Hồ Sơ Công Ty</div>
        {!editing ? (
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={()=>setEditing(true)}>Chỉnh sửa</button>
        ) : (
          <div className="flex gap-2">
            <button className="px-3 py-2 border rounded-md hover:bg-gray-50" onClick={()=>setEditing(false)}>Hủy</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60" onClick={save} disabled={saving}>
              {saving?'Đang lưu...':'Lưu'}
            </button>
          </div>
        )}
      </div>

      {loadError && (
        <div className="mb-3 p-3 rounded border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm">
          {loadError}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-2">
        <div className="flex items-center gap-8 text-sm border-b">
          {[
            { key: 'basic',   label: 'Thông tin cơ bản' },
            { key: 'contact', label: 'Thông tin liên hệ' },
            { key: 'stats',   label: 'Thống kê' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cx(
                "relative pb-2 -mb-px border-b-2 transition-colors",
                activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nội dung */}
      <div className="mt-4">
        {activeTab === 'basic' && (
          <InfoTable>
            <Row label="Tên công ty" labelRight="Số điện thoại">
              <CellValue>
                <InputOrText name="company" value={data.company} editing={editing} onChange={onChange} />
              </CellValue>
              <CellValue dividerLeft>
                <InputOrText name="phone" value={editing ? (getPhoneFromUser(me) ?? '') : (displayPhone || '')} editing={editing} onChange={onChangeUser} />
              </CellValue>
            </Row>

            <Row label="Tỉnh/Thành phố" labelRight="Địa chỉ">
              <CellValue>
                <InputOrText name="companyCity" value={data.companyCity} editing={editing} onChange={onChange} />
              </CellValue>
              <CellValue dividerLeft>
                <InputOrText name="companyAddress" value={data.companyAddress} editing={editing} onChange={onChange} />
              </CellValue>
            </Row>

            <Row label="Website" labelRight="Quy mô">
              <CellValue>
                <InputOrText type="link" name="companyWebsite" value={data.companyWebsite} editing={editing} onChange={onChange} placeholder="https://..." />
              </CellValue>
              <CellValue dividerLeft>
                <InputOrText name="companySize" value={data.companySize} editing={editing} onChange={onChange} placeholder="100+, 51-200..." />
              </CellValue>
            </Row>

            <Row label="Mã số thuế" labelRight="Lĩnh vực">
              <CellValue>
                <InputOrText name="taxCode" value={data.taxCode} editing={editing} onChange={onChange} />
              </CellValue>
              <CellValue dividerLeft>
                <InputOrText name="industry" value={data.industry} editing={editing} onChange={onChange} />
              </CellValue>
            </Row>

            <Row label="Giấy phép kinh doanh" labelRight="Logo công ty">
              <CellValue>
                <InputOrText name="businessLicense" value={data.businessLicense} editing={editing} onChange={onChange} />
              </CellValue>

              <CellValue dividerLeft>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded bg-white ring-1 ring-gray-200 overflow-hidden flex items-center justify-center">
                    {data.logoUrl
                      ? <img src={data.logoUrl} alt="logo" className="h-full w-full object-contain" />
                      : <span className="text-xs text-gray-500">No logo</span>}
                  </div>
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="hidden"
                        id="upload-logo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => uploadLogoFile(e.target.files?.[0])}
                      />
                      <label htmlFor="upload-logo" className="px-3 py-2 border rounded-md bg-white hover:bg-gray-50 cursor-pointer">
                        {logoLoading ? 'Đang tải...' : 'Tải logo'}
                      </label>
                      <input
                        className="min-w-[220px] px-3 py-2 border rounded-md"
                        name="logoUrl"
                        value={data.logoUrl || ''}
                        onChange={onChange}
                        placeholder="https://... hoặc /uploads/logos/..."
                      />
                    </div>
                  ) : null}
                </div>
              </CellValue>
            </Row>

            <tr className="align-top">
              <th className="w-[22%] bg-gray-50 text-gray-600 font-medium border px-4 py-3">Mô tả công ty</th>
              <td colSpan={4} className="border px-4 py-3">
                {!editing ? (
                  <DescriptionBox text={data.companyAbout} />
                ) : (
                  <textarea
                    className="w-full px-3 py-2 border rounded-md min-h-[140px]"
                    name="companyAbout"
                    value={data.companyAbout || ''}
                    onChange={onChange}
                    placeholder="Mô tả ngắn về công ty, văn hóa, sản phẩm..."
                  />
                )}
              </td>
            </tr>
          </InfoTable>
        )}

        {activeTab === 'contact' && (
          <InfoTable>
            <Row label="Số điện thoại" labelRight="Email">
              <CellValue>
                <InputOrText name="phone" value={editing ? (getPhoneFromUser(me) ?? '') : (displayPhone || '')} editing={editing} onChange={onChangeUser} />
              </CellValue>
              <CellValue dividerLeft>
                <InputOrText name="email" value={editing ? (getEmailFromUser(me) ?? '') : (displayEmail || '')} editing={editing} onChange={onChangeUser} />
              </CellValue>
            </Row>
            <Row label="Tỉnh/Thành phố" labelRight="Địa chỉ">
              <CellValue>
                <InputOrText name="companyCity" value={data.companyCity} editing={editing} onChange={onChange} />
              </CellValue>
              <CellValue dividerLeft>
                <InputOrText name="companyAddress" value={data.companyAddress} editing={editing} onChange={onChange} />
              </CellValue>
            </Row>
            <Row label="Website">
              <CellValue>
                <InputOrText type="link" name="companyWebsite" value={data.companyWebsite} editing={editing} onChange={onChange} placeholder="https://..." />
              </CellValue>
              {/* Giữ 5 cột để thẳng hàng */}
              <td className="border-y border-gray-200 w-0 p-0 bg-gray-100" />
              <th className="w-[22%] bg-gray-50 text-gray-600 font-medium border px-4 py-3"></th>
              <td className="border px-4 py-3"></td>
            </Row>
          </InfoTable>
        )}

        {activeTab === 'stats' && (
          <>
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[...Array(5)].map((_,i)=>(
                  <div key={i} className="h-[90px] rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : statsError ? (
              <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200 flex items-center justify-between">
                <span>{statsError}</span>
                <button onClick={()=>setActiveTab('stats')} className="px-3 py-1.5 rounded-md bg-yellow-100 hover:bg-yellow-200">
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <KpiCard label="Tổng tin đăng" value={fmt(stats?.cards?.jobsTotal)} color="indigo" icon="briefcase" />
                  <KpiCard label="Đang mở" value={fmt(stats?.cards?.jobsOpen)} color="emerald" icon="bolt" />
                  <KpiCard label="Đã đóng" value={fmt(stats?.cards?.jobsClosed)} color="slate" icon="archive" />
                  <KpiCard label="Lượt xem" value={fmt(stats?.cards?.viewsTotal)} color="sky" icon="eye" />
                  <KpiCard label="Tổng đơn" value={fmt(stats?.cards?.applicationsTotal)} color="amber" icon="inbox" />
                </div>

                {/* Breakdown */}
                <SectionCard title="Phân bố trạng thái đơn" className="mt-4">
                  {stats?.breakdown?.byStatus && Object.keys(stats.breakdown.byStatus).length ? (
                    <div className="space-y-3">
                      {Object.entries(stats.breakdown.byStatus)
                        .sort((a,b)=>b[1]-a[1])
                        .map(([k,v]) => (
                          <StatusBar
                            key={k}
                            label={mapStatus(k)}
                            value={v}
                            total={totalCount(stats.breakdown.byStatus)}
                            color={statusColor(k)}
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Chưa có đơn ứng tuyển nào.</div>
                  )}
                </SectionCard>

                {/* Recent jobs */}
                <SectionCard title="Tin đăng gần đây" className="mt-4">
                  {stats?.recentJobs?.length ? (
                    <ul className="text-sm text-gray-700 divide-y">
                      {stats.recentJobs.map(j => (
                        <li key={j.id} className="flex items-center justify-between py-2">
                          <span className="truncate pr-3">{j.title}</span>
                          <span className="shrink-0 text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600">
                            {j.createdAt ? new Date(j.createdAt).toLocaleDateString('vi-VN') : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-500">Chưa có tin đăng.</div>
                  )}
                  <div className="mt-3 text-right">
                    <a href="/employer/jobs" className="text-sm text-blue-600 hover:underline">Xem tất cả tin</a>
                  </div>
                </SectionCard>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ================= Helpers (UI components) ================= */

function InfoTable({ children }) {
  return (
    <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
      <tbody>{children}</tbody>
    </table>
  );
}

function Row({ label, labelRight, children }) {
  if (labelRight) {
    const [left, right] = React.Children.toArray(children);
    const rightCloned = React.cloneElement(right, {
      dividerLeft: true,
      ...right.props,
    });
    return (
      <tr className="align-top">
        <th className="w-[22%] bg-gray-50 text-gray-600 font-medium border px-4 py-3">{label}</th>
        {left}
        <th className="w-[22%] bg-gray-50 text-gray-600 font-medium border px-4 py-3">{labelRight}</th>
        {rightCloned}
      </tr>
    );
  }
  return (
    <tr className="align-top">
      <th className="w-[22%] bg-gray-50 text-gray-600 font-medium border px-4 py-3">{label}</th>
      {children}
    </tr>
  );
}

function CellValue({ children, dividerLeft = false }) {
  return (
    <td className={cx("border px-4 py-3 align-top", dividerLeft && "border-l-2 border-l-gray-200")}>
      {children}
    </td>
  );
}

function InputOrText({ name, value, editing, onChange, placeholder, type }) {
  if (!editing) {
    if (type === 'link' && value) {
      const href = value.startsWith('http') ? value : `https://${value}`;
      return (
        <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-words">
          {value}
        </a>
      );
    }
    return <div className="text-gray-900 break-words">{value || '—'}</div>;
  }
  return (
    <input
      className="w-full px-3 py-2 border rounded-md"
      name={name}
      value={value ?? ''} // giữ giá trị nếu là '0'
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

function DescriptionBox({ text }) {
  const [expanded, setExpanded] = useState(false);
  const MAX = 260;
  const content = useMemo(() => (expanded || !text ? (text || '—') : (text.length > MAX ? text.slice(0, MAX) + '…' : text)), [expanded, text]);

  return (
    <div className="bg-blue-50 text-gray-800 rounded p-3 leading-relaxed">
      {content}
      {!expanded && text && text.length > MAX && (
        <>
          {' '}
          <button className="text-blue-600 hover:underline font-medium" onClick={() => setExpanded(true)}>
            Xem thêm
          </button>
        </>
      )}
    </div>
  );
}

/* ============ Old simple cards (giữ lại nếu cần dùng nơi khác) ============ */
function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-md p-3 ring-1 ring-black/5">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
function SmallStat({ label, value }) {
  return (
    <div className="bg-white rounded-md p-2 ring-1 ring-black/5 text-center">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-base font-semibold text-gray-900">{value}</div>
    </div>
  );
}

/* ============ Pretty components for Stats ============ */

function SectionCard({ title, children, className }) {
  return (
    <div className={`bg-white ring-1 ring-gray-200/60 rounded-xl p-4 ${className||''}`}>
      {title && <div className="font-semibold text-gray-900 mb-3">{title}</div>}
      {children}
    </div>
  );
}

function KpiCard({ label, value, color='indigo', icon='briefcase', highlight=false }) {
  const palette = {
    indigo: ['from-indigo-50 to-white','text-indigo-700','bg-indigo-100','text-indigo-600'],
    emerald:['from-emerald-50 to-white','text-emerald-700','bg-emerald-100','text-emerald-600'],
    sky:    ['from-sky-50 to-white','text-sky-700','bg-sky-100','text-sky-600'],
    amber:  ['from-amber-50 to-white','text-amber-700','bg-amber-100','text-amber-600'],
    slate:  ['from-slate-50 to-white','text-slate-700','bg-slate-100','text-slate-600'],
    rose:   ['from-rose-50 to-white','text-rose-700','bg-rose-100','text-rose-600'],
  }[color] || ['from-gray-50 to-white','text-gray-700','bg-gray-100','text-gray-600'];

  return (
    <div className={`rounded-xl p-4 ring-1 ring-gray-200/60 bg-gradient-to-br ${palette[0]} transition-transform hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${palette[2]} ${palette[3]}`}>
          {iconSvg(icon)}
        </div>
        {highlight && <span className="text-xs px-2 py-0.5 rounded bg-white/70 text-sky-700 border border-sky-200">Highlight</span>}
      </div>
      <div className="mt-3 text-2xl font-bold text-gray-900">{value}</div>
      <div className={`text-xs mt-1 ${palette[1]}`}>{label}</div>
    </div>
  );
}

function StatusBar({ label, value, total, color='indigo' }) {
  const percent = total ? Math.round((value/total)*100) : 0;
  const colorMap = {
    indigo:'bg-indigo-500', sky:'bg-sky-500', amber:'bg-amber-500',
    emerald:'bg-emerald-500', slate:'bg-slate-500', rose:'bg-rose-500'
  };
  const barColor = colorMap[color] || colorMap.indigo;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-500">{value} ({percent}%)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden ring-1 ring-gray-200/60">
        <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function iconSvg(name) {
  const common = 'w-5 h-5';
  switch (name) {
    case 'briefcase': return (<svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="1.8" d="M9 7V6a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v1M3 9h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/></svg>);
    case 'bolt': return (<svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="1.8" d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/></svg>);
    case 'archive': return (<svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="1.8" d="M4 7h16M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7M9 11h6"/></svg>);
    case 'eye': return (<svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="1.8" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>);
    case 'inbox': return (<svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="1.8" d="M4 13l3-9h10l3 9M4 13h5a3 3 0 0 0 6 0h5M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/></svg>);
    default: return (<svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="1.8"/></svg>);
  }
}

function fmt(n) {
  const v = Number(n||0);
  return Intl.NumberFormat('vi-VN').format(v);
}
function totalCount(obj={}) {
  return Object.values(obj).reduce((a,b)=>a + Number(b||0), 0);
}
function statusColor(k) {
  switch (k) {
    case 'pending': return 'slate';
    case 'reviewing': return 'sky';
    case 'shortlisted': return 'amber';
    case 'interviewed': return 'indigo';
    case 'accepted': return 'emerald';
    case 'rejected': return 'rose';
    default: return 'slate';
  }
}

function mapStatus(k) {
  const t = {
    pending: 'Chờ duyệt',
    reviewing: 'Đang xem',
    shortlisted: 'Chọn sơ bộ',
    interviewed: 'Phỏng vấn',
    accepted: 'Được nhận',
    rejected: 'Từ chối'
  };
  return t[k] || k;
}