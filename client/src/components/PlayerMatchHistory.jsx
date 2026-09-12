import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import playerService from '../services/playerService';
import {
  Calendar,
  MapPin,
  Trophy,
  ChevronRight,
  Flame,
  Target,
  Shield,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function PlayerMatchHistory({ playerId }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatches = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    setError('');
    try {
      const res = await playerService.getPlayerMatches(playerId);
      if (res.success && Array.isArray(res.matches)) {
        setMatches(res.matches);
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.data?.privacyRestricted) {
        setError('🔒 Match history is private. Connect with this player to view their match performance.');
      } else {
        setError('Could not load match history at this time.');
      }
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-8 flex flex-col items-center justify-center min-h-[220px]">
        <div className="w-9 h-9 rounded-full border-3 border-emerald-500/20 border-t-emerald-400 animate-spin mb-3" />
        <p className="text-xs text-gray-400 font-medium">Loading match history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-[#0c1220] border border-amber-500/30 p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white mb-1">Match History Restricted</h4>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">{error}</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-3xl bg-[#0c1220] border border-gray-800/80 p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-800/60 text-gray-500 flex items-center justify-center mx-auto mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white mb-1">No Match Appearances Yet</h4>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Completed and live fixtures in which this player participated will automatically appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-white">Match History & Appearances</h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {matches.length} Matches
          </span>
        </div>
        <Link
          to={`/players/${playerId}/matches`}
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
        >
          <span>Full History & Career Timeline</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {matches.map((item) => {
          const matchDate = item.date
            ? new Date(item.date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'Recent';

          const perf = item.performance || {};
          const bat = perf.batting;
          const bowl = perf.bowling;
          const fld = perf.fielding;

          return (
            <div
              key={item.matchId}
              className="rounded-2xl bg-[#0a0f1d] border border-gray-800/80 hover:border-gray-700 transition p-5 shadow-lg relative group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Match Details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.format}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      {matchDate}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-500" />
                      {item.city || item.venue}
                    </span>
                  </div>

                  <h4 className="text-base font-extrabold text-white group-hover:text-emerald-400 transition">
                    {item.team1} <span className="text-gray-500 font-normal">vs</span> {item.team2}
                  </h4>

                  {item.result && (
                    <p className="text-xs font-semibold text-emerald-400/90">
                      🏆 {item.result}
                    </p>
                  )}
                </div>

                {/* Player's Performance Breakdown in this Match */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-[#0c1426] p-3 rounded-xl border border-gray-800/60">
                  {bat && (
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">Bat</span>
                      <span className="text-xs font-black text-white">
                        {bat.runs} <span className="text-[10px] font-normal text-gray-400">({bat.balls}b)</span>
                      </span>
                    </div>
                  )}

                  {bowl && (
                    <div className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-center">
                      <span className="text-[10px] uppercase font-bold text-teal-400 block">Bowl</span>
                      <span className="text-xs font-black text-white">
                        {bowl.wickets}/{bowl.runsConceded}
                      </span>
                    </div>
                  )}

                  {fld && (fld.catches > 0 || fld.runOuts > 0 || fld.stumpings > 0) && (
                    <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block">Field</span>
                      <span className="text-xs font-black text-white">
                        {fld.catches}c {fld.runOuts > 0 ? `• ${fld.runOuts}ro` : ''}
                      </span>
                    </div>
                  )}

                  <Link
                    to={`/matches/${item.matchId}`}
                    className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white transition flex items-center gap-1 text-xs font-semibold ml-auto"
                  >
                    <span>Scorecard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
