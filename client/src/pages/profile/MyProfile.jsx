import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Pencil,
  CircleHelp,
  ChevronRight,
  PlusCircle,
  Upload,
  FileText,
  Download,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import api, { userService } from '../../services/api';
import ProfileBasicModal from './ProfileBasicModal';
import CareerGoalsModal from './CareerGoalsModal';
import SkillModal from './SkillModal';
import WorkExperienceModal from './WorkExperienceModal';

// PDF/DOC viewer
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const isPdf = (nameOrUrl) => /\.(pdf)$/i.test(String(nameOrUrl || ''));
const isDoc = (nameOrUrl) => /\.(doc|docx)$/i.test(String(nameOrUrl || ''));
const getOfficeViewerUrl = (url) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

function useCurrentUser() {
  return useMemo(() => {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') return {};
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }, []);
}

const uid = () => {
  try { return crypto.randomUUID(); } catch { return 'id-' + Math.random().toString(36).slice(2, 10); }
};

// Marker ẩn để cất dữ liệu kinh nghiệm trong careerGoals khi backend không hỗ trợ field riêng
const EXP_START = '<!--WF_EXP_START-->';
const EXP_END = '<!--WF_EXP_END-->';
const extractExpFromGoals = (html = '') => {
  const m = String(html).match(new RegExp(`${EXP_START}([\\s\\S]*?)${EXP_END}`));
  if (!m) return null;
  try { const arr = JSON.parse(m[1] || '[]'); return Array.isArray(arr) ? arr : null; } catch { return null; }
};
const stripExpFromGoals = (html = '') => String(html).replace(new RegExp(`${EXP_START}[\\s\\S]*?${EXP_END}`, 'g'), '').trim();
const buildGoalsWithExp = (cleanGoalsHtml = '', expArr = []) => `${cleanGoalsHtml}\n${EXP_START}${JSON.stringify(expArr)}${EXP_END}`;

