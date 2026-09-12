import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, 
  Target, 
  Zap, 
  Shield, 
  Activity, 
  MapPin, 
  Users, 
  UserPlus, 
  UserCheck,
  User,
  Clock,
  ChevronRight,
  Hash
} from 'lucide-react';

export default function PlayerSearchCard({ player, onConnectClick, isActionLoading = false }) {
  const navigate = useNavigate();

  if (!player) return null;

  const getRoleConfig = (role) => {
    switch (role) {
      case 'Batter':
        return {
          icon: Flame,
          label: 'Batter',
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          badgeEmoji: '🏏',
        };
      case 'Bowler':
        return {
          icon: Target,
          label: 'Bowler',
          bg: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
          badgeEmoji: '🎯',
        };
      case 'All-Rounder':
        return {
          icon: Zap,
          label: 'All-Rounder',
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          badgeEmoji: '⚡',
        };
      case 'Wicketkeeper':
        return {
          icon: Shield,
          label: 'Wicketkeeper',
          bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          badgeEmoji: '🧤',
        };
      default:
        return {
          icon: Activity,
          label: role || 'Player',
          bg: 'bg-gray-800 text-gray-300 border-gray-700',
          badgeEmoji: '🏏',
        };
    }
  };

  const roleConfig = getRoleConfig(player.playingRole);
  const RoleIcon = roleConfig.icon;

  const handleCardClick = () => {
    navigate(`/players/${player._id}`);
  };

  const handleConnect = (e) => {
    e.stopPropagation();
    if (onConnectClick) {
      onConnectClick(player);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative rounded-2xl bg-gradient-to-b from-[#0e1626] to-[#0a0f1d] border border-gray-800/80 hover:border-emerald-500/50 p-5 shadow-lg shadow-black/40 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
    >
      {/* Top Banner Accent */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/30 group-hover:via-emerald-400 transition-colors rounded-t-2xl" />

      <div>
        {/* Header Row: Role Badge & Jersey */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${roleConfig.bg}`}
          >
            <span>{roleConfig.badgeEmoji}</span>
            <span>{player.playingRole}</span>
          </span>

          {player.jerseyNumber !== undefined && player.jerseyNumber !== null && (
            <span className="flex items-center gap-0.5 text-xs font-mono font-bold text-gray-400 bg-gray-900/80 border border-gray-800 px-2 py-0.5 rounded-md">
              <Hash className="w-3 h-3 text-emerald-400" />
              {player.jerseyNumber}
            </span>
          )}
        </div>

        {/* Profile Image & Identification */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/40 to-teal-400/40 p-0.5 flex-shrink-0 group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-[14px] bg-[#0c1220] flex items-center justify-center overflow-hidden">
              {player.profileImage ? (
                <img
                  src={player.profileImage}
                  alt={player.displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-xl font-black text-emerald-400">
                  {player.displayName ? player.displayName.charAt(0).toUpperCase() : '🏏'}
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
              {player.displayName}
            </h3>
            <p className="text-xs font-mono text-emerald-400/80 truncate">
              @{player.username || player.user?.username || 'cricketer'}
            </p>
          </div>
        </div>

        {/* Cricket Meta Details (Team & City) */}
        <div className="space-y-2 py-3 border-t border-gray-850 text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <span className="text-gray-400">Team:</span>
            <span className="font-semibold text-gray-200 truncate">
              {player.currentTeam || 'Free Agent'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-300">
            <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <span className="text-gray-400">City:</span>
            <span className="font-semibold text-gray-200 truncate">
              {player.city || 'Unspecified'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-3.5 mt-2 border-t border-gray-850 flex items-center justify-between gap-2">
        {player.connectionStatus === 'connected' ? (
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/15 border border-sky-500/40 shadow-sm shadow-sky-500/15"
            title="You are connected with this player"
          >
            <UserCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Connected</span>
          </span>
        ) : player.connectionStatus === 'self' ? (
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 bg-gray-850 border border-gray-700/60"
            title="Your player profile"
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span>You</span>
          </span>
        ) : player.connectionStatus === 'pending_sent' ? (
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30"
            title="Connection request pending"
          >
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>Pending</span>
          </span>
        ) : player.connectionStatus === 'pending_received' ? (
          <button
            type="button"
            onClick={handleConnect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-black bg-emerald-500 hover:bg-emerald-400 transition active:scale-95 shadow-md shadow-emerald-500/20"
            title="Accept incoming connection request"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Accept</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={isActionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition active:scale-95 disabled:opacity-50"
          >
            {isActionLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
            <span>Connect</span>
          </button>
        )}

        <span className="text-xs font-medium text-gray-400 group-hover:text-emerald-400 flex items-center gap-0.5 transition-colors">
          <span>View Profile</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  );
}
