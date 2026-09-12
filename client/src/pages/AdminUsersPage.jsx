import React, { useState, useEffect } from 'react';
import adminService from '../services/adminService';
import AdminNav from '../components/AdminNav';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Trash2,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: null,
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({
        search,
        role,
        status,
        page,
        limit: 15,
      });
      if (data.success) {
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to fetch users.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, role, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleStatus = (user) => {
    const nextStatus = user.status === 'disabled' ? 'active' : 'disabled';
    const isDisabling = nextStatus === 'disabled';
    setConfirmConfig({
      isOpen: true,
      title: isDisabling ? 'Disable User Account' : 'Enable User Account',
      message: isDisabling
        ? `Are you sure you want to disable @${user.username}? They will be immediately logged out and unable to access CrickPulse.`
        : `Re-enable @${user.username}'s account to restore full access?`,
      confirmText: isDisabling ? 'Disable User' : 'Enable User',
      variant: isDisabling ? 'danger' : 'primary',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(user._id);
        try {
          const res = await adminService.updateUserStatus(user._id, nextStatus);
          if (res.success) {
            toast.success(res.message);
            setUsers((prev) =>
              prev.map((u) => (u._id === user._id ? { ...u, status: nextStatus } : u))
            );
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Action failed.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleToggleRole = (user) => {
    const nextRole = user.role === 'admin' ? 'player' : 'admin';
    const isPromoting = nextRole === 'admin';
    setConfirmConfig({
      isOpen: true,
      title: isPromoting ? 'Promote to Admin' : 'Demote to Player',
      message: `Change @${user.username}'s role to "${nextRole.toUpperCase()}"? This updates their platform permissions.`,
      confirmText: `Set Role to ${nextRole.toUpperCase()}`,
      variant: isPromoting ? 'primary' : 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(user._id);
        try {
          const res = await adminService.updateUserRole(user._id, nextRole);
          if (res.success) {
            toast.success(res.message);
            setUsers((prev) =>
              prev.map((u) => (u._id === user._id ? { ...u, role: nextRole } : u))
            );
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Role change failed.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleDeleteUser = (user) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Permanently Delete User',
      message: `Permanently delete @${user.username} and all associated data? This action CANNOT be undone.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(user._id);
        try {
          const res = await adminService.deleteUser(user._id);
          if (res.success) {
            toast.success(res.message);
            setUsers((prev) => prev.filter((u) => u._id !== user._id));
            setTotal((prev) => prev - 1);
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Delete user failed.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-8 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <AdminNav activeTab="users" />

      {/* Action Notification Banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-xs flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-5 mb-6 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, email, or city..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#070b14] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50"
            />
          </div>

          <div>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-[#070b14] border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-rose-500/50"
            >
              <option value="all">All Roles</option>
              <option value="player">Player Only</option>
              <option value="admin">Admin Only</option>
            </select>
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-[#070b14] border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-rose-500/50"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="disabled">Disabled / Suspended</option>
            </select>
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-850">
          <span>
            Total matching members: <strong className="text-white">{total}</strong>
          </span>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-[#0c1220] border border-gray-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-[#090e1a] text-gray-400 uppercase tracking-wider font-bold text-[10px]">
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Created</th>
                <th className="py-4 px-6 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-400" />
                    <span>Loading users...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-800/30 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-rose-400 shrink-0">
                          {u.profileImage ? (
                            <img src={u.profileImage} alt={u.username} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            u.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white">@{u.username}</p>
                          <p className="text-[10px] text-gray-400">{u.city || 'No city set'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-gray-300 font-mono text-[11px]">
                      {u.email}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          u.role === 'admin'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          u.status === 'disabled'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {u.status === 'disabled' ? <Ban className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {u.status || 'active'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-gray-400 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Status Toggle Button */}
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={actionLoading === u._id}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            u.status === 'disabled'
                              ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                          }`}
                          title={u.status === 'disabled' ? 'Enable Account' : 'Disable Account'}
                        >
                          {u.status === 'disabled' ? 'Enable' : 'Disable'}
                        </button>

                        {/* Role Change Button */}
                        <button
                          onClick={() => handleToggleRole(u)}
                          disabled={actionLoading === u._id}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition"
                          title="Toggle Admin Privilege"
                        >
                          {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                        </button>

                        {/* Delete User Button */}
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={actionLoading === u._id}
                          className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Permanently Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
            <span>
              Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 disabled:opacity-40 hover:text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 disabled:opacity-40 hover:text-white"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        loading={actionLoading !== null}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