export default function MyProfile() {
  const user = useCurrentUser();

  // Header info
  const [displayName, setDisplayName] = useState(user?.name || user?.fullName || '');
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    experience: '',
    level: '',
    degree: '',
    industry: '',
    jobCategory: '',
  });
  const [profileData, setProfileData] = useState(null);

  const [jobAlertOn, setJobAlertOn] = useState(true);
  const [openBasic, setOpenBasic] = useState(false);

  // Career goals
  const [openGoals, setOpenGoals] = useState(false);
  const [goalsHtml, setGoalsHtml] = useState('');

  // Skills
  const [openSkills, setOpenSkills] = useState(false);
  const [skills, setSkills] = useState([]);

  // Work experiences
  const [workExperiences, setWorkExperiences] = useState([]);
  const [openWorkExp, setOpenWorkExp] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);
  // Tự phát hiện schema từ server
  const [expKey, setExpKey] = useState(null);       // 'workExperiences' | 'experiences'
  const [expIsString, setExpIsString] = useState(false); // true nếu server lưu string JSON
  const [serverSupportsExp, setServerSupportsExp] = useState(false); // có field exp không

  // CV
  const [cvFile, setCvFile] = useState(null);
  const [pendingCv, setPendingCv] = useState(null);
  const [isUploadingCv, setIsUploadingCv] = useState(false);

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const pdfDefaultLayout = defaultLayoutPlugin();

  // Load profile
  const loadProfile = async () => {
    try {
      const res = await userService.getProfile();
      const data = res?.data?.data || res?.data || {};
      setProfileData(data);

      // name
      if (data.name) setDisplayName(data.name);
      try {
        const raw = localStorage.getItem('user');
        const cur = raw && raw !== 'undefined' && raw !== 'null' ? JSON.parse(raw) : {};
        localStorage.setItem('user', JSON.stringify({
          ...cur,
          name: data.name || cur.name,
          email: data.email || cur.email,
          userType: data.userType || cur.userType,
          id: data.id || cur.id,
        }));
      } catch {}

      setBasicInfo({
        title: data.position || data.title || '',
        experience: data.experienceBand || data.experience || '',
        level: data.level || '',
        degree: data.degree || '',
        industry: data.industry || '',
        jobCategory: data.jobCategory || data.category || '',
      });

      setJobAlertOn(Boolean(data.jobAlertOn));

      // skills JSON/CSV
      let s = data.skills;
      let parsed = [];
      if (Array.isArray(s)) parsed = s;
      else if (typeof s === 'string' && s.trim()) {
        try {
          const j = JSON.parse(s);
          parsed = Array.isArray(j) ? j : s.split(',').map(x => x.trim()).filter(Boolean);
        } catch {
          parsed = s.split(',').map(x => x.trim()).filter(Boolean);
        }
      }
      setSkills(parsed);

      // goals + exp: tách phần comment ẩn ra khỏi goalsHtml hiển thị
      const rawGoals = data.careerGoals || '';
      const expFromGoals = extractExpFromGoals(rawGoals);
      setGoalsHtml(stripExpFromGoals(rawGoals)); // hiển thị phần sạch

      // Work experiences: auto detect key + kiểu (array|string)
      const normalizeExp = (arrLike) => (Array.isArray(arrLike) ? arrLike : []);
      let detectedKey = null;
      let detectedIsString = false;
      let wx = [];
      let hasExpField = false;

      if (data.workExperiences !== undefined) {
        hasExpField = true;
        detectedKey = 'workExperiences';
        if (typeof data.workExperiences === 'string') {
          detectedIsString = true;
          try { wx = JSON.parse(data.workExperiences) || []; } catch { wx = []; }
        } else {
          wx = normalizeExp(data.workExperiences);
        }
      } else if (data.experiences !== undefined) {
        hasExpField = true;
        detectedKey = 'experiences';
        if (typeof data.experiences === 'string') {
          detectedIsString = true;
          try { wx = JSON.parse(data.experiences) || []; } catch { wx = []; }
        } else {
          wx = normalizeExp(data.experiences);
        }
      } else if (expFromGoals) {
        // Không có field riêng -> lấy từ comment ẩn trong careerGoals
        wx = normalizeExp(expFromGoals);
      }

      setExpKey(detectedKey);
      setExpIsString(detectedIsString);
      setServerSupportsExp(hasExpField);

      const wxNormalized = (wx || []).map((x) => ({ id: x.id || uid(), title: x.title || '', description: x.description || '' }));
      setWorkExperiences(wxNormalized);

      if (data.cvUrl) setCvFile({ name: data.cvName || 'CV.pdf', url: data.cvUrl, size: data.cvSize });
      else setCvFile(null);
    } catch {}
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfileCv = async () => {
    try {
      const res = await userService.getProfile();
      const data = res?.data?.data || res?.data || {};
      if (data.cvUrl) setCvFile({ name: data.cvName || 'CV.pdf', url: data.cvUrl, size: data.cvSize });
      else setCvFile(null);
    } catch {}
  };

  const validateFile = (file) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!file) return 'Không có file';
    if (!allowed.includes(file.type)) return 'Chỉ chấp nhận file PDF hoặc Word (DOC/DOCX)';
    if (file.size > 5 * 1024 * 1024) return 'Kích thước file không được vượt quá 5MB';
    return null;
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const errMsg = validateFile(file);
    if (errMsg) return toast.error(errMsg);
    e.target.value = null;
    setPendingCv(file);
  };

  const onDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragOver  = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const onDrop      = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    const errMsg = validateFile(file);
    if (errMsg) return toast.error(errMsg);
    setPendingCv(file);
  };

  const uploadCv = async () => {
    if (!pendingCv) return;
    setIsUploadingCv(true);
    try {
      const formData = new FormData();
      formData.append('cv', pendingCv);
      const res = await api.post('/users/profile/cv', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const data = res?.data?.data || res?.data || {};
      setCvFile({
        name: data.cvName || pendingCv.name,
        url: data.cvUrl || data.url || URL.createObjectURL(pendingCv),
        size: data.cvSize || pendingCv.size,
      });
      setPendingCv(null);
      toast.success('Lưu CV thành công');
      await loadProfileCv();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Lỗi khi tải lên CV');
    } finally {
      setIsUploadingCv(false);
    }
  };

  const removeCv = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa CV này không?')) return;
    setIsUploadingCv(true);
    try {
      await api.delete('/users/profile/cv');
      setCvFile(null);
      setPendingCv(null);
      toast.success('Đã xóa CV thành công');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Lỗi khi xóa CV');
    } finally {
      setIsUploadingCv(false);
    }
  };

  const downloadCv = () => {
    if (!cvFile?.url) return;
    const a = document.createElement('a');
    a.href = cvFile.url;
    a.download = (cvFile.name || 'CV.pdf').replace(/\s+/g, '_');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSaveBasic = async (values) => {
    try {
      await userService.updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        name: [values.firstName, values.lastName].filter(Boolean).join(' ').trim() || undefined,
        position: values.title || undefined,
        level: values.level || undefined,
        workType: values.workType || undefined,
        degree: values.degree || undefined,
        industry: values.industry || undefined,
        jobCategory: values.category || undefined,
        experienceBand: values.experience || undefined,
        expectedSalary: values.salary ? Number(values.salary) : undefined,
        location: values.location || undefined,
        phone: values.phone || undefined,
        birthdate: values.birthdate || undefined,
        address: values.address || undefined,
        gender: values.gender || undefined,
        maritalStatus: values.maritalStatus || undefined,
      });
      toast.success('Lưu thông tin cơ bản thành công');
      setOpenBasic(false);
      await loadProfile();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Lưu thông tin cơ bản thất bại');
    }
  };

  const handleToggleJobAlert = async () => {
    const next = !jobAlertOn;
    setJobAlertOn(next);
    try {
      await userService.updateProfile({ jobAlertOn: next });
    } catch {
      setJobAlertOn(!next);
      toast.error('Không lưu được trạng thái thông báo');
    }
  };

  // Khi lưu mục tiêu nghề nghiệp, luôn giữ lại block kinh nghiệm (nếu có)
  const handleSaveGoals = async (html) => {
    try {
      const expArr = workExperiences.map(({ title, description }) => ({ title, description }));
      const clean = stripExpFromGoals(html || '');
      const combined = buildGoalsWithExp(clean, expArr);
      await userService.updateProfile({ careerGoals: combined });
      setGoalsHtml(clean);
      toast.success('Lưu mục tiêu nghề nghiệp thành công');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Lưu mục tiêu nghề nghiệp thất bại');
    }
  };

  const handleSaveSkills = async (selected) => {
    try {
      await userService.updateProfile({ skills: selected });
      setSkills(selected);
      toast.success('Lưu kỹ năng thành công');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Lưu kỹ năng thất bại');
    }
  };

  // Fallback: lưu kinh nghiệm vào careerGoals (comment ẩn)
  const saveExpIntoGoals = async (arr) => {
    const cleanGoals = stripExpFromGoals(goalsHtml || '');
    const combined = buildGoalsWithExp(cleanGoals, arr);
    await userService.updateProfile({ careerGoals: combined });
  };

  // Work Experience: add/edit/save — không spam 400 nữa
  const handleSaveWorkExperience = async (expData) => {
    const isEditing = Boolean(editingExperience);
    let nextUiList;

    if (isEditing) {
      nextUiList = workExperiences.map((x) =>
        x.id === editingExperience.id ? { ...x, ...expData } : x
      );
    } else {
      nextUiList = [...workExperiences, { id: uid(), ...expData }];
    }

    const arr = nextUiList.map(({ title, description }) => ({ title, description }));

    // Nếu server KHÔNG có field exp -> lưu thẳng vào careerGoals để không phát sinh 400
    if (!serverSupportsExp) {
      try {
        await saveExpIntoGoals(arr);
      } catch (e2) {
        return toast.error(e2?.response?.data?.message || 'Lưu kinh nghiệm thất bại');
      }
      setWorkExperiences(nextUiList);
      toast.success('Lưu kinh nghiệm làm việc thành công');
      setOpenWorkExp(false);
      setEditingExperience(null);
      await loadProfile();
      return;
    }

    // Server có field exp -> thử đúng key/format duy nhất
    const payload = {
      [expKey]: expIsString ? JSON.stringify(arr) : arr,
    };

    try {
      await userService.updateProfile(payload);
    } catch {
      // Nếu vẫn lỗi, fallback goals (không thử nhiều biến thể để tránh log 400)
      try {
        await saveExpIntoGoals(arr);
      } catch (e2) {
        return toast.error(e2?.response?.data?.message || 'Lưu kinh nghiệm thất bại');
      }
    }

    setWorkExperiences(nextUiList);
    toast.success('Lưu kinh nghiệm làm việc thành công');
    setOpenWorkExp(false);
    setEditingExperience(null);
    await loadProfile();
  };

  // Nút “+ Thêm…”: nếu đã có mục trước đó -> mở modal với mục gần nhất để chỉnh sửa
  const handleOpenAddExperience = () => {
    const last = workExperiences?.[workExperiences.length - 1];
    if (last) setEditingExperience(last);
    else setEditingExperience(null);
    setOpenWorkExp(true);
  };

  const fileNameForType = cvFile?.name || cvFile?.url || '';

  const fullName = displayName || user?.name || user?.fullName || '';
  const basicItems = [
    { label: 'Chức danh',  value: basicInfo.title },
    { label: 'Kinh nghiệm', value: basicInfo.experience },
    { label: 'Cấp bậc',     value: basicInfo.level },
    { label: 'Học vấn',     value: basicInfo.degree },
    { label: 'Lĩnh vực',    value: basicInfo.industry },
    { label: 'Ngành nghề',  value: basicInfo.jobCategory },
  ];

  const splitName = (name = '') => {
    const parts = String(name).trim().split(/\s+/);
    if (parts.length <= 1) return { firstName: name || '', lastName: '' };
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts.slice(-1).join(' ') };
  };
  const fmtDate = (d) => !d ? '' : String(d).slice(0, 10);

  const modalInitial = profileData ? {
    ...splitName(profileData.name || ''),
    title: profileData.position || '',
    level: profileData.level || '',
    workType: profileData.workType || '',
    degree: profileData.degree || '',
    industry: profileData.industry || '',
    category: profileData.jobCategory || '',
    experience: profileData.experienceBand || profileData.experience || '',
    salary: profileData.expectedSalary ?? '',
    location: profileData.location || '',
    email: profileData.email || '',
    phone: profileData.phone || '',
    birthdate: fmtDate(profileData.birthdate),
    address: profileData.address || '',
    gender: profileData.gender || '',
    maritalStatus: profileData.maritalStatus || '',
  } : {};

  const canSave = Boolean(pendingCv) && !isUploadingCv;

  return (
    <div className="space-y-6">
      {/* Thông tin cơ bản */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {fullName || 'Hồ sơ của bạn'}
            </h1>
            <BasicInfoList items={basicItems} />
          </div>
          <button
            type="button"
            onClick={() => setOpenBasic(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="w-4 h-4" />
            Chỉnh sửa
          </button>
        </div>

        {/* Dải bật thông báo việc làm */}
        <div className="px-6 pb-6">
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={jobAlertOn}
                onChange={handleToggleJobAlert}
              />
              <span className="w-10 h-6 rounded-full bg-gray-300 transition-colors peer-checked:bg-blue-600 relative">
                <span className="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
              </span>
            </label>
            <div className="text-gray-800 font-medium">
              {jobAlertOn ? 'Đang bật thông báo việc làm' : 'Đang tắt thông báo việc làm'}
            </div>
            <CircleHelp className="w-4 h-4 text-gray-400" title="Khi bật, bạn sẽ nhận gợi ý việc làm phù hợp." />
          </div>
        </div>
      </div>

      {/* Mục tiêu nghề nghiệp */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">Mục Tiêu Nghề Nghiệp</h2>
          <button type="button" onClick={() => setOpenGoals(true)} className="text-sm text-blue-600 hover:text-blue-700">
            + Thêm mục tiêu nghề nghiệp
          </button>
        </div>
        <div className="px-6 py-5">
          {goalsHtml ? (
            <div className="prose max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 text-[15px]" dangerouslySetInnerHTML={{ __html: goalsHtml }} />
          ) : (
            <EmptyBlock text="Chưa cập nhật mục tiêu nghề nghiệp" />
          )}
        </div>
      </div>

      {/* Kinh nghiệm làm việc */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">Kinh Nghiệm Làm Việc</h2>
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700"
            onClick={handleOpenAddExperience}
          >
            + Thêm kinh nghiệm làm việc
          </button>
        </div>
        <div className="px-6 py-5">
          {workExperiences.length > 0 ? (
            <div className="space-y-6">
              {workExperiences.map((exp, idx) => (
                <WorkExperienceItem
                  key={exp.id || idx}
                  experience={exp}
                />
              ))}
            </div>
          ) : (
            <EmptyBlock icon={<PlusCircle className="w-10 h-10 text-gray-300" />} text="Chưa thêm kinh nghiệm làm việc" />
          )}
        </div>
      </div>

      {/* Kỹ năng */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">Kỹ Năng</h2>
          <button type="button" onClick={() => setOpenSkills(true)} className="text-sm text-blue-600 hover:text-blue-700">
            + Thêm kỹ năng
          </button>
        </div>
        <div className="px-6 py-5">
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((s, idx) => (
                <SkillViewChip key={(s.name || s) + idx} name={s.name || s} level={s.level} />
              ))}
            </div>
          ) : (
            <EmptyBlock text="Chưa thêm kỹ năng" />
          )}
        </div>
      </div>

      {/* CV của bạn */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">CV của bạn</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={downloadCv} disabled={!cvFile?.url} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" title={cvFile?.url ? 'Tải CV của bạn' : 'Chưa có CV để tải'}>
              <Download size={16} /> Tải CV của bạn
            </button>
            {cvFile?.url && (
              <button type="button" onClick={removeCv} disabled={isUploadingCv} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50" title="Xóa CV">
                <Trash2 size={16} /> Xóa
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Kéo thả / click chọn CV */}
          <div
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 p-8 text-center transition
              ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-300 bg-gray-50 hover:border-blue-300'}`}
          >
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-gray-900 font-medium">
                Kéo thả hoặc click để {cvFile ? 'thay đổi' : 'tải lên'} CV
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Hỗ trợ: PDF (xem trực tiếp), DOC/DOCX — tối đa 5MB
              </p>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={onPickFile} className="hidden" />
          </div>

          {/* Info CV hiện có */}
          {cvFile && !pendingCv && (
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{cvFile.name}</p>
                  <p className="text-sm text-gray-500">{cvFile.size ? `${(cvFile.size / 1024 / 1024).toFixed(2)} MB` : ''}</p>
                </div>
              </div>
              {!isPdf(cvFile?.name || cvFile?.url || '') && (
                <a href={cvFile.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800">
                  Mở tab
                </a>
              )}
            </div>
          )}

          {/* Viewer */}
          {cvFile?.url && !pendingCv && isPdf(fileNameForType) && (
            <div className="border rounded-lg overflow-hidden" style={{ height: '60vh' }}>
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer fileUrl={cvFile.url} plugins={[pdfDefaultLayout]} />
              </Worker>
            </div>
          )}
          {cvFile?.url && !pendingCv && !isPdf(fileNameForType) && isDoc(fileNameForType) && (
            <div className="border rounded-lg overflow-hidden">
              <iframe title="CV Preview (DOC/DOCX)" src={getOfficeViewerUrl(cvFile.url)} className="w-full" style={{ height: '60vh' }} />
              <p className="mt-2 text-xs text-gray-500">Nếu không xem được trực tiếp (đặc biệt trên localhost), hãy dùng “Mở tab”.</p>
            </div>
          )}

          {/* Thông báo đang chờ lưu */}
          {pendingCv && (
            <div className="p-4 border border-amber-200 rounded-lg bg-amber-50 text-amber-800 flex items-start gap-3">
              <XCircle className="w-5 h-5 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">Bạn vừa chọn file mới (chưa lưu)</div>
                <div className="text-sm">{pendingCv.name} • {(pendingCv.size / 1024 / 1024).toFixed(2)} MB</div>
                <div className="text-xs mt-1 text-amber-700">Nhấn “Lưu CV” để cập nhật, hoặc “Hủy” để giữ CV cũ.</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer CV */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={() => setPendingCv(null)} disabled={!pendingCv || isUploadingCv} className={`px-4 py-2 rounded-md border ${pendingCv && !isUploadingCv ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}>
              Hủy
            </button>
            <button type="button" onClick={uploadCv} disabled={!pendingCv || isUploadingCv} className={`px-4 py-2 rounded-md ${pendingCv && !isUploadingCv ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-400 text-white cursor-not-allowed'}`}>
              {isUploadingCv ? 'Đang lưu...' : 'Lưu CV'}
            </button>
          </div>
        </div>
      </div>

      {/* Nút nổi */}
      <button
        type="button"
        onClick={() => setOpenGoals(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-fuchsia-600 text-white shadow-lg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-fuchsia-300"
        title="Cập nhật mục tiêu"
        aria-label="Cập nhật mục tiêu"
      >
        <ChevronRight className="w-6 h-6 m-auto" />
      </button>

      {/* Modals */}
      <ProfileBasicModal open={openBasic} onClose={() => setOpenBasic(false)} onSave={handleSaveBasic} initial={modalInitial} />
      <CareerGoalsModal open={openGoals} onClose={() => setOpenGoals(false)} initialHtml={goalsHtml} onSave={handleSaveGoals} />
      <SkillModal open={openSkills} onClose={() => setOpenSkills(false)} initial={skills} onSave={handleSaveSkills} suggestions={[]} />

      {/* Work Experience Modal */}
      <WorkExperienceModal
        open={openWorkExp}
        onClose={() => { setOpenWorkExp(false); setEditingExperience(null); }}
        onSave={handleSaveWorkExperience}
        initialData={editingExperience}
      />
    </div>
  );
}

/* ================== UI helpers ================== */

// ĐÃ BỎ icon sửa/xóa theo yêu cầu
function WorkExperienceItem({ experience }) {
  const str = experience?.description || '';
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(str);

  return (
    <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <h3 className="font-semibold text-gray-800 text-[16px]">{experience.title}</h3>

      {str ? (
        looksLikeHtml ? (
          <div
            className="mt-2 prose max-w-none prose-sm prose-p:my-1 prose-ul:my-1 text-gray-600"
            dangerouslySetInnerHTML={{ __html: str }}
          />
        ) : (
          <div className="mt-2 text-gray-600 whitespace-pre-wrap">{str}</div>
        )
      ) : null}
    </div>
  );
}

function BasicInfoList({ items }) {
  return (
    <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-1.5">
      {items.map(({ label, value }, i) => (
        <div key={i} className="flex items-baseline gap-2 min-w-0">
          <dt className="text-[13px] text-gray-500 flex-shrink-0">{label}:</dt>
          <dd className={`text-[13px] font-medium truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
            {value || 'Chưa cập nhật'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyBlock({ icon, text }) {
  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500 text-sm">
      {icon && <div className="mb-2 flex justify-center">{icon}</div>}
      <div>{text || 'Chưa có nội dung'}</div>
    </div>
  );
}

function SkillViewChip({ name, level }) {
  const tag =
    level === 'basic' ? 'bg-amber-50 text-amber-800 border-amber-200'
    : level === 'intermediate' ? 'bg-teal-50 text-teal-800 border-teal-200'
    : level === 'advanced' ? 'bg-sky-50 text-sky-800 border-sky-200'
    : 'bg-violet-50 text-violet-800 border-violet-200';
  const label =
    level === 'basic' ? 'Cơ bản'
    : level === 'intermediate' ? 'Trung cấp'
    : level === 'advanced' ? 'Cao cấp'
    : 'Thành thạo';

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${tag}`}>
      <span className="text-sm font-medium">{name}</span>
      <span className="text-xs px-2 py-0.5 rounded-md border bg-white/70">{label}</span>
    </span>
  );
}