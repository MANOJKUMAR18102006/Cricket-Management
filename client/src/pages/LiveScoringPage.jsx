import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import scoringService from '../services/scoringService';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Crown,
  Shield,
  Trophy,
  Users,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Flame,
  Clock,
  MapPin,
  X,
  Calendar,
} from 'lucide-react';

export default function LiveScoringPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [match, setMatch] = useState(null);
  const [currentInnings, setCurrentInnings] = useState(null);
  const [inningsList, setInningsList] = useState([]);
  const [currentOverDeliveries, setCurrentOverDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('scoring'); // 'scoring' | 'scorecard'

  // Modals
  const [showStartInningsModal, setShowStartInningsModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showEndInningsModal, setShowEndInningsModal] = useState(false);

  // Form states
  const [startForm, setStartForm] = useState({
    inningsNumber: 1,
    battingTeam: '',
    bowlingTeam: '',
    striker: '',
    nonStriker: '',
    bowler: '',
  });

  const [wicketForm, setWicketForm] = useState({
    type: 'bowled',
    dismissedPlayer: '',
    newBatsman: '',
    runs: 0,
  });

  const [newBowlerInput, setNewBowlerInput] = useState('');

  const fetchScoringState = useCallback(async () => {
    try {
      const data = await scoringService.getMatchScoringState(id);
      if (data.success) {
        setMatch(data.match);
        setCurrentInnings(data.currentInnings);
        setInningsList(data.inningsList || []);
        setCurrentOverDeliveries(data.currentOverDeliveries || []);

        // Pre-fill start innings form if not started
        if (!data.currentInnings && data.match) {
          const isTossWinnerTeam1 = data.match.tossWinner === data.match.team1;
          const tossBatted = data.match.tossDecision === 'bat';
          const team1Bats = (isTossWinnerTeam1 && tossBatted) || (!isTossWinnerTeam1 && !tossBatted);

          const battingTeam = team1Bats ? data.match.team1 : data.match.team2;
          const bowlingTeam = team1Bats ? data.match.team2 : data.match.team1;

          setStartForm({
            inningsNumber: 1,
            battingTeam,
            bowlingTeam,
            striker: '',
            nonStriker: '',
            bowler: '',
          });
          setShowStartInningsModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to load scoring state:', err);
      setError(err.response?.data?.message || 'Failed to load match scoring state');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchScoringState();
  }, [fetchScoringState]);

  // Record standard delivery
  const handleRecordDelivery = async (runs, type = 'normal', extraRuns = 0) => {
    if (!currentInnings || currentInnings.status === 'completed') return;

    setActionLoading(true);
    setError('');
    try {
      const payload = { runs, type, extraRuns };
      const res = await scoringService.recordDelivery(match._id, payload);
      if (res.success) {
        setCurrentInnings(res.currentInnings);
        setMatch(res.match);
        setInningsList(res.inningsList || []);
        setCurrentOverDeliveries(res.currentOverDeliveries || []);

        if (res.isOverCompleted) {
          setShowBowlerModal(true);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error recording delivery');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Wicket modal
  const handleWicketSubmit = async (e) => {
    e.preventDefault();
    if (!wicketForm.newBatsman.trim()) {
      alert('Please enter the name of the new incoming batsman.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        runs: Number(wicketForm.runs || 0),
        type: 'wicket',
        wicket: {
          type: wicketForm.type,
          dismissedPlayer: wicketForm.dismissedPlayer || currentInnings?.striker,
          newBatsman: wicketForm.newBatsman.trim(),
        },
      };

      const res = await scoringService.recordDelivery(match._id, payload);
      if (res.success) {
        setCurrentInnings(res.currentInnings);
        setMatch(res.match);
        setInningsList(res.inningsList || []);
        setCurrentOverDeliveries(res.currentOverDeliveries || []);
        setShowWicketModal(false);
        setWicketForm({ type: 'bowled', dismissedPlayer: '', newBatsman: '', runs: 0 });

        if (res.isOverCompleted) {
          setShowBowlerModal(true);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error recording wicket');
    } finally {
      setActionLoading(false);
    }
  };

  // Undo delivery
  const handleUndo = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await scoringService.undoDelivery(match._id);
      if (res.success) {
        setCurrentInnings(res.currentInnings);
        setMatch(res.match);
        setInningsList(res.inningsList || []);
        setCurrentOverDeliveries(res.currentOverDeliveries || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No delivery to undo');
    } finally {
      setActionLoading(false);
    }
  };

  // Swap striker and non-striker
  const handleSwapStrike = async () => {
    setActionLoading(true);
    try {
      const res = await scoringService.changeStriker(match._id);
      if (res.success) {
        setCurrentInnings((prev) => ({
          ...prev,
          striker: res.striker,
          nonStriker: res.nonStriker,
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change striker');
    } finally {
      setActionLoading(false);
    }
  };

  // Change / End Over Bowler
  const handleBowlerSubmit = async (e) => {
    e.preventDefault();
    if (!newBowlerInput.trim()) return;

    setActionLoading(true);
    try {
      const res = await scoringService.endOver(match._id, { newBowler: newBowlerInput.trim() });
      if (res.success) {
        setCurrentInnings((prev) => ({
          ...prev,
          currentBowler: res.currentBowler,
        }));
        setShowBowlerModal(false);
        setNewBowlerInput('');
        fetchScoringState();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to set bowler');
    } finally {
      setActionLoading(false);
    }
  };

  // Start Innings submission
  const handleStartInningsSubmit = async (e) => {
    e.preventDefault();
    if (!startForm.striker.trim() || !startForm.nonStriker.trim() || !startForm.bowler.trim()) {
      alert('Please provide Striker, Non-Striker, and Opening Bowler.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await scoringService.startInnings(match._id, startForm);
      if (res.success) {
        setCurrentInnings(res.currentInnings);
        setMatch(res.match);
        setInningsList(res.inningsList || []);
        setShowStartInningsModal(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start innings');
    } finally {
      setActionLoading(false);
    }
  };

  // End Innings confirmation
  const handleEndInnings = async () => {
    if (!window.confirm('Are you sure you want to conclude this innings?')) return;

    setActionLoading(true);
    try {
      const res = await scoringService.endInnings(match._id);
      if (res.success) {
        alert(res.message);
        // If Innings 1 just ended, prep Innings 2 start modal
        if (currentInnings.inningsNumber === 1) {
          setStartForm({
            inningsNumber: 2,
            battingTeam: currentInnings.bowlingTeam,
            bowlingTeam: currentInnings.battingTeam,
            striker: '',
            nonStriker: '',
            bowler: '',
          });
          setShowStartInningsModal(true);
        }
        fetchScoringState();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to conclude innings');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Opening Live Scoring Console...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#070b13] text-gray-100 py-16 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Match Not Found</h2>
        <Link to="/matches" className="text-emerald-400 text-sm underline mt-2 block">
          Back to Matches
        </Link>
      </div>
    );
  }

  // Live Math calculations
  const totalRuns = currentInnings?.totalRuns || 0;
  const wickets = currentInnings?.wickets || 0;
  const legalBalls = currentInnings?.legalBalls || 0;
  const oversString = currentInnings?.overs || '0.0';
  const target = currentInnings?.target;
  const runsNeeded = target ? target - totalRuns : null;
  const maxLegalBalls = (match.overs || 20) * 6;
  const ballsRemaining = maxLegalBalls - legalBalls;

  const currentRunRate =
    legalBalls > 0 ? ((totalRuns / (legalBalls / 6))).toFixed(2) : '0.00';

  const requiredRunRate =
    runsNeeded && ballsRemaining > 0
      ? ((runsNeeded / (ballsRemaining / 6))).toFixed(2)
      : null;

  // Active Players On Pitch
  const strikerBatsman = currentInnings?.batsmen?.find(
    (b) => b.name === currentInnings.striker
  ) || { name: currentInnings?.striker || 'Striker', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };

  const nonStrikerBatsman = currentInnings?.batsmen?.find(
    (b) => b.name === currentInnings.nonStriker
  ) || { name: currentInnings?.nonStriker || 'Non-Striker', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };

  const activeBowler = currentInnings?.bowlers?.find(
    (b) => b.name === currentInnings.currentBowler
  ) || { name: currentInnings?.currentBowler || 'Bowler', overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, economy: 0 };

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to={`/matches/${match._id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit to Match Details</span>
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                match.status === 'live'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                  : match.status === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gray-800 text-gray-300'
              }`}
            >
              {match.status === 'live' ? '🔴 LIVE SCORING' : match.status.toUpperCase()}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stadium Digital Scoreboard Banner */}
        <div className="bg-gradient-to-b from-[#0c1424] to-[#080d18] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                <span>{match.tournament || 'Match Fixture'}</span>
                <span>•</span>
                <span className="text-emerald-400">{match.format} ({match.overs} Overs)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {match.team1} <span className="text-gray-500 font-normal">vs</span> {match.team2}
              </h1>
            </div>

            {/* Innings selector buttons */}
            <div className="flex items-center gap-2">
              {inningsList.map((inn) => (
                <button
                  key={inn._id}
                  onClick={() => setCurrentInnings(inn)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition ${
                    currentInnings?._id === inn._id
                      ? 'bg-emerald-500 text-black shadow'
                      : 'bg-gray-850 text-gray-400 hover:text-white'
                  }`}
                >
                  Inn {inn.inningsNumber}: {inn.totalRuns}/{inn.wickets}
                </button>
              ))}
              {!currentInnings && (
                <button
                  onClick={() => setShowStartInningsModal(true)}
                  className="px-4 py-2 bg-emerald-500 text-black font-bold text-xs rounded-xl shadow hover:bg-emerald-400 transition"
                >
                  Start Innings 1
                </button>
              )}
            </div>
          </div>

          {/* Core Score Display */}
          {currentInnings ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-extrabold uppercase text-emerald-400 tracking-wider">
                    {currentInnings.battingTeam} Batting (Innings {currentInnings.inningsNumber})
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl sm:text-6xl font-black font-mono text-white tracking-tight">
                      {totalRuns}/{wickets}
                    </span>
                    <span className="text-xl sm:text-2xl font-mono text-gray-400 font-bold">
                      ({oversString} / {match.overs} ov)
                    </span>
                  </div>
                </div>

                {/* Run Rate & Target Ribbon */}
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-[#090e1a] border border-gray-800">
                    <span className="text-gray-400 block text-[10px] uppercase">CRR</span>
                    <strong className="text-base text-white">{currentRunRate}</strong>
                  </div>

                  {target && (
                    <>
                      <div className="p-2.5 rounded-xl bg-[#090e1a] border border-gray-800">
                        <span className="text-gray-400 block text-[10px] uppercase">Target</span>
                        <strong className="text-base text-amber-300">{target}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#090e1a] border border-emerald-500/30">
                        <span className="text-emerald-400 block text-[10px] uppercase">Need</span>
                        <strong className="text-base text-emerald-400">{runsNeeded > 0 ? runsNeeded : 0} off {ballsRemaining}b</strong>
                      </div>
                      {requiredRunRate && (
                        <div className="p-2.5 rounded-xl bg-[#090e1a] border border-gray-800">
                          <span className="text-gray-400 block text-[10px] uppercase">RRR</span>
                          <strong className="text-base text-teal-300">{requiredRunRate}</strong>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Match Result Banner if Completed */}
              {match.status === 'completed' && match.result && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs uppercase font-bold text-gray-400">Match Concluded</span>
                    <p className="text-base font-black text-emerald-300">{match.result}</p>
                  </div>
                </div>
              )}

              {/* Recent Balls in Over tracker */}
              <div className="p-3 bg-[#090e1a] border border-gray-800 rounded-2xl flex items-center justify-between gap-3 overflow-x-auto">
                <span className="text-[11px] uppercase font-bold text-gray-400 shrink-0">This Over:</span>
                <div className="flex items-center gap-2">
                  {currentOverDeliveries.length > 0 ? (
                    currentOverDeliveries.map((d, i) => {
                      let badgeColor = 'bg-gray-800 text-gray-200 border-gray-700';
                      let label = `${d.runsScored}`;

                      if (d.type === 'wicket') {
                        badgeColor = 'bg-red-500 text-black font-black border-red-400';
                        label = 'W';
                      } else if (d.type === 'wide') {
                        badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                        label = d.totalDeliveryRuns > 1 ? `${d.totalDeliveryRuns}Wd` : 'Wd';
                      } else if (d.type === 'no_ball') {
                        badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                        label = 'Nb';
                      } else if (d.runsScored === 4) {
                        badgeColor = 'bg-teal-500/20 text-teal-300 border-teal-500/30 font-bold';
                        label = '4';
                      } else if (d.runsScored === 6) {
                        badgeColor = 'bg-emerald-500 text-black font-black border-emerald-400';
                        label = '6';
                      }

                      return (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-xs shadow-sm ${badgeColor}`}
                          title={`${d.bowler} to ${d.striker}`}
                        >
                          {label}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-gray-500 italic">No balls bowled in this over yet</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <Sparkles className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Innings Not Started</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Set opening batsmen and opening bowler to start recording ball-by-ball deliveries.
              </p>
              <button
                onClick={() => setShowStartInningsModal(true)}
                className="px-5 py-2.5 bg-emerald-500 text-black font-bold text-xs rounded-xl shadow hover:bg-emerald-400 transition"
              >
                Start Innings 1
              </button>
            </div>
          )}
        </div>

        {/* Tab Switcher: Scoring Console vs Full Scorecard */}
        <div className="flex rounded-2xl bg-[#0c1424] p-1 border border-gray-800">
          <button
            onClick={() => setActiveTab('scoring')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'scoring'
                ? 'bg-emerald-500 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Live Scoring Console
          </button>
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'scorecard'
                ? 'bg-emerald-500 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Full Scorecard Tables
          </button>
        </div>

        {/* TAB 1: SCORING CONSOLE */}
        {activeTab === 'scoring' && currentInnings && (
          <div className="space-y-6">

            {/* Pitch Matchup Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Striker Card */}
              <div className="p-4 bg-[#0c1424] border-2 border-emerald-500/50 rounded-2xl shadow-lg relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    🏏 Striker
                  </span>
                  <span className="text-[11px] text-gray-400 font-mono">SR: {strikerBatsman.strikeRate}</span>
                </div>
                <h4 className="text-lg font-bold text-white truncate">{strikerBatsman.name}</h4>
                <div className="flex items-baseline gap-2 mt-1 font-mono">
                  <span className="text-2xl font-black text-white">{strikerBatsman.runs}</span>
                  <span className="text-xs text-gray-400">({strikerBatsman.balls} balls)</span>
                  <span className="text-xs text-gray-500 ml-auto">{strikerBatsman.fours} 4s • {strikerBatsman.sixes} 6s</span>
                </div>
              </div>

              {/* Non-Striker Card */}
              <div className="p-4 bg-[#0c1424] border border-gray-800 rounded-2xl shadow-lg relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-800 text-gray-300">
                    Non-Striker
                  </span>
                  <button
                    onClick={handleSwapStrike}
                    disabled={actionLoading}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                    title="Swap striker and non-striker ends"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Swap</span>
                  </button>
                </div>
                <h4 className="text-lg font-bold text-white truncate">{nonStrikerBatsman.name}</h4>
                <div className="flex items-baseline gap-2 mt-1 font-mono">
                  <span className="text-2xl font-black text-gray-200">{nonStrikerBatsman.runs}</span>
                  <span className="text-xs text-gray-400">({nonStrikerBatsman.balls} balls)</span>
                  <span className="text-xs text-gray-500 ml-auto">{nonStrikerBatsman.fours} 4s • {nonStrikerBatsman.sixes} 6s</span>
                </div>
              </div>

              {/* Bowler Card */}
              <div className="p-4 bg-[#0c1424] border border-gray-800 rounded-2xl shadow-lg relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    Bowler
                  </span>
                  <button
                    onClick={() => setShowBowlerModal(true)}
                    className="text-[11px] text-teal-400 hover:underline"
                  >
                    Change
                  </button>
                </div>
                <h4 className="text-lg font-bold text-white truncate">{activeBowler.name}</h4>
                <div className="flex items-baseline gap-2 mt-1 font-mono">
                  <span className="text-2xl font-black text-teal-300">{activeBowler.wickets}-{activeBowler.runsConceded}</span>
                  <span className="text-xs text-gray-400">({activeBowler.overs} ov)</span>
                  <span className="text-xs text-gray-500 ml-auto">Econ: {activeBowler.economy}</span>
                </div>
              </div>

            </div>

            {/* Quick-Tap Digital Scoring Keypad */}
            {match.status !== 'completed' && (
              <div className="bg-[#0c1424] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Record Next Delivery</span>
                </h3>

                {/* Primary Runs Row */}
                <div className="grid grid-cols-6 gap-2 sm:gap-3">
                  {[
                    { runs: 0, label: '0', sub: 'Dot', style: 'bg-gray-850 hover:bg-gray-800 text-white' },
                    { runs: 1, label: '1', sub: 'Single', style: 'bg-gray-850 hover:bg-gray-800 text-white' },
                    { runs: 2, label: '2', sub: 'Two', style: 'bg-gray-850 hover:bg-gray-800 text-white' },
                    { runs: 3, label: '3', sub: 'Three', style: 'bg-gray-850 hover:bg-gray-800 text-white' },
                    { runs: 4, label: '4', sub: 'FOUR', style: 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40' },
                    { runs: 6, label: '6', sub: 'SIX', style: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' },
                  ].map((btn) => (
                    <button
                      key={btn.runs}
                      onClick={() => handleRecordDelivery(btn.runs, 'normal')}
                      disabled={actionLoading}
                      className={`py-3.5 sm:py-4 rounded-2xl font-black font-mono text-xl sm:text-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex flex-col items-center justify-center ${btn.style}`}
                    >
                      <span>{btn.label}</span>
                      <span className="text-[10px] font-sans font-medium opacity-70">{btn.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Extras & Events Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 pt-2">
                  <button
                    onClick={() => {
                      setWicketForm({
                        type: 'bowled',
                        dismissedPlayer: currentInnings.striker,
                        newBatsman: '',
                        runs: 0,
                      });
                      setShowWicketModal(true);
                    }}
                    disabled={actionLoading}
                    className="py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition flex items-center justify-center gap-1.5"
                  >
                    <span>🔴 WICKET</span>
                  </button>

                  <button
                    onClick={() => handleRecordDelivery(0, 'wide', 1)}
                    disabled={actionLoading}
                    className="py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition"
                  >
                    Wide (+1)
                  </button>

                  <button
                    onClick={() => handleRecordDelivery(0, 'no_ball', 1)}
                    disabled={actionLoading}
                    className="py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition"
                  >
                    No Ball (+1)
                  </button>

                  <button
                    onClick={() => handleRecordDelivery(1, 'bye', 0)}
                    disabled={actionLoading}
                    className="py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm bg-gray-850 hover:bg-gray-800 text-gray-300 transition"
                  >
                    Bye (1b)
                  </button>

                  <button
                    onClick={() => handleRecordDelivery(1, 'leg_bye', 0)}
                    disabled={actionLoading}
                    className="py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm bg-gray-850 hover:bg-gray-800 text-gray-300 transition"
                  >
                    Leg Bye (1lb)
                  </button>
                </div>

                {/* Match Operations Row */}
                <div className="pt-3 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={actionLoading || currentInnings.deliveries?.length === 0}
                    className="px-4 py-2 bg-gray-850 hover:bg-gray-800 text-gray-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo Last Ball</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowBowlerModal(true)}
                      className="px-3.5 py-2 bg-gray-850 hover:bg-gray-800 text-gray-300 text-xs font-semibold rounded-xl transition"
                    >
                      End Over Manually
                    </button>

                    <button
                      onClick={handleEndInnings}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold rounded-xl transition"
                    >
                      Conclude Innings
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 2: FULL SCORECARD TABLES */}
        {activeTab === 'scorecard' && currentInnings && (
          <div className="space-y-6 bg-[#0c1424] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            
            {/* Batting Scorecard Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <span>{currentInnings.battingTeam} Batting Scorecard</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 pr-4">Batter</th>
                      <th className="py-2.5 px-3">Dismissal</th>
                      <th className="py-2.5 px-2 text-right">R</th>
                      <th className="py-2.5 px-2 text-right">B</th>
                      <th className="py-2.5 px-2 text-right">4s</th>
                      <th className="py-2.5 px-2 text-right">6s</th>
                      <th className="py-2.5 pl-3 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono">
                    {currentInnings.batsmen?.map((b, idx) => (
                      <tr key={idx} className="hover:bg-gray-900/40">
                        <td className="py-2.5 pr-4 font-sans font-bold text-white flex items-center gap-1.5">
                          <span>{b.name}</span>
                          {b.name === currentInnings.striker && <span className="text-emerald-400 text-[10px]">🏏*</span>}
                          {b.name === currentInnings.nonStriker && <span className="text-gray-400 text-[10px]">*</span>}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-gray-400 text-[11px] capitalize">
                          {b.isOut ? b.dismissal : 'Not out'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-black text-white">{b.runs}</td>
                        <td className="py-2.5 px-2 text-right text-gray-400">{b.balls}</td>
                        <td className="py-2.5 px-2 text-right text-gray-400">{b.fours}</td>
                        <td className="py-2.5 px-2 text-right text-gray-400">{b.sixes}</td>
                        <td className="py-2.5 pl-3 text-right text-teal-400">{b.strikeRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Extras note */}
              <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-gray-800">
                <span>
                  <strong>Extras:</strong> {currentInnings.extras?.total || 0} (w {currentInnings.extras?.wides || 0}, nb {currentInnings.extras?.noBalls || 0}, b {currentInnings.extras?.byes || 0}, lb {currentInnings.extras?.legByes || 0})
                </span>
                <span className="font-mono font-bold text-white">
                  Total: {totalRuns}/{wickets} ({oversString} ov)
                </span>
              </div>
            </div>

            {/* Bowling Scorecard Table */}
            <div className="space-y-3 pt-6 border-t border-gray-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400">
                <span>{currentInnings.bowlingTeam} Bowling Figures</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 pr-4">Bowler</th>
                      <th className="py-2.5 px-2 text-right">O</th>
                      <th className="py-2.5 px-2 text-right">M</th>
                      <th className="py-2.5 px-2 text-right">R</th>
                      <th className="py-2.5 px-2 text-right">W</th>
                      <th className="py-2.5 pl-3 text-right">ECON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono">
                    {currentInnings.bowlers?.map((bowl, idx) => (
                      <tr key={idx} className="hover:bg-gray-900/40">
                        <td className="py-2.5 pr-4 font-sans font-bold text-white flex items-center gap-1.5">
                          <span>{bowl.name}</span>
                          {bowl.name === currentInnings.currentBowler && (
                            <span className="text-teal-400 text-[10px]">★</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right text-gray-300">{bowl.overs}</td>
                        <td className="py-2.5 px-2 text-right text-gray-400">{bowl.maidens}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-white">{bowl.runsConceded}</td>
                        <td className="py-2.5 px-2 text-right font-black text-teal-300">{bowl.wickets}</td>
                        <td className="py-2.5 pl-3 text-right text-emerald-400">{bowl.economy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODAL 1: START INNINGS */}
      {showStartInningsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e1526] border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="border-b border-gray-800 pb-4">
              <h3 className="text-lg font-bold text-white">Start Innings {startForm.inningsNumber}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Set the opening batsmen and the bowler for the first over.
              </p>
            </div>

            <form onSubmit={handleStartInningsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Batting Team</label>
                  <input
                    type="text"
                    value={startForm.battingTeam}
                    onChange={(e) => setStartForm((prev) => ({ ...prev, battingTeam: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#080d18] border border-gray-800 rounded-xl text-white text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Bowling Team</label>
                  <input
                    type="text"
                    value={startForm.bowlingTeam}
                    onChange={(e) => setStartForm((prev) => ({ ...prev, bowlingTeam: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#080d18] border border-gray-800 rounded-xl text-white text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Opening Striker 🏏 *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Virat Kohli"
                  value={startForm.striker}
                  onChange={(e) => setStartForm((prev) => ({ ...prev, striker: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#080d18] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Opening Non-Striker *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rohit Sharma"
                  value={startForm.nonStriker}
                  onChange={(e) => setStartForm((prev) => ({ ...prev, nonStriker: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#080d18] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Opening Bowler *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jasprit Bumrah"
                  value={startForm.bowler}
                  onChange={(e) => setStartForm((prev) => ({ ...prev, bowler: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#080d18] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow transition"
                >
                  Start Innings & Begin Scoring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: WICKET ENTRY */}
      {showWicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e1526] border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-red-400">🔴</span> Record Wicket
              </h3>
              <button onClick={() => setShowWicketModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWicketSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Dismissal Type</label>
                <select
                  value={wicketForm.type}
                  onChange={(e) => setWicketForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#080d18] border border-gray-800 rounded-xl text-white text-xs"
                >
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="lbw">LBW</option>
                  <option value="run_out">Run Out</option>
                  <option value="stumped">Stumped</option>
                  <option value="hit_wicket">Hit Wicket</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Dismissed Batsman</label>
                <select
                  value={wicketForm.dismissedPlayer || currentInnings?.striker}
                  onChange={(e) => setWicketForm((prev) => ({ ...prev, dismissedPlayer: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#080d18] border border-gray-800 rounded-xl text-white text-xs"
                >
                  <option value={currentInnings?.striker}>{currentInnings?.striker} (Striker)</option>
                  <option value={currentInnings?.nonStriker}>{currentInnings?.nonStriker} (Non-Striker)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  New Incoming Batsman *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suryakumar Yadav"
                  value={wicketForm.newBatsman}
                  onChange={(e) => setWicketForm((prev) => ({ ...prev, newBatsman: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#080d18] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 bg-red-500 hover:bg-red-400 text-black font-bold text-xs rounded-xl shadow transition"
                >
                  Confirm Wicket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NEW BOWLER */}
      {showBowlerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e1526] border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Over Completed</h3>
            <p className="text-xs text-gray-400">
              6 legal balls bowled. Select the bowler for the next over.
            </p>

            <form onSubmit={handleBowlerSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Next Bowler *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mohammed Siraj"
                  value={newBowlerInput}
                  onChange={(e) => setNewBowlerInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#080d18] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow transition"
                >
                  Confirm Bowler
                </button>
                <button
                  type="button"
                  onClick={() => setShowBowlerModal(false)}
                  className="px-4 py-2.5 bg-gray-800 text-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-700"
                >
                  Skip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
