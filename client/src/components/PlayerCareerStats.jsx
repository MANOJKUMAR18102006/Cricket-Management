import React, { useState, useEffect, useCallback } from 'react';
import playerService from '../services/playerService';
import {
  BarChart3,
  Flame,
  Target,
  Trophy,
  Shield,
  Activity,
  Layers,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

const FORMATS = ['Overall', 'T20', 'T10', 'ODI'];

export default function PlayerCareerStats({ playerId }) {
  const [selectedFormat, setSelectedFormat] = useState('Overall');
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    setError('');
    try {
      const formatParam = selectedFormat === 'Overall' ? 'all' : selectedFormat;
      const res = await playerService.getPlayerStats(playerId, formatParam);
      if (res.success && res.stats) {
        setStatsData(res.stats);
      }
    } catch (err) {
      if (err.response?.data?.privacyRestricted) {
        setError('This player account is private. Connect with this player to view their career statistics.');
      } else {
        setError('Could not load career statistics at this time.');
      }
    } finally {
      setLoading(false);
    }
  }, [playerId, selectedFormat]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const batting = statsData?.batting || {
    matches: 0,
    innings: 0,
    runs: 0,
    balls: 0,
    highestScore: '0',
    battingAverage: '0.00',
    strikeRate: '0.00',
    fours: 0,
    sixes: 0,
    fifties: 0,
    hundreds: 0,
  };

  const bowling = statsData?.bowling || {
    matches: 0,
    innings: 0,
    overs: '0.0',
    runsConceded: 0,
    wickets: 0,
    bestBowling: '-',
    bowlingAverage: '0.00',
    economy: '0.00',
  };

  const fielding = statsData?.fielding || {
    catches: 0,
    runOuts: 0,
    stumpings: 0,
  };

  return (
    <div className="bg-[#0c1220] border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
      
      {/* Header with Format Selector & Integrity Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Automatic Career Performance</span>
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">
            Player Career Statistics
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Aggregated dynamically from official completed match performances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Read-Only Verified Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Career statistics are automatically computed from match scores and cannot be manually edited">
            <Shield className="w-3.5 h-3.5" />
            <span>Verified Match Records</span>
          </div>

          {/* Format Pills */}
          <div className="flex rounded-xl bg-[#070b14] p-1 border border-gray-800">
            {FORMATS.map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  selectedFormat === fmt
                    ? 'bg-emerald-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs text-gray-400 font-mono">Calculating career statistics...</span>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* ============================================================ */}
          {/* SECTION 1: BATTING CAREER RECORD                             */}
          {/* ============================================================ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-400" />
                <span>Batting Record ({selectedFormat})</span>
              </h4>
              <span className="text-xs text-gray-400 font-mono">
                {batting.innings} Innings Batted
              </span>
            </div>

            {/* Top Batting Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0e172a] to-[#090d18] border border-gray-800">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Total Runs</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">{batting.runs}</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">{batting.balls} balls faced</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0e172a] to-[#090d18] border border-gray-800">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Highest Score</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-white">{batting.highestScore}</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">Best knock</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0e172a] to-[#090d18] border border-gray-800">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Batting Average</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-teal-300">{batting.battingAverage}</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">Runs / Dismissal</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0e172a] to-[#090d18] border border-gray-800">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Strike Rate</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300">{batting.strikeRate}</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">Runs per 100 balls</span>
              </div>
            </div>

            {/* Detailed Batting Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Matches</span>
                <strong className="text-white text-base">{batting.matches}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Innings</span>
                <strong className="text-white text-base">{batting.innings}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Fours (4s)</span>
                <strong className="text-teal-400 text-base">{batting.fours}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Sixes (6s)</span>
                <strong className="text-emerald-400 text-base">{batting.sixes}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Fifties (50s)</span>
                <strong className="text-amber-400 text-base">{batting.fifties}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Hundreds (100s)</span>
                <strong className="text-purple-400 text-base">{batting.hundreds}</strong>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 2: BOWLING CAREER RECORD                             */}
          {/* ============================================================ */}
          <div className="space-y-4 pt-6 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-teal-400" />
                <span>Bowling Record ({selectedFormat})</span>
              </h4>
              <span className="text-xs text-gray-400 font-mono">
                {bowling.innings} Innings Bowled
              </span>
            </div>

            {/* Top Bowling Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0e172a] to-[#090d18] border border-gray-800">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Wickets</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-teal-300">{bowling.wickets}</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">{bowling.overs} overs bowled</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0e172a] to-[#090d18] border border-gray-800">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Best Figures</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-white">{bowling.bestBowling}</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">Single innings best</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0e172a] to-[#090d18] border border-gray-800">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Economy</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">{bowling.economy}</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">Runs per over</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0e172a] to-[#090d18] border border-gray-800">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Bowling Average</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300">{bowling.bowlingAverage}</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">Runs per wicket</span>
              </div>
            </div>

            {/* Detailed Bowling Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Matches</span>
                <strong className="text-white text-base">{bowling.matches}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Innings</span>
                <strong className="text-white text-base">{bowling.innings}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Overs Bowled</span>
                <strong className="text-teal-400 text-base">{bowling.overs}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Runs Conceded</span>
                <strong className="text-red-400 text-base">{bowling.runsConceded}</strong>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 3: FIELDING CAREER RECORD                            */}
          {/* ============================================================ */}
          <div className="space-y-4 pt-6 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Fielding & Wicketkeeping Record</span>
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Catches</span>
                <strong className="text-2xl font-black font-mono text-purple-400">{fielding.catches}</strong>
                <span className="text-[10px] text-gray-500 block mt-0.5">Caught dismissals</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Run Outs</span>
                <strong className="text-2xl font-black font-mono text-amber-400">{fielding.runOuts}</strong>
                <span className="text-[10px] text-gray-500 block mt-0.5">Direct & assisted</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#080d18] border border-gray-800">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Stumpings</span>
                <strong className="text-2xl font-black font-mono text-teal-400">{fielding.stumpings}</strong>
                <span className="text-[10px] text-gray-500 block mt-0.5">Wicketkeeper dismissals</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
