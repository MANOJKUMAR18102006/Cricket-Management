import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  User,
  Mail,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Save,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SettingsAccountPage() {
  const { user, updateUserData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Account Information State
  const [accountForm, setAccountForm] = useState({
    username: '',
    email: '',
  });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');

  // Security / Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    if (user) {
      setAccountForm({
        username: user.username || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Handle Account Info Submission
  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');

    const trimmedUsername = accountForm.username.trim();
    const trimmedEmail = accountForm.email.trim();

    if (!trimmedUsername) {
      setAccountError('Username cannot be blank.');
      return;
    }
    if (trimmedUsername.length < 3) {
      setAccountError('Username must be at least 3 characters.');
      return;
    }
    if (!trimmedEmail) {
      setAccountError('Email address cannot be blank.');
      return;
    }

    setAccountSaving(true);
    try {
      const res = await authService.updateAccount({
        username: trimmedUsername,
        email: trimmedEmail,
      });

      if (res.success && res.user) {
        updateUserData(res.user);
        setAccountSuccess('Account updated successfully.');
        toast.success('Account updated successfully.');
        setTimeout(() => setAccountSuccess(''), 4000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update account information.';
      setAccountError(msg);
      toast.error(msg);
    } finally {
      setAccountSaving(false);
    }
  };

  // Handle Password Change Submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res.success) {
        setPasswordSuccess('Password changed successfully.');
        toast.success('Password changed successfully.');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        });
        setTimeout(() => setPasswordSuccess(''), 4000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password. Please verify current password.';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to My Profile</span>
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage your login credentials, email address, and account security.
        </p>
      </div>

      <div className="space-y-8">
        {/* ========================================================================= */}
        {/* SECTION 1: ACCOUNT INFORMATION                                            */}
        {/* ========================================================================= */}
        <div className="bg-[#0c1220] border border-gray-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wide">
                  Account Information
                </h2>
                <p className="text-xs text-gray-400">
                  Update your display handle and login email address.
                </p>
              </div>
            </div>
          </div>

          {accountError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{accountError}</span>
            </div>
          )}

          {accountSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{accountSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAccountSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Username *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">
                  @
                </span>
                <input
                  type="text"
                  value={accountForm.username}
                  onChange={(e) => {
                    setAccountForm((prev) => ({ ...prev, username: e.target.value }));
                    if (accountError) setAccountError('');
                  }}
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="e.g. manojkumar"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">
                Must be at least 3 characters and unique across CrickPulse.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(e) => {
                    setAccountForm((prev) => ({ ...prev, email: e.target.value }));
                    if (accountError) setAccountError('');
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="e.g. manoj@example.com"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">
                Used for signing in and account communications.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={accountSaving}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm text-black bg-emerald-500 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{accountSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: SECURITY                                                       */}
        {/* ========================================================================= */}
        <div className="bg-[#0c1220] border border-gray-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wide">
                  Security
                </h2>
                <p className="text-xs text-gray-400">
                  Update your password to keep your account safe.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition"
            >
              {showPasswords ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide passwords</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Show passwords</span>
                </>
              )}
            </button>
          </div>

          {passwordError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Current Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => {
                    setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }));
                    if (passwordError) setPasswordError('');
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  placeholder="Enter current password"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }));
                      if (passwordError) setPasswordError('');
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    placeholder="Min. 6 characters"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordForm.confirmNewPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }));
                      if (passwordError) setPasswordError('');
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    placeholder="Repeat new password"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 transition shadow-lg shadow-cyan-600/25 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{passwordSaving ? 'Updating...' : 'Change Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
