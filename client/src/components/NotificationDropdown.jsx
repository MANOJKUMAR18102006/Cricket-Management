import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import notificationService from '../services/notificationService';
import {
  Bell,
  CheckCheck,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  Trophy,
  Activity,
  ChevronRight,
  Clock,
  Inbox,
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
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'connection_request':
      return { icon: UserPlus, color: 'text-amber-400', bg: 'bg-amber-500/10' };
    case 'connection_accepted':
      return { icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    case 'connection_rejected':
      return { icon: UserX, color: 'text-red-400', bg: 'bg-red-500/10' };
    case 'team_added':
      return { icon: Shield, color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
    case 'team_removed':
      return { icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-500/10' };
    case 'team_invitation':
    case 'TEAM_INVITATION':
      return { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10' };
    case 'team_invitation_accepted':
    case 'TEAM_INVITATION_ACCEPTED':
      return { icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    case 'team_invitation_rejected':
    case 'TEAM_INVITATION_REJECTED':
      return { icon: UserX, color: 'text-rose-400', bg: 'bg-rose-500/10' };
    case 'match_invitation':
      return { icon: Trophy, color: 'text-purple-400', bg: 'bg-purple-500/10' };
    case 'match_completed':
      return { icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    default:
      return { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-800' };
  }
};

const getNotificationRoute = (notif) => {
  switch (notif.type) {
    case 'connection_request':
    case 'connection_accepted':
    case 'connection_rejected':
      return '/connections';
    case 'team_added':
    case 'team_removed':
      return notif.relatedId ? `/teams/${notif.relatedId}` : '/teams';
    case 'team_invitation':
    case 'TEAM_INVITATION':
      return '/teams';
    case 'team_invitation_accepted':
    case 'TEAM_INVITATION_ACCEPTED':
    case 'team_invitation_rejected':
    case 'TEAM_INVITATION_REJECTED':
      return notif.relatedId ? `/teams/${notif.relatedId}` : '/teams';
    case 'match_invitation':
    case 'match_completed':
      return notif.relatedId ? `/matches/${notif.relatedId}` : '/matches';
    default:
      return '/notifications';
  }
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Poll count and subscribe to notifications
  const fetchCount = async () => {
    try {
      const res = await notificationService.getUnreadCount();
      if (res.success) {
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // Silent catch
    }
  };

  const fetchRecent = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch {
      // Silent catch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 15000);

    // Socket.IO compatibility hook
    const unsubscribe = notificationService.subscribeToNotifications((newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  // When dropdown opens, load recent list
  useEffect(() => {
    if (isOpen) {
      fetchRecent();
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
    } catch {
      // Silent catch
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read && !notif.isRead) {
      try {
        await notificationService.markAsRead(notif._id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true, isRead: true } : n))
        );
      } catch {
        // Silent catch
      }
    }
    setIsOpen(false);
    const targetRoute = getNotificationRoute(notif);
    navigate(targetRoute);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl text-gray-400 hover:text-white transition ${
          isOpen ? 'bg-gray-800 text-white' : 'hover:bg-gray-800/60'
        }`}
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-black ring-2 ring-[#0a0f1d] animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0b101e] border border-gray-800 shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-fadeIn">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-800/80 flex items-center justify-between bg-gray-900/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-emerald-400 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-800/50">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center space-y-2 px-4">
                <Inbox className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="text-xs text-gray-400 font-medium">All caught up!</p>
                <p className="text-[11px] text-gray-600">You have no new notifications right now.</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => {
                const iconConfig = getNotificationIcon(notif.type);
                const Icon = iconConfig.icon;
                const isUnread = !notif.read && !notif.isRead;

                return (
                  <div
                    key={String(notif._id)}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-gray-800/40 transition group ${
                      isUnread ? 'bg-emerald-950/10' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl ${iconConfig.bg} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <Icon className={`w-4 h-4 ${iconConfig.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs ${isUnread ? 'font-bold text-white' : 'font-medium text-gray-300'} line-clamp-2`}>
                          {notif.message}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-gray-800/80 bg-gray-900/40 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition inline-flex items-center gap-1"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
