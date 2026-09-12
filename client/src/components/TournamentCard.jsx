import React from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  MapPin,
  Calendar,
  Users,
  Shield,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function TournamentCard({ tournament, isMyTournament = false, myRole = '', teamName = '' }) {
  if (!tournament) return null;

  const startDateFormatted = tournament.startDate
    ? new Date(tournament.startDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  const endDateFormatted = tournament.endDate
    ? new Date(tournament.endDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  const teamsCount = tournament.teams ? tournament.teams.length : 0;
  const maxTeams = tournament.maxTeams || 8;
  const organizerName =
    tournament.organizer?.username || tournament.organizer?.displayName || 'CrickPulse Organizer';

  const displayTeam = teamName || tournament.participatingTeamName;
  const displayRole = myRole || tournament.myRole;

  // Format status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ongoing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        );
      case 'registration_open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold font-mono">
            <Clock className="w-3 h-3 text-amber-300" />
            REGISTRATION OPEN
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-xs font-bold font-mono">
            <CheckCircle2 className="w-3 h-3" />
            COMPLETED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold font-mono">
            CANCELLED
          </span>
        );
      case 'upcoming':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold font-mono">
            <Calendar className="w-3 h-3" />
            UPCOMING
          </span>
        );
    }
  };

  return (
    <div
      className={`bg-[#0e1526]/85 hover:bg-[#0e1526] border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/5 group flex flex-col justify-between ${
        isMyTournament
          ? 'border-emerald-500/40 ring-1 ring-emerald-500/10'
          : 'border-gray-800/90 hover:border-emerald-500/40'
      }`}
    >
      <div>
        {/* Banner Image or Top Aesthetic Header */}
        <div className="relative h-32 w-full bg-gradient-to-tr from-gray-900 via-[#0a1220] to-[#0d1d36] overflow-hidden flex items-center justify-center">
          {tournament.banner ? (
            <img
              src={tournament.banner}
              alt={tournament.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '';
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-25">
              <Trophy className="w-24 h-24 text-emerald-400 -rotate-12" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1526] via-transparent to-black/40" />

          {/* Top Status & Role Pill */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
            <div>{getStatusBadge(tournament.status)}</div>

            {displayRole && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                {displayRole}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-400 mb-1">
              <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 font-mono">
                {tournament.format} • {tournament.overs} Overs
              </span>
            </div>

            <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
              {tournament.name}
            </h3>

            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
              <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="truncate">{tournament.location}, {tournament.city}</span>
            </div>
          </div>

          {/* Description snippet */}
          {tournament.description && (
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
              {tournament.description}
            </p>
          )}

          {/* Meta Grid: Dates & Teams */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2.5 bg-[#080d17] rounded-xl border border-gray-800/80">
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Teams</span>
              <strong className="text-white font-mono flex items-center justify-center gap-1 mt-0.5">
                <Users className="w-3 h-3 text-emerald-400" />
                {teamsCount} / {maxTeams}
              </strong>
            </div>
            <div className="p-2.5 bg-[#080d17] rounded-xl border border-gray-800/80">
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Dates</span>
              <strong className="text-gray-200 font-mono text-[11px] block truncate mt-0.5" title={`${startDateFormatted} → ${endDateFormatted}`}>
                {startDateFormatted}
              </strong>
            </div>
          </div>

          {/* Organizer / Participating Team Info */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            {displayTeam ? (
              <>
                <span className="flex items-center gap-1 text-gray-400">
                  <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Team:</span>
                </span>
                <span className="text-emerald-400 font-semibold truncate max-w-[170px]" title={displayTeam}>
                  {displayTeam}
                </span>
              </>
            ) : (
              <>
                <span>Organizer:</span>
                <span className="text-gray-200 font-medium truncate max-w-[170px]">@{organizerName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-5 pt-0">
        <Link
          to={`/tournaments/${tournament._id}`}
          className="w-full py-2.5 px-4 bg-gray-850 hover:bg-emerald-500 hover:text-black font-semibold text-xs text-gray-200 rounded-xl transition-all flex items-center justify-center gap-1.5 group-hover:shadow-md"
        >
          <span>View Tournament</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
