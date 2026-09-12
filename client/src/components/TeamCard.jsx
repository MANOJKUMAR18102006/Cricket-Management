import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  MapPin,
  Crown,
  UserCheck,
  ChevronRight,
  Settings,
} from 'lucide-react';

/**
 * Reusable TeamCard Component
 * Consistent with CrickPulse modern dark stadium aesthetic.
 *
 * Props:
 * - team: Object (team data including name, logo, city, description, captain, viceCaptain, stats, membersCount, playerRole, isCaptain)
 * - isMyTeam: Boolean (whether rendered in My Teams context)
 * - roleBadge: String (Optional override: 'captain' | 'member')
 */
export default function TeamCard({ team, isMyTeam = false, roleBadge }) {
  const matchesCount = team.stats?.matchesCount || 0;
  const wins = team.stats?.wins || 0;
  const losses = team.stats?.losses || 0;
  const memberCount = team.membersCount || (team.members ? team.members.length : 0);
  
  const isCaptain = roleBadge === 'captain' || team.isCaptain || team.playerRole === 'Captain';
  const isMember = roleBadge === 'member' || (!isCaptain && (isMyTeam || team.playerRole));

  return (
    <div
      className={`bg-[#0e1526]/85 hover:bg-[#0e1526] border rounded-2xl p-5 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/5 group flex flex-col justify-between ${
        isCaptain
          ? 'border-amber-500/40 hover:border-amber-400/70 bg-gradient-to-b from-[#0e1526] to-[#121624] ring-1 ring-amber-500/10'
          : isMember
          ? 'border-emerald-500/40 hover:border-emerald-400/70 bg-gradient-to-b from-[#0e1526] to-[#0a1424] ring-1 ring-emerald-500/10'
          : 'border-gray-800/90 hover:border-emerald-500/40'
      }`}
    >
      <div className="space-y-4">
        {/* Top row: Logo, Name, City, Relationship Badges, Record */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gray-900 to-gray-800 border border-gray-700/60 overflow-hidden flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              {team.logo ? (
                <img
                  src={team.logo}
                  alt={team.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '';
                  }}
                />
              ) : (
                <Shield className="w-7 h-7 text-emerald-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {team.name}
                </h3>
              </div>

              {/* Badges */}
              {(isMyTeam || isCaptain || isMember) && (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {isCaptain ? (
                    <>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider">
                        YOUR TEAM
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                        <Crown className="w-3 h-3 text-amber-400" />
                        CAPTAIN
                      </span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-black uppercase tracking-wider">
                      <UserCheck className="w-3 h-3 text-teal-400" />
                      MEMBER
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate">{team.city}</span>
              </div>
            </div>
          </div>

          {/* Win - Loss Record Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono shrink-0">
            {wins}W - {losses}L
          </div>
        </div>

        {/* Description */}
        {team.description ? (
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
            {team.description}
          </p>
        ) : (
          <p className="text-xs text-gray-500 italic">No description provided.</p>
        )}

        {/* Captain & Leadership info */}
        <div className="p-3 bg-[#090d16] border border-gray-800/80 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-gray-300">
            <span className="flex items-center gap-1 text-gray-400">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> Captain:
            </span>
            <span className="font-semibold text-white truncate max-w-[160px]">
              {team.captain ? team.captain.displayName || team.captain.name || 'TBD' : 'TBD'}
            </span>
          </div>

          {team.viceCaptain && (
            <div className="flex items-center justify-between text-gray-300">
              <span className="text-gray-400">Vice Captain:</span>
              <span className="font-medium text-gray-200 truncate max-w-[160px]">
                {team.viceCaptain.displayName || team.viceCaptain.name}
              </span>
            </div>
          )}

          {/* Player's role in this team */}
          {isMyTeam && team.playerRole && (
            <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-gray-800/80 text-xs">
              <span className="text-gray-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                Role:
              </span>
              <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {team.playerRole}
              </span>
            </div>
          )}
        </div>

        {/* Meta stats pills */}
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="p-2 bg-gray-900/50 rounded-lg border border-gray-800">
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Squad</span>
            <strong className="text-white font-mono">{memberCount} Players</strong>
          </div>
          <div className="p-2 bg-gray-900/50 rounded-lg border border-gray-800">
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Matches</span>
            <strong className="text-white font-mono">{matchesCount} Played</strong>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 mt-4 border-t border-gray-800/80 flex items-center gap-2">
        <Link
          to={`/teams/${team._id}`}
          className="flex-1 py-2.5 px-4 bg-gray-850 hover:bg-emerald-500 hover:text-black font-semibold text-xs text-gray-200 rounded-xl transition-all flex items-center justify-center gap-1.5 group-hover:shadow-md"
        >
          <span>View Team Profile</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>

        {isCaptain && (
          <Link
            to={`/teams/${team._id}?manage=true`}
            className="py-2.5 px-3 bg-amber-500/15 hover:bg-amber-500 hover:text-black text-amber-300 font-semibold text-xs rounded-xl border border-amber-500/30 transition-all flex items-center justify-center gap-1"
            title="Manage Team"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Manage</span>
          </Link>
        )}
      </div>
    </div>
  );
}
