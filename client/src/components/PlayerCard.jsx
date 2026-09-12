import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  MapPin, 
  Users, 
  Sparkles, 
  Activity, 
  Flame, 
  Zap, 
  Target, 
  Calendar,
  Hash,
  User,
  Edit3,
  Settings
} from 'lucide-react';

export default function PlayerCard({ player, isOwner = false, onEdit }) {
  if (!player) return null;

  // Role metadata and icons
  const getRoleBadge = (role) => {
    switch (role) {
      case 'Batter':
        return {
          icon: Flame,
          label: 'Batter',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          badgeEmoji: '🏏',
        };
      case 'Bowler':
        return {
          icon: Target,
          label: 'Bowler',
          color: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
          badgeEmoji: '🎯',
        };
      case 'All-Rounder':
        return {
          icon: Zap,
          label: 'All-Rounder',
          color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          badgeEmoji: '⚡',
        };
      case 'Wicketkeeper':
        return {
          icon: Shield,
          label: 'Wicketkeeper',
          color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          badgeEmoji: '🧤',
        };
      default:
        return {
          icon: Activity,
          label: role || 'Player',
          color: 'bg-gray-800 text-gray-300 border-gray-700',
          badgeEmoji: '🏏',
        };
    }
  };

  const roleMeta = getRoleBadge(player.playingRole);
  const RoleIcon = roleMeta.icon;

  return (
    <div className="relative rounded-3xl bg-gradient-to-b from-[#0f172a] to-[#0a0f1d] border border-gray-800/90 shadow-2xl overflow-hidden">
      
      {/* Stadium Top Banner */}
      <div className="h-36 sm:h-48 bg-gradient-to-r from-emerald-950/70 via-teal-900/40 to-slate-900 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.3),transparent_65%)]" />
        
        {/* Top Badges / Jersey & Privacy */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex flex-wrap items-center justify-end gap-2">
          {player.profileVisibility === 'public' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-sky-500/15 text-sky-300 border-sky-500/30 shadow-lg">
              <span>🌐</span>
              <span>Public Account</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-lg">
              <span>🔒</span>
              <span>Private Account</span>
            </span>
          )}

          {player.jerseyNumber !== undefined && player.jerseyNumber !== null && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold backdrop-blur-md shadow-lg">
              <Hash className="w-3 h-3" />
              <span>{player.jerseyNumber}</span>
            </div>
          )}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${roleMeta.color}`}>
            <span>{roleMeta.badgeEmoji}</span>
            <span>{player.playingRole}</span>
          </span>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="px-6 sm:px-8 pb-8 pt-0 relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-6">
          
          {/* Avatar & Display Name */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 shadow-2xl flex-shrink-0">
              <div className="w-full h-full rounded-[22px] bg-[#0c1220] flex items-center justify-center overflow-hidden">
                {player.profileImage ? (
                  <img
                    src={player.profileImage}
                    alt={player.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl sm:text-5xl font-black text-emerald-400 select-none">
                    {player.displayName ? player.displayName.charAt(0).toUpperCase() : '🏏'}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1 sm:mb-2">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {player.displayName}
                </h1>
                <span className="text-xs font-mono text-emerald-400">
                  @{player.user?.username || player.username || 'cricketer'}
                </span>
              </div>
              
              {player.currentTeam && (
                <p className="text-sm font-semibold text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{player.currentTeam}</span>
                </p>
              )}

              {player.city && (
                <p className="text-xs text-gray-400 flex items-center justify-center sm:justify-start gap-1">
                  <MapPin className="w-3 h-3 text-gray-500" />
                  <span>{player.city}</span>
                </p>
              )}
            </div>
          </div>

          {/* Action buttons if owner */}
          {isOwner && (
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:mb-2">
              <Link
                to="/settings/account"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-gray-900 border border-gray-800 hover:border-gray-700 transition flex items-center gap-1.5 shadow-sm"
                title="Edit login, username and account settings"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit Account</span>
              </Link>
              <Link
                to="/players/me/edit"
                className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                title="Edit cricket attributes, playing role and skills"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Edit Player Profile</span>
              </Link>
              <Link
                to="/settings/privacy"
                className="p-2 sm:p-2.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-amber-400 bg-gray-900 border border-gray-800 hover:border-gray-700 transition flex items-center justify-center shadow-sm group"
                title="Privacy Settings"
                aria-label="Privacy Settings"
              >
                <Settings className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
              </Link>
            </div>
          )}

        </div>

        {/* Cricket Skill Specifications Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-gray-850">
          
          <div className="p-3.5 rounded-2xl bg-[#090d16]/80 border border-gray-800/80">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
              Playing Role
            </p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <RoleIcon className="w-4 h-4 text-emerald-400" />
              {player.playingRole}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#090d16]/80 border border-gray-800/80">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
              Batting Style
            </p>
            <p className="text-sm font-bold text-white">
              {player.battingStyle || 'Right-hand bat'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#090d16]/80 border border-gray-800/80">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
              Bowling Style
            </p>
            <p className="text-sm font-bold text-white">
              {player.bowlingStyle || 'None'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#090d16]/80 border border-gray-800/80">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
              Club / Team
            </p>
            <p className="text-sm font-bold text-white truncate">
              {player.currentTeam || 'Free Agent'}
            </p>
          </div>

        </div>

        {/* Bio */}
        {player.bio && (
          <div className="mt-4 p-4 rounded-2xl bg-[#090d16]/60 border border-gray-800/70">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
              Player Bio
            </p>
            <p className="text-sm text-gray-300 leading-relaxed italic">
              "{player.bio}"
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
