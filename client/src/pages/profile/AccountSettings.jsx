import React, { useEffect, useState } from 'react';
import { userService } from '../../services/api';
import { toast } from 'react-toastify';
import { User, Mail, Phone, Lock, Save, Shield } from 'lucide-react';

export default function AccountSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await userService.getProfile();
        const p = res?.data?.data || res?.data || {};
        setProfile({
          name: p.name || p.fullName || '',
          email: p.email || '',
          phone: p.phone || p.phoneNumber || '',
        });
      } catch (e) {
        console.error('Load profile failed:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveProfile = async () => {
    try {
      setSaving(true);
      await userService.updateProfile({
        name: profile.name,
        phone: profile.phone,
        phoneNumber: profile.phone,
      });
      toast.success('✅ Đã lưu thông tin tài khoản');
    } catch (e) {
      toast.error(e?.response?.data?.message || '❌ Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!pwd.oldPassword || !pwd.newPassword || !pwd.confirm) {
      toast.info('⚠️ Vui lòng điền đủ 3 trường');
      return;
    }
    if (pwd.newPassword !== pwd.confirm) {
      toast.error('❌ Mật khẩu mới không khớp');
      return;
    }
    if (pwd.newPassword.length < 6) {
      toast.error('❌ Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    try {
      setChanging(true);
      await userService.changePassword({ 
        oldPassword: pwd.oldPassword, 
        password: pwd.newPassword,
        newPassword: pwd.newPassword
      });
      setPwd({ oldPassword: '', newPassword: '', confirm: '' });
      toast.success('✅ Đổi mật khẩu thành công');
    } catch (e) {
      toast.error(e?.response?.data?.message || '❌ Đổi mật khẩu thất bại');
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Thông tin tài khoản */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Thông tin tài khoản</h2>
              <p className="text-sm text-gray-600">Cập nhật thông tin cá nhân của bạn</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <User className="w-4 h-4 text-blue-600" />
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e)=>setProfile(p=>({ ...p, name: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Nhập họ và tên"
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400" />
                  Email 
                  <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                    không thể thay đổi
                  </span>
                </label>
                <input 
                  type="email"
                  value={profile.email} 
                  disabled 
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50 text-gray-500 cursor-not-allowed" 
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e)=>setProfile(p=>({ ...p, phone: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Đổi mật khẩu */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Đổi mật khẩu</h2>
              <p className="text-sm text-gray-600">Cập nhật mật khẩu để bảo mật tài khoản</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Shield className="w-4 h-4 text-purple-600" />
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              value={pwd.oldPassword}
              onChange={(e)=>setPwd(p=>({ ...p, oldPassword: e.target.value }))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Lock className="w-4 h-4 text-purple-600" />
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={pwd.newPassword}
              onChange={(e)=>setPwd(p=>({ ...p, newPassword: e.target.value }))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <span className="w-1 h-1 rounded-full bg-gray-400"></span>
              Tối thiểu 6 ký tự
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Shield className="w-4 h-4 text-purple-600" />
              Nhập lại mật khẩu mới
            </label>
            <input
              type="password"
              value={pwd.confirm}
              onChange={(e)=>setPwd(p=>({ ...p, confirm: e.target.value }))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              onClick={changePassword}
              disabled={changing}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Lock className="w-4 h-4" />
              {changing ? 'Đang đổi...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}