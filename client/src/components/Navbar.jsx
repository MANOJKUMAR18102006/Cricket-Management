import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import { 
  Activity, 
  Trophy, 
  Users, 
  Shield, 
  Menu, 
  X, 
  Sparkles, 
  LogOut, 
  User as UserIcon,
  Bell,
  UserCheck,
  UserPlus
} from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Poll unread connection request count when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setPendingRequestsCount(0);
      return;
    }

    const fetchCounts = async () => {
      try {
        const res = await notificationService.getUnreadCount();
        if (res.success) {
          setPendingRequestsCount(res.pendingRequestsCount || 0);
        }
      } catch (err) {
        // Silently catch in navbar
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const navLinks = [
    { name: 'Matches', path: '/matches', icon: Activity },
    { name: 'Tournaments', path: '/#tournaments', icon: Trophy },
    { name: 'Players & Stats', path: '/players', icon: Users },
  ];

  if (isAuthenticated) {
    navLinks.push({
      name: 'Connections',
      path: '/connections',
      icon: UserPlus,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
    });
  }

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0f1d]/85 backdrop-blur-md border-b border-gray-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <span className="text-xl">🏏</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-white">
                  Crick<span className="text-emerald-400">Pulse</span>
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  BETA
                </span>
              </div>
              <p className="text-[10px] text-gray-400 hidden sm:block tracking-wider uppercase">Cricket & Player Hub</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors relative"
                >
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-emerald-400" />
                  <span>{link.name}</span>
                  {link.badge ? (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-emerald-500 text-black">
                      {link.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* Desktop Auth State / Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                {/* Notification Bell Badge */}
                <Link
                  to="/connections"
                  title={
                    pendingRequestsCount > 0
                      ? `${pendingRequestsCount} pending connection request${pendingRequestsCount > 1 ? 's' : ''}`
                      : 'Connection Requests & Notifications'
                  }
                  className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-850 transition"
                >
                  <Bell className="w-4 h-4" />
                  {pendingRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-black ring-2 ring-[#0a0f1d] animate-pulse">
                      {pendingRequestsCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-emerald-500/50 transition group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {user?.username ? user.username.charAt(0).toUpperCase() : '🏏'}
                  </div>
                  <span className="text-sm font-semibold text-gray-200 group-hover:text-emerald-400 transition">
                    {user?.username}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {user?.role}
                  </span>
                </Link>
                
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/70 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-lg shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && pendingRequestsCount > 0 && (
              <Link
                to="/connections"
                className="relative p-2 rounded-lg text-emerald-400 bg-emerald-500/10"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-black">
                  {pendingRequestsCount}
                </span>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-800 bg-[#0d1322] px-4 pt-2 pb-5 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800/80"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-emerald-400" />
                  <span>{link.name}</span>
                </div>
                {link.badge ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500 text-black">
                    {link.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-gray-800 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl text-white font-medium"
                >
                  <UserIcon className="w-5 h-5 text-emerald-400" />
                  <span>Profile ({user?.username})</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 text-center text-sm font-semibold text-red-400 bg-red-500/10 rounded-lg flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-sm font-medium text-gray-300 bg-gray-800/60 rounded-lg block"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-sm font-medium text-white bg-emerald-500 rounded-lg shadow block"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
