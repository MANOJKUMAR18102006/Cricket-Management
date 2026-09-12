import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import playerService from '../services/playerService';
import connectionService from '../services/connectionService';
import LoginPromptModal from '../components/LoginPromptModal';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Swords,
  Trophy,
  Lock,
  UserPlus,
  Clock,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Shield,
  Activity,
  ArrowRight,
  Flame,
  Target,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

const FORMAT_OPTIONS = ['Overall', 'T10', 'T20', 'ODI', 'Custom'];

export default function PlayerComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const playerQueryParam = searchParams.get('player') || searchParams.get('player2') || '';
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [extraPlayerB, setExtraPlayerB] = useState(null);
  const [selectedPlayerBId, setSelectedPlayerBId] = useState(playerQueryParam);
  const [selectedFormat, setSelectedFormat] = useState(searchParams.get('format') || 'Overall');

  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [isPrivateRestricted, setIsPrivateRestricted] = useState(false);
  const [restrictionMessage, setRestrictionMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Sync selectedPlayerBId when searchParams changes
  useEffect(() => {
    const pId = searchParams.get('player') || searchParams.get('player2');
    if (pId && pId !== selectedPlayerBId) {
      setSelectedPlayerBId(pId);
    }
  }, [searchParams]);

  // 1. Load authenticated user's player profile & their accepted connections
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const myProfileRes = await playerService.getMyPlayer();
        if (myProfileRes.success && myProfileRes.player) {
          setCurrentPlayer(myProfileRes.player);
        }

        const connsRes = await connectionService.getConnections();
        if (connsRes.success && Array.isArray(connsRes.connections)) {
          // Extract the other player from each accepted connection
          const playersList = connsRes.connections
            .map((c) => {
              const other =
                String(c.requester?._id) === String(myProfileRes.player?._id)
                  ? c.receiver
                  : c.requester;
              return other;
            })
            .filter(Boolean);
          setConnectedPlayers(playersList);

          // If no player in URL but connections exist, default to the first connected player
          if (!playerQueryParam && playersList.length > 0) {
            setSelectedPlayerBId(playersList[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load initial comparison data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // 2. Fetch Comparison Data
  const fetchComparison = useCallback(async () => {
    if (!selectedPlayerBId) {
      setComparisonData(null);
      return;
    }

    setComparing(true);
    setIsPrivateRestricted(false);
    setRestrictionMessage('');

    try {
      const formatParam = selectedFormat === 'Overall' ? 'all' : selectedFormat;
      const res = await playerService.comparePlayers({
        playerB: selectedPlayerBId,
        format: formatParam,
      });

      if (res.success && res.comparison) {
        setComparisonData(res.comparison);
        if (res.comparison.players?.playerB) {
          setExtraPlayerB(res.comparison.players.playerB);
        }
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.data?.privacyRestricted) {
        setIsPrivateRestricted(true);
        setRestrictionMessage(
          err.response?.data?.message || "🔒 This player's statistics are private. Connect with this player to compare statistics."
        );

        // Check relationship status with this player if logged in
        if (isAuthenticated) {
          try {
            const sRes = await connectionService.getStatus(selectedPlayerBId);
            if (sRes.success) {
              setConnectionStatus(sRes.status);
            }
          } catch (statusErr) {
            console.warn('Status check notice:', statusErr);
          }
        }
      } else {
        console.error('Error fetching comparison:', err);
      }
    } finally {
      setComparing(false);
    }
  }, [selectedPlayerBId, selectedFormat, isAuthenticated]);

  useEffect(() => {
    if (selectedPlayerBId) {
      fetchComparison();
    }
  }, [fetchComparison, selectedPlayerBId]);

  // Handle format switch
  const handleFormatChange = (fmt) => {
    setSelectedFormat(fmt);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('format', fmt);
    if (selectedPlayerBId) newParams.set('player', selectedPlayerBId);
    newParams.delete('player2');
    setSearchParams(newParams);
  };

  // Handle player B selection
  const handlePlayerBChange = (pId) => {
    setSelectedPlayerBId(pId);
    const newParams = new URLSearchParams(searchParams);
    if (pId) {
      newParams.set('player', pId);
      newParams.delete('player2');
    } else {
      newParams.delete('player');
      newParams.delete('player2');
    }
    setSearchParams(newParams);
  };

  // Send connection request if restricted
  const handleSendRequest = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setActionLoading(true);
    try {
      const res = await connectionService.sendRequest(selectedPlayerBId);
      if (res.success) {
        setConnectionStatus('pending_sent');
        setActionFeedback('Connection request sent successfully!');
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err) {
      console.error('Connection request failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin mb-4" />
        <p className="text-gray-400 text-sm font-medium">Loading player comparison...</p>
      </div>
    );
  }

  const allSelectablePlayers = [...connectedPlayers];
  if (extraPlayerB && !allSelectablePlayers.some((p) => String(p._id) === String(extraPlayerB._id))) {
    allSelectablePlayers.push(extraPlayerB);
  }

  const playerA = comparisonData?.players?.playerA || currentPlayer;
  const playerB = comparisonData?.players?.playerB;
  const metrics = comparisonData?.metrics || [];

  // Group metrics by category
  const battingMetrics = metrics.filter((m) => m.category === 'Batting');
  const bowlingMetrics = metrics.filter((m) => m.category === 'Bowling');
  const generalMetrics = metrics.filter((m) => m.category === 'General' || m.category === 'Fielding');

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <Swords className="w-3.5 h-3.5" />
            <span>Head-to-Head Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Player Comparison
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mt-1 leading-relaxed">
            Compare career metrics and statistical benchmarks against your connected peers across match formats.
          </p>
        </div>

        {/* Format Selector Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0c1220] border border-gray-800 self-start md:self-auto overflow-x-auto max-w-full">
          {FORMAT_OPTIONS.map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleFormatChange(fmt)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedFormat === fmt
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Opponent Selector Bar */}
      <div className="rounded-2xl bg-[#0c1220] border border-gray-800 p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">Compare Player Statistics</h3>
            <p className="text-xs text-gray-400">
              Compare career metrics with public players or your accepted connections.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-72">
          {allSelectablePlayers.length > 0 ? (
            <select
              value={selectedPlayerBId}
              onChange={(e) => handlePlayerBChange(e.target.value)}
              className="w-full bg-[#080d1a] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/60 font-semibold"
            >
              <option value="">-- Choose a Player --</option>
              {allSelectablePlayers.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.displayName} ({p.playingRole || 'Player'}) {p.profileVisibility === 'public' ? '🌐' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-right">
              <Link
                to="/players"
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
              >
                Discover & Connect with Players →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* PRIVACY LOCKED SCREEN */}
      {isPrivateRestricted ? (
        <div className="rounded-3xl bg-[#0c1220] border border-amber-500/30 p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-black text-white mb-2">
            🔒 Private Statistics Comparison
          </h3>

          <p className="text-sm text-gray-300 max-w-md mx-auto mb-6 leading-relaxed font-semibold">
            {restrictionMessage || "🔒 This player's statistics are private. Connect with this player to compare statistics."}
          </p>

          <div className="flex items-center justify-center">
            {!isAuthenticated ? (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Sign in to Connect</span>
              </button>
            ) : connectionStatus === 'pending_sent' ? (
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Connection request pending</span>
              </span>
            ) : (
              <button
                onClick={handleSendRequest}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>Connect with this player</span>
              </button>
            )}
          </div>

          {actionFeedback && (
            <p className="text-xs text-emerald-400 mt-3 font-semibold">{actionFeedback}</p>
          )}
        </div>
      ) : !selectedPlayerBId ? (
        /* Prompt to select a player */
        <div className="rounded-3xl bg-[#0c1220] border border-gray-800/80 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-800/60 text-gray-500 flex items-center justify-center mx-auto mb-3">
            <Swords className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-white mb-1">Select a Player to Begin Comparison</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto mb-5">
            Choose a connected cricketer from the dropdown above to view an in-depth, side-by-side performance matrix.
          </p>
          <Link
            to="/players"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition"
          >
            <span>Browse CrickPulse Players</span>
          </Link>
        </div>
      ) : comparing ? (
        /* Loading Skeleton */
        <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-12 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-10 h-10 rounded-full border-3 border-emerald-500/20 border-t-emerald-400 animate-spin mb-3" />
          <p className="text-xs text-gray-400">Comparing career performance data...</p>
        </div>
      ) : (
        /* COMPARISON CONTENT */
        <div className="space-y-8">
          {/* Head-to-Head Duel Card */}
          <div className="rounded-3xl bg-gradient-to-b from-[#0e1628] to-[#0a0f1d] border border-gray-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-center">
              {/* Player A Column */}
              <div className="md:col-span-3 flex items-center gap-4 text-left">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-lg shadow-emerald-500/15 overflow-hidden">
                  {playerA?.profileImage ? (
                    <img
                      src={playerA.profileImage}
                      alt={playerA.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{playerA?.displayName?.[0]?.toUpperCase() || 'A'}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    You
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white">
                    {playerA?.displayName}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {playerA?.playingRole || 'Player'} • {playerA?.currentTeam || 'Free Agent'}
                  </p>
                  <p className="text-[11px] text-gray-500">{playerA?.city || 'Unspecified'}</p>
                </div>
              </div>

              {/* Center VS Element */}
              <div className="md:col-span-1 flex flex-col items-center justify-center my-2 md:my-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-black font-black flex items-center justify-center shadow-lg shadow-emerald-500/25 text-sm tracking-wider">
                  VS
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono mt-2">
                  {selectedFormat}
                </span>
              </div>

              {/* Player B Column */}
              <div className="md:col-span-3 flex items-center justify-end gap-4 text-right">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Peer / Opponent
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white">
                    {playerB?.displayName}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {playerB?.playingRole || 'Player'} • {playerB?.currentTeam || 'Free Agent'}
                  </p>
                  <p className="text-[11px] text-gray-500">{playerB?.city || 'Unspecified'}</p>
                </div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-lg shadow-sky-500/15 overflow-hidden">
                  {playerB?.profileImage ? (
                    <img
                      src={playerB.profileImage}
                      alt={playerB.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{playerB?.displayName?.[0]?.toUpperCase() || 'B'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Dual-Bar Proportional Charts for Key Highlights */}
          <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Statistical Balance Charts
                </h3>
              </div>
              <span className="text-xs text-gray-500">Proportional Benchmarks</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: 'Runs Scored', key: 'runs', format: (v) => v },
                { label: 'Batting Average', key: 'battingAverage', format: (v) => v },
                { label: 'Strike Rate', key: 'strikeRate', format: (v) => v },
                { label: 'Wickets Taken', key: 'wickets', format: (v) => v },
                { label: 'Economy Rate', key: 'economy', format: (v) => v, invert: true },
              ].map((item) => {
                const metricObj = metrics.find((m) => m.key === item.key);
                const valA = parseFloat(metricObj?.playerA) || 0;
                const valB = parseFloat(metricObj?.playerB) || 0;
                const total = valA + valB;
                const percentA = total > 0 ? (valA / total) * 100 : 50;
                const percentB = total > 0 ? (valB / total) * 100 : 50;

                return (
                  <div
                    key={item.key}
                    className="p-4 rounded-2xl bg-[#090d16] border border-gray-800/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-emerald-400">
                        {item.format(metricObj?.playerA ?? 0)}
                      </span>
                      <span className="font-bold text-gray-300 uppercase tracking-wider text-[11px]">
                        {item.label}
                      </span>
                      <span className="font-extrabold text-sky-400">
                        {item.format(metricObj?.playerB ?? 0)}
                      </span>
                    </div>

                    {/* Dual Color Horizontal Bar */}
                    <div className="h-3 w-full rounded-full bg-gray-800 overflow-hidden flex">
                      <div
                        style={{ width: `${percentA}%` }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                        title={`${playerA?.displayName}: ${percentA.toFixed(1)}%`}
                      />
                      <div
                        style={{ width: `${percentB}%` }}
                        className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-500"
                        title={`${playerB?.displayName}: ${percentB.toFixed(1)}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                      <span>{playerA?.displayName}</span>
                      <span>{playerB?.displayName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Metric Tables by Category */}
          {[
            {
              title: 'Batting Comparison',
              icon: Flame,
              color: 'text-amber-400',
              metrics: battingMetrics,
            },
            {
              title: 'Bowling Comparison',
              icon: Target,
              color: 'text-teal-400',
              metrics: bowlingMetrics,
            },
            {
              title: 'Match Appearances & Fielding',
              icon: Trophy,
              color: 'text-emerald-400',
              metrics: generalMetrics,
            },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.title}
                className="rounded-3xl bg-[#0c1220] border border-gray-800 overflow-hidden shadow-xl"
              >
                {/* Section Header */}
                <div className="p-5 sm:px-8 border-b border-gray-800 flex items-center justify-between bg-[#0e1628]/60">
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${cat.color}`} />
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                      {cat.title}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-gray-500">
                    Leader highlighted objectively
                  </span>
                </div>

                {/* Table */}
                <div className="divide-y divide-gray-800/60">
                  {cat.metrics.map((row) => {
                    const isALeader = row.stronger === 'playerA';
                    const isBLeader = row.stronger === 'playerB';

                    return (
                      <div
                        key={row.key}
                        className="grid grid-cols-7 py-3.5 px-4 sm:px-8 items-center hover:bg-gray-800/20 transition text-xs"
                      >
                        {/* Player A Value */}
                        <div
                          className={`col-span-2 text-left font-mono font-bold flex items-center gap-2 ${
                            isALeader ? 'text-emerald-400 font-black' : 'text-gray-300'
                          }`}
                        >
                          <span className="text-sm">{row.playerA}</span>
                          {isALeader && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Higher
                            </span>
                          )}
                        </div>

                        {/* Metric Label */}
                        <div className="col-span-3 text-center">
                          <span className="text-xs font-extrabold text-gray-200 block">
                            {row.label}
                          </span>
                        </div>

                        {/* Player B Value */}
                        <div
                          className={`col-span-2 text-right font-mono font-bold flex items-center justify-end gap-2 ${
                            isBLeader ? 'text-sky-400 font-black' : 'text-gray-300'
                          }`}
                        >
                          {isBLeader && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                              Higher
                            </span>
                          )}
                          <span className="text-sm">{row.playerB}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Objective Integrity Footnote */}
          <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-gray-800/80 flex items-start gap-3 text-xs text-gray-400">
            <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Objective Comparison Principle:</strong> Highlighted metrics denote statistical advantages
              (e.g., higher runs/strike rate, or lower bowling economy) within completed and verified scorecards.
              CrickPulse maintains competitive neutrality and does not declare subjective player superiority.
            </p>
          </div>
        </div>
      )}

      {/* Login Prompt Modal for Guests */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="Sign in to connect with players."
        actionText="Sign In to Connect"
      />
    </div>
  );
}
