import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import notificationService from '../services/notificationService';
import {
  Bell,
  CheckCheck,
  Check,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  Trophy,
  Activity,
  ArrowLeft,
  Clock,
  Inbox,
  Filter,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return past.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: past.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'connection_request':
      return { icon: UserPlus, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
    case 'connection_accepted':
      return { icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    case 'connection_rejected':
      return { icon: UserX, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
    case 'team_added':
      return { icon: Shield, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' };
    case 'team_removed':
      return { icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
    case 'team_invitation':
    case 'TEAM_INVITATION':
      return { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
    case 'team_invitation_accepted':
    case 'TEAM_INVITATION_ACCEPTED':
      return { icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    case 'team_invitation_rejected':
    case 'TEAM_INVITATION_REJECTED':
      return { icon: UserX, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };
    case 'match_invitation':
      return { icon: Trophy, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
    case 'match_completed':
      return { icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    default:
      return { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-800 border-gray-700' };
  }
};

const getActionInfo = (notif) => {
  switch (notif.type) {
    case 'connection_request':
      return { label: 'View Requests', route: '/connections' };
    case 'connection_accepted':
      return { label: 'View Connections', route: '/connections' };
    case 'connection_rejected':
      return { label: 'View Connections', route: '/connections' };
    case 'team_added':
    case 'team_removed':
      return notif.relatedId ? { label: 'View Squad', route: `/teams/${notif.relatedId}` } : null;
    case 'team_invitation':
    case 'TEAM_INVITATION':
      return { label: 'Review Invitation', route: '/teams' };
    case 'team_invitation_accepted':
    case 'TEAM_INVITATION_ACCEPTED':
    case 'team_invitation_rejected':
    case 'TEAM_INVITATION_REJECTED':
      return notif.relatedId ? { label: 'View Team Profile', route: `/teams/${notif.relatedId}` } : null;
    case 'match_invitation':
    case 'match_completed':
      return notif.relatedId ? { label: 'Match Center', route: `/matches/${notif.relatedId}` } : null;
    default:
      return null;
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationService.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Socket.IO compatibility hook
    const unsubscribe = notificationService.subscribeToNotifications((newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true, isRead: true } : n))
      );
    } catch {
      // Silent catch
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
    } catch {
      // Silent catch
    }
  };

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') {
      return !n.read && !n.isRead;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#060a12] text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 mb-1">
              <Bell className="w-3.5 h-3.5" />
              <span>Activity & Alerts</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Notifications Hub
            </h1>
            <p className="text-xs text-gray-400">
              Stay up to date with match invites, connection requests, team squad changes, and game results.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 transition shadow-sm"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>Mark All Read</span>
              </button>
            )}

            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition"
              title="Refresh Notifications"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                filter === 'all'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filter === 'unread'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    filter === 'unread' ? 'bg-black text-white' : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs text-gray-400 font-medium">Fetching notifications...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
            <p className="text-sm font-semibold text-red-400">{error}</p>
            <button
              onClick={fetchNotifications}
              className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition"
            >
              Retry
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-[#090e1a] border border-gray-800 p-8 space-y-3">
            <Inbox className="w-12 h-12 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-300">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {filter === 'unread'
                ? "You're all caught up! There are no unread notifications right now."
                : 'Activity alerts for matches, team rosters, and connections will appear here.'}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl bg-[#090e1a] border border-gray-800 overflow-hidden divide-y divide-gray-800/60 shadow-xl">
            {filteredNotifications.map((notif) => {
              const iconConfig = getNotificationIcon(notif.type);
              const Icon = iconConfig.icon;
              const action = getActionInfo(notif);
              const isUnread = !notif.read && !notif.isRead;

              return (
                <div
                  key={String(notif._id)}
                  className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    isUnread ? 'bg-emerald-950/15' : 'hover:bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-2xl ${iconConfig.bg} border flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}
                    >
                      <Icon className={`w-5 h-5 ${iconConfig.color}`} />
                    </div>

                    {/* Message & Time */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${isUnread ? 'font-bold text-white' : 'font-medium text-gray-300'}`}>
                          {notif.message}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                        {notif.sender && (
                          <span>From: {notif.sender.displayName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:self-center pl-14 sm:pl-0">
                    {action && (
                      <Link
                        to={action.route}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-200 bg-gray-800 hover:bg-gray-700 hover:text-white transition border border-gray-700/60 inline-flex items-center gap-1.5"
                      >
                        <span>{action.label}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </Link>
                    )}

                    {isUnread && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif._id, e)}
                        className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
