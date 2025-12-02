import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome as HomeIcon,
  FiBriefcase as BriefcaseIcon,
  FiUsers as UsersIcon,
  FiBarChart2 as ChartBarIcon,
  FiFileText as FileIcon,
  FiLayers as LayersIcon,
  FiUploadCloud as UploadIcon,
  FiUser as UserIcon,
  FiChevronDown as ChevronDownIcon,
  FiLogOut as LogoutIcon,
  FiMessageSquare as ChatIcon,
} from 'react-icons/fi';
import api, { userService } from '../../services/api';
import {
  EmployerChatProvider,
  useEmployerChat,
} from '../../contexts/EmployerChatContext';
import EmployerChatFloating from './EmployerChatFloating';

const nav = [
  { label: 'Tổng quan', to: '/employer/dashboard', icon: HomeIcon },
  { label: 'Quản lý công ty', to: '/employer/company', icon: LayersIcon },
  {
    label: 'Tuyển dụng',
    icon: FileIcon,
    children: [
      { label: 'Quản lý tin tuyển dụng', to: '/employer/jobs', icon: BriefcaseIcon },
      
      // --- SỬA: Comment dòng này lại để NTD không thấy kho CV chung ---
      // { label: 'Quản lý CV', to: '/employer/cvs', icon: UploadIcon },
      
      // --- GIỮ NGUYÊN: Để làm nơi quản lý lịch phỏng vấn ---
      { label: 'Quản lý ứng viên', to: '/employer/candidates', icon: UsersIcon },
    ],
  },
  { label: 'Báo cáo & Thống kê', to: '/employer/reports', icon: ChartBarIcon },
];

function normalizeUser(raw) {
  if (!raw) return null;
  const u = raw.user ? raw.user : raw;
  return {
    id: u.id || u.userId || u._id || null,
    email: u.email || u.userEmail || u.username || u.userName || '',
    name: u.name || u.fullName || '',
    company: u.company || '',
    userType: u.userType || u.role || '',
  };
}
function getCachedUser() {
  try {
    return normalizeUser(JSON.parse(localStorage.getItem('user') || 'null'));
  } catch {
    return null;
  }
}
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function EmployerLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();

  const [me, setMe] = useState(getCachedUser());
  const [openMenu, setOpenMenu] = useState(false);
  const [openRecruitment, setOpenRecruitment] = useState(false);
  const menuRef = useRef(null);

  const { toggle } = useEmployerChat(); // dùng cho icon Tin nhắn

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpenMenu(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    const resolveUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        const u1 = normalizeUser(data.data || data);
        if (u1?.email) {
          setMe(u1);
          localStorage.setItem('user', JSON.stringify(u1));
          return;
        }
      } catch {}
      const token = localStorage.getItem('token');
      if (token) {
        const p = parseJwt(token);
        const uid = p?.userId || p?.id || p?._id;
        if (uid) {
          try {
            const resp = await userService.getUserById(uid);
            const u2 = normalizeUser(resp.data?.data || resp.data);
            if (u2) {
              setMe(u2);
              localStorage.setItem('user', JSON.stringify(u2));
              return;
            }
          } catch {}
        }
      }
      const cached = getCachedUser();
      if (cached) setMe(cached);
    };
    if (!me?.email) resolveUser();
  }, []); // eslint-disable-line

  useEffect(() => {
    // Cập nhật danh sách active path (bỏ cvs ra cho sạch code, để lại cũng ko sao)
    const recruitmentPaths = [
      '/employer/jobs',
      // '/employer/cvs', // Đã bỏ
      '/employer/candidates',
    ];
    if (recruitmentPaths.some((p) => location.pathname.startsWith(p))) {
      setOpenRecruitment(true);
    }
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const displayText = me?.email || me?.company || me?.name || 'Tài khoản';

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-[#0F172A] text-gray-200">
        <div className="h-14 flex items-center px-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-600 text-white grid place-items-center font-bold">
              J
            </div>
            <div className="text-sm font-semibold tracking-wide">
              JobHire Employer
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;

            if (!item.children) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition ${
                      isActive
                        ? 'text-white bg-white/10 border-l-2 border-blue-500'
                        : 'text-gray-300'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              );
            }

            const recruitmentPaths = [
              '/employer/jobs',
              '/employer/cvs', // Vẫn giữ logic check path để lỡ user gõ url trực tiếp thì menu vẫn sáng
              '/employer/candidates',
            ];
            const parentActive = recruitmentPaths.some((p) =>
              location.pathname.startsWith(p)
            );

            return (
              <div key={item.label} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenRecruitment((v) => !v)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition text-left ${
                    parentActive
                      ? 'text-white bg-white/10 border-l-2 border-blue-500'
                      : 'text-gray-300'
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="text-sm flex-1">{item.label}</span>
                  <ChevronDownIcon
                    size={16}
                    className={`text-gray-400 transition-transform ${
                      openRecruitment ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openRecruitment && (
                  <div className="ml-2 space-y-1">
                    {item.children.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={({ isActive }) =>
                            `group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition pl-6 ${
                              isActive
                                ? 'text-white bg-white/10 border-l-2 border-blue-500'
                                : 'text-gray-300'
                            }`
                          }
                        >
                          <SubIcon size={16} className="shrink-0" />
                          <span className="text-sm">{sub.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="p-2 text-xs text-transparent">.</div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-14 bg-[#111827] text-gray-100 flex items-center">
          <div className="w-full px-4 md:px-6">
            <div className="w-full flex items-center justify-end gap-4">
              {/* Icon Tin nhắn */}
              <button
                type="button"
                onClick={toggle}
                className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 text-gray-200"
                title="Tin nhắn"
              >
                <ChatIcon size={18} />
              </button>

              {/* User menu */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu((v) => !v);
                  }}
                  className="flex items-center gap-2 hover:opacity-90"
                  title={displayText}
                >
                  <UserIcon size={18} className="text-gray-200" />
                  <span className="text-sm text-gray-200">
                    {displayText}
                  </span>
                  <ChevronDownIcon size={16} className="text-gray-400" />
                </button>
                {openMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black/5 overflow-hidden z-20">
                    <div className="px-3 py-2 border-b">
                      <div className="text-sm font-medium text-gray-800">
                        {me?.name || 'Tài khoản'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {me?.email || ''}
                      </div>
                    </div>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogoutIcon size={16} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content + Popup chat */}
        <main className="py-6 relative">
          <div className="w-full px-4 md:px-6">
            <Outlet />
          </div>
          <EmployerChatFloating />
        </main>
      </div>
    </div>
  );
}

export default function EmployerLayout() {
  return (
    <EmployerChatProvider>
      <EmployerLayoutInner />
    </EmployerChatProvider>
  );
}