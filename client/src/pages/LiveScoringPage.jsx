import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import scoringService from '../services/scoringService';
import matchService from '../services/matchService';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Trophy,
  AlertCircle,
  Sparkles,
  X,
  Lock,
  Check,
  ChevronRight,
  Shield,
  Users,
  Award,
  Play,
  UserCheck,
  Plus,
} from 'lucide-react';

export default function LiveScoringPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [match, setMatch] = useState(null);
  const [squadData, setSquadData] = useState(null);
  const [currentInnings, setCurrentInnings] = useState(null);
  const [inningsList, setInningsList] = useState([]);
  const [currentOverDeliveries, setCurrentOverDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('scoring'); // 'scoring' | 'scorecard'

  // Drawer & Modals
  const [showSquadDrawer, setShowSquadDrawer] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showEndInningsModal, setShowEndInningsModal] = useState(false);
  const [showCompleteMatchModal, setShowCompleteMatchModal] = useState(false);
  const [showInnings2Modal, setShowInnings2Modal] = useState(false);

  // Setup Wizard State (When match innings not yet started)
  const [setupStep, setSetupStep] = useState(1); // 1: Toss, 2: Playing XI, 3: Openers
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState('bat');
  const [selectedTeam1XI, setSelectedTeam1XI] = useState([]);
  const [selectedTeam2XI, setSelectedTeam2XI] = useState([]);
  const [activeXITeamTab, setActiveXITeamTab] = useState('team1'); // 'team1' | 'team2'

  // Openers Form
  const [strikerSelection, setStrikerSelection] = useState('');
  const [nonStrikerSelection, setNonStrikerSelection] = useState('');
  const [bowlerSelection, setBowlerSelection] = useState('');

  // Wicket Form
  const [wicketForm, setWicketForm] = useState({
    type: 'bowled',
    dismissedPlayer: '',
    newBatsman: '',
    fielder: '',
    fielderId: '',
    runs: 0,
  });

  // Bowler Selection Modal State
  const [selectedBowlerName, setSelectedBowlerName] = useState('');

  // Fetch match state and squad data
  const loadData = useCallback(async () => {
    try {
      const [scoreRes, squadRes] = await Promise.all([
        scoringService.getMatchScoringState(id),
        scoringService.getMatchSquad(id),
      ]);

      if (scoreRes.success) {
        setMatch(scoreRes.match);
        setCurrentInnings(scoreRes.currentInnings);
        setInningsList(scoreRes.inningsList || []);
        setCurrentOverDeliveries(scoreRes.currentOverDeliveries || []);

        if (scoreRes.match?.tossWinner) setTossWinner(scoreRes.match.tossWinner);
        if (scoreRes.match?.tossDecision) setTossDecision(scoreRes.match.tossDecision);
      }

      if (squadRes.success) {
        setSquadData(squadRes);
        // Pre-populate Playing XIs if already configured on match
        if (squadRes.team1?.playingXI?.length > 0) {
          setSelectedTeam1XI(squadRes.team1.playingXI.map((p) => String(p._id || p)));
        } else if (squadRes.team1?.squad?.length > 0) {
          setSelectedTeam1XI(squadRes.team1.squad.slice(0, 11).map((p) => String(p._id || p)));
        }

        if (squadRes.team2?.playingXI?.length > 0) {
          setSelectedTeam2XI(squadRes.team2.playingXI.map((p) => String(p._id || p)));
        } else if (squadRes.team2?.squad?.length > 0) {
          setSelectedTeam2XI(squadRes.team2.squad.slice(0, 11).map((p) => String(p._id || p)));
        }
      }
    } catch (err) {
      console.error('Failed to load live scoring state:', err);
      setError(err.response?.data?.message || 'Failed to load match scoring data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine Batting and Bowling teams for Innings 1 based on Toss
  const getInnings1Teams = () => {
    if (!match) return { battingTeam: '', bowlingTeam: '' };
    const winner = tossWinner || match.tossWinner || match.team1;
    const decision = tossDecision || match.tossDecision || 'bat';
    const isTeam1Winner = winner === match.team1;

    const team1Bats = (isTeam1Winner && decision === 'bat') || (!isTeam1Winner && decision === 'bowl');
    return {
      battingTeam: team1Bats ? match.team1 : match.team2,
      bowlingTeam: team1Bats ? match.team2 : match.team1,
      battingTeamKey: team1Bats ? 'team1' : 'team2',
      bowlingTeamKey: team1Bats ? 'team2' : 'team1',
    };
  };

  // Save Toss
  const handleSaveToss = async () => {
    if (!tossWinner) {
      toast.warning('Please select the toss winner');
      return;
    }
    setActionLoading(true);
    try {
      await matchService.updateMatch(match._id, {
        tossWinner,
        tossDecision,
      });
      toast.success(`Toss recorded: ${tossWinner} elected to ${tossDecision}`);
      setSetupStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save toss');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle player selection for Playing XI
  const togglePlayerInXI = (teamKey, playerId) => {
    const idStr = String(playerId);
    if (teamKey === 'team1') {
      setSelectedTeam1XI((prev) => {
        if (prev.includes(idStr)) return prev.filter((id) => id !== idStr);
        if (prev.length >= 11) {
          toast.warning('Playing XI cannot exceed 11 players');
          return prev;
        }
        return [...prev, idStr];
      });
    } else {
      setSelectedTeam2XI((prev) => {
        if (prev.includes(idStr)) return prev.filter((id) => id !== idStr);
        if (prev.length >= 11) {
          toast.warning('Playing XI cannot exceed 11 players');
          return prev;
        }
        return [...prev, idStr];
      });
    }
  };

  // Quick auto-select top 11
  const handleAutoSelectTop11 = (teamKey) => {
    const squad = teamKey === 'team1' ? squadData?.team1?.squad : squadData?.team2?.squad;
    if (!squad) return;
    const top11 = squad.slice(0, 11).map((p) => String(p._id || p));
    if (teamKey === 'team1') setSelectedTeam1XI(top11);
    else setSelectedTeam2XI(top11);
    toast.info(`Selected top ${top11.length} players for ${teamKey === 'team1' ? match.team1 : match.team2}`);
  };

  // Confirm Playing XI on backend
  const handleSavePlayingXI = async () => {
    if (selectedTeam1XI.length === 0 || selectedTeam2XI.length === 0) {
      toast.warning('Please select players for both Playing XIs');
      return;
    }
    setActionLoading(true);
    try {
      await scoringService.setPlayingXI(match._id, 'team1', selectedTeam1XI);
      await scoringService.setPlayingXI(match._id, 'team2', selectedTeam2XI);
      toast.success('Playing XIs confirmed for both teams!');
      await loadData();
      setSetupStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm Playing XIs');
    } finally {
      setActionLoading(false);
    }
  };

  // Determine active teams for whichever innings is being launched (1 or 2)
  const getLaunchInningsConfig = () => {
    const inn1 = getInnings1Teams();
    const isLaunchingInnings2 =
      (currentInnings?.inningsNumber === 1 && currentInnings?.status === 'completed') ||
      (inningsList.length === 1 && inningsList[0]?.status === 'completed') ||
      match?.currentInningsNumber === 2;

    if (isLaunchingInnings2) {
      return {
        inningsNumber: 2,
        battingTeam: inn1.bowlingTeam,
        bowlingTeam: inn1.battingTeam,
        battingTeamKey: inn1.bowlingTeamKey,
        bowlingTeamKey: inn1.battingTeamKey,
      };
    }

    return {
      inningsNumber: 1,
      ...inn1,
    };
  };

  // Start Innings (1 or 2) with openers
  const handleLaunchScoring = async (e) => {
    e?.preventDefault();
    if (!strikerSelection || !nonStrikerSelection || !bowlerSelection) {
      toast.warning('Please select Striker, Non-Striker, and Opening Bowler');
      return;
    }
    if (strikerSelection === nonStrikerSelection) {
      toast.warning('Striker and Non-Striker must be different players (cannot have the same Player ID)');
      return;
    }

    const { inningsNumber, battingTeam, bowlingTeam, battingTeamKey, bowlingTeamKey } = getLaunchInningsConfig();
    const battingXI = battingTeamKey === 'team1' ? squadData?.team1?.playingXI : squadData?.team2?.playingXI;
    const bowlingXI = bowlingTeamKey === 'team1' ? squadData?.team1?.playingXI : squadData?.team2?.playingXI;

    const strikerPlayer = battingXI?.find((p) => String(p._id || p) === strikerSelection);
    const nonStrikerPlayer = battingXI?.find((p) => String(p._id || p) === nonStrikerSelection);
    const bowlerPlayer = bowlingXI?.find((p) => String(p._id || p) === bowlerSelection);

    if (!strikerPlayer || !nonStrikerPlayer || !bowlerPlayer) {
      toast.warning('Please select valid players from the Playing XI');
      return;
    }

    if (String(strikerPlayer._id || strikerPlayer) === String(nonStrikerPlayer._id || nonStrikerPlayer)) {
      toast.error('Striker and Non-Striker must be different players (cannot have the same Player ID)');
      return;
    }

    setActionLoading(true);
    try {
      const res = await scoringService.startInnings(match._id, {
        inningsNumber,
        battingTeam,
        bowlingTeam,
        striker: strikerPlayer.displayName || strikerPlayer.name,
        strikerId: strikerPlayer._id || null,
        nonStriker: nonStrikerPlayer.displayName || nonStrikerPlayer.name,
        nonStrikerId: nonStrikerPlayer._id || null,
        bowler: bowlerPlayer.displayName || bowlerPlayer.name,
        bowlerId: bowlerPlayer._id || null,
      });

      if (res.success) {
        toast.success(`Innings ${inningsNumber} started! Live Scoring is now active.`);
        setSetupStep(1);
        setShowInnings2Modal(false);
        setStrikerSelection('');
        setNonStrikerSelection('');
        setBowlerSelection('');
        await loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start innings');
    } finally {
      setActionLoading(false);
    }
  };

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
          toast.info('Over completed! Please select the bowler for the next over.');
          setShowBowlerModal(true);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error recording delivery';
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Record Wicket
  const handleWicketSubmit = async (e) => {
    e.preventDefault();
    if (!wicketForm.newBatsman.trim()) {
      toast.warning('Please select or enter the new incoming batsman.');
      return;
    }

    // Identify who was dismissed and who remains at the crease
    const isStrikerDismissed = (wicketForm.dismissedPlayer || currentInnings?.striker) === currentInnings?.striker;
    const dismissedPlayerId = isStrikerDismissed ? currentInnings?.strikerId : currentInnings?.nonStrikerId;
    const survivingBatterName = isStrikerDismissed ? currentInnings?.nonStriker : currentInnings?.striker;
    const survivingBatterId = isStrikerDismissed ? currentInnings?.nonStrikerId : currentInnings?.strikerId;

    if (wicketForm.newBatsmanId && survivingBatterId && String(wicketForm.newBatsmanId) === String(survivingBatterId)) {
      toast.error('New incoming batsman cannot be the same as the batter already at the crease');
      return;
    }
    if (survivingBatterName && wicketForm.newBatsman.trim().toLowerCase() === survivingBatterName.trim().toLowerCase()) {
      toast.error('New incoming batsman cannot be the same as the batter already at the crease');
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
          dismissedPlayerId: dismissedPlayerId || null,
          newBatsman: wicketForm.newBatsman.trim(),
          newBatsmanId: wicketForm.newBatsmanId || null,
          fielder: wicketForm.fielder || '',
          fielderId: wicketForm.fielderId || null,
        },
      };

      const res = await scoringService.recordDelivery(match._id, payload);
      if (res.success) {
        setCurrentInnings(res.currentInnings);
        setMatch(res.match);
        setInningsList(res.inningsList || []);
        setCurrentOverDeliveries(res.currentOverDeliveries || []);
        setShowWicketModal(false);
        setWicketForm({ type: 'bowled', dismissedPlayer: '', dismissedPlayerId: '', newBatsman: '', newBatsmanId: '', fielder: '', fielderId: '', runs: 0 });
        toast.success('Wicket recorded successfully!');

        if (res.isOverCompleted) {
          setShowBowlerModal(true);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording wicket');
    } finally {
      setActionLoading(false);
    }
  };

  // Set Bowler (with consecutive over and max over validation)
  const handleSelectBowler = async (bowlerName) => {
    if (!bowlerName) return;
    setActionLoading(true);
    try {
      const res = await scoringService.setBowler(match._id, bowlerName);
      if (res.success) {
        setCurrentInnings(res.innings);
        setShowBowlerModal(false);
        toast.success(`${bowlerName} will bowl the next over`);
        await loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set bowler');
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
        toast.info('Last delivery undone');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'No delivery to undo');
    } finally {
      setActionLoading(false);
    }
  };

  // Swap ends
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
        toast.success(`Strike swapped: ${res.striker} is now on strike`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change striker');
    } finally {
      setActionLoading(false);
    }
  };

  // Conclude Innings
  const handleEndInnings = async () => {
    setShowEndInningsModal(false);
    setActionLoading(true);
    try {
      const res = await scoringService.endInnings(match._id, currentInnings?.inningsNumber || 1);
      if (res.success) {
        toast.success(res.message);
        await loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to conclude innings');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Match
  const handleCompleteMatch = async (winnerTeam, resultText) => {
    setShowCompleteMatchModal(false);
    setActionLoading(true);
    try {
      const res = await scoringService.completeMatch(match._id, {
        winner: winnerTeam,
        result: resultText,
      });
      if (res.success) {
        toast.success('Match completed and results recorded!');
        await loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete match');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Connecting to Live Scorecard..." />;
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

  // Real-world match calculations
  const totalRuns = currentInnings?.totalRuns || 0;
  const wickets = currentInnings?.wickets || 0;
  const legalBalls = currentInnings?.legalBalls || 0;
  const oversString = currentInnings?.overs || '0.0';
  const target = currentInnings?.target;
  const runsNeeded = target ? target - totalRuns : null;
  const maxLegalBalls = (match.overs || 20) * 6;
  const ballsRemaining = maxLegalBalls - legalBalls;

  const currentRunRate =
    legalBalls > 0 ? (totalRuns / (legalBalls / 6)).toFixed(2) : '0.00';

  const requiredRunRate =
    runsNeeded && ballsRemaining > 0
      ? (runsNeeded / (ballsRemaining / 6)).toFixed(2)
      : null;

  // Active Players On Pitch - Match by ID first, fallback to name
  const strikerBatsman = currentInnings?.batsmen?.find(
    (b) => (currentInnings.strikerId && b.playerId && String(b.playerId) === String(currentInnings.strikerId)) ||
           b.name.toLowerCase() === (currentInnings.striker || '').toLowerCase()
  ) || { name: currentInnings?.striker || 'Striker', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };

  const nonStrikerBatsman = currentInnings?.batsmen?.find(
    (b) => (currentInnings.nonStrikerId && b.playerId && String(b.playerId) === String(currentInnings.nonStrikerId)) ||
           b.name.toLowerCase() === (currentInnings.nonStriker || '').toLowerCase()
  ) || { name: currentInnings?.nonStriker || 'Non-Striker', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };

  const activeBowler = currentInnings?.bowlers?.find(
    (b) => (currentInnings.currentBowlerId && b.playerId && String(b.playerId) === String(currentInnings.currentBowlerId)) ||
           b.name.toLowerCase() === (currentInnings.currentBowler || '').toLowerCase()
  ) || { name: currentInnings?.currentBowler || 'Bowler', overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, economy: 0 };

  // Safety check: Are striker and non-striker referencing the same player ID or name?
  const isBattingStateInvalid = Boolean(
    currentInnings &&
    (
      (currentInnings.strikerId && currentInnings.nonStrikerId && String(currentInnings.strikerId) === String(currentInnings.nonStrikerId)) ||
      (currentInnings.striker && currentInnings.nonStriker && currentInnings.striker.trim().toLowerCase() === currentInnings.nonStriker.trim().toLowerCase())
    )
  );

  // Determine current active batting team & fielding team Playing XI
  const isTeam1Batting = currentInnings?.battingTeam === match.team1;
  const battingPlayingXI = isTeam1Batting ? squadData?.team1?.playingXI || [] : squadData?.team2?.playingXI || [];
  const fieldingPlayingXI = isTeam1Batting ? squadData?.team2?.playingXI || [] : squadData?.team1?.playingXI || [];
  const maxOversPerBowler = squadData?.maxOversPerBowler || Math.ceil((match.overs || 20) / 5);

  // Quick repair non-striker in case of invalid state
  const handleRepairNonStriker = async (selectedPlayerId) => {
    if (!selectedPlayerId) return;
    const playerObj = battingPlayingXI.find((p) => String(p._id || p) === selectedPlayerId);
    if (!playerObj) return;

    setActionLoading(true);
    try {
      const res = await scoringService.setNonStriker(match._id, {
        nonStriker: playerObj.displayName || playerObj.name,
        nonStrikerId: playerObj._id,
      });
      if (res.success) {
        toast.success(`Non-striker updated to ${playerObj.displayName || playerObj.name}`);
        await loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update non-striker');
    } finally {
      setActionLoading(false);
    }
  };

  // Remaining eligible batters from Playing XI (not currently batting and not out)
  const dismissedNames = new Set(
    (currentInnings?.batsmen || []).filter((b) => b.isOut).map((b) => b.name.toLowerCase())
  );
  const currentBatters = new Set([
    (currentInnings?.striker || '').toLowerCase(),
    (currentInnings?.nonStriker || '').toLowerCase(),
  ]);
  const availableBatters = battingPlayingXI.filter(
    (p) => !dismissedNames.has((p.displayName || p.name).toLowerCase()) && !currentBatters.has((p.displayName || p.name).toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-6 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="w-full space-y-6">

        {/* Top Header Bar */}
        <div className="flex items-center justify-between">
          <Link
            to={`/matches/${match._id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit to Match Details</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Squad Drawer Toggle Button */}
            <button
              onClick={() => setShowSquadDrawer(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0c1424] hover:bg-gray-800 text-teal-400 border border-teal-500/30 transition shadow"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Squad</span>
            </button>

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
                <span>{match.tournament || 'Cricket Fixture'}</span>
                <span>•</span>
                <span className="text-emerald-400">
                  {match.format} ({match.overs} Overs • Max {maxOversPerBowler} ov/bowler)
                </span>
                <span>•</span>
                <span>{match.venue}, {match.city}</span>
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
              {inningsList.length === 1 && inningsList[0]?.status === 'completed' && (
                <button
                  onClick={() => setShowInnings2Modal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition flex items-center gap-1 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start Innings 2</span>
                </button>
              )}
            </div>
          </div>

          {/* Current Innings Scoreboard */}
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
                        <strong className="text-base text-emerald-400">
                          {runsNeeded > 0 ? runsNeeded : 0} off {ballsRemaining}b
                        </strong>
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

              {/* Match Concluded Banner */}
              {match.status === 'completed' && match.result && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs uppercase font-bold text-gray-400">Match Concluded</span>
                    <p className="text-base font-black text-emerald-300">{match.result}</p>
                  </div>
                </div>
              )}

              {/* Innings 1 Concluded / Start Innings 2 Banner */}
              {currentInnings?.inningsNumber === 1 && currentInnings?.status === 'completed' && !inningsList.find((i) => i.inningsNumber === 2) && match.status !== 'completed' && (
                <div className="p-5 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Innings 1 Concluded
                      </span>
                      <span className="text-xs text-gray-300 font-bold">
                        {currentInnings.battingTeam}: {currentInnings.totalRuns}/{currentInnings.wickets} ({currentInnings.overs} ov)
                      </span>
                    </div>
                    <p className="text-sm font-black text-white">
                      Target for {getLaunchInningsConfig().battingTeam}: <span className="text-amber-300 font-mono text-base">{currentInnings.totalRuns + 1} runs</span> ({match.overs} overs)
                    </p>
                    <p className="text-xs text-gray-400">
                      Innings 1 is completed. Ready to start the run chase for {getLaunchInningsConfig().battingTeam}.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInnings2Modal(true)}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Innings 2</span>
                  </button>
                </div>
              )}

              {/* Recent Deliveries in Current Over */}
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
                    <span className="text-xs text-gray-500 italic">No deliveries bowled in this over yet</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* STEP-BY-STEP REAL-WORLD MATCH SETUP WIZARD */
            <div className="py-6 space-y-8">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Play className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Pre-Match Setup Wizard</h2>
                    <p className="text-xs text-gray-400">
                      Real-world scorecard configuration: Toss $\rightarrow$ Playing XI $\rightarrow$ Opening Lineup
                    </p>
                  </div>
                </div>

                {/* Wizard Step Indicators */}
                <div className="flex items-center gap-2">
                  {[
                    { num: 1, label: 'Toss' },
                    { num: 2, label: 'Playing XI' },
                    { num: 3, label: 'Openers' },
                  ].map((s) => (
                    <div
                      key={s.num}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
                        setupStep === s.num
                          ? 'bg-emerald-500 text-black'
                          : setupStep > s.num
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-gray-850 text-gray-500'
                      }`}
                    >
                      <span>{s.num}.</span>
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 1: TOSS CONFIGURATION */}
              {setupStep === 1 && (
                <div className="max-w-xl mx-auto space-y-6 bg-[#090e1a] p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-xl">
                  <div className="text-center space-y-1">
                    <h3 className="text-base font-bold text-white">Match Toss Result</h3>
                    <p className="text-xs text-gray-400">Select which team won the physical toss and their decision</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Toss Winner</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[match.team1, match.team2].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTossWinner(t)}
                            className={`py-3 px-4 rounded-2xl font-bold text-xs border transition ${
                              tossWinner === t
                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg'
                                : 'bg-[#0c1424] text-gray-300 border-gray-800 hover:border-gray-700'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Elected To</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['bat', 'bowl'].map((dec) => (
                          <button
                            key={dec}
                            type="button"
                            onClick={() => setTossDecision(dec)}
                            className={`py-3 px-4 rounded-2xl font-bold text-xs capitalize border transition ${
                              tossDecision === dec
                                ? 'bg-teal-500 text-black border-teal-400 shadow-lg'
                                : 'bg-[#0c1424] text-gray-300 border-gray-800 hover:border-gray-700'
                            }`}
                          >
                            {dec === 'bat' ? '🏏 Bat First' : '⚾ Bowl First'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {tossWinner && (
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center font-medium">
                        ✨ <strong>{tossWinner}</strong> won the toss and elected to <strong>{tossDecision}</strong>.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveToss}
                      disabled={actionLoading || !tossWinner}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <span>Proceed to Playing XI</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PLAYING XI CONFIRMATION (UP TO 11 PLAYERS) */}
              {setupStep === 2 && (
                <div className="space-y-6">
                  {/* Team Switcher Tabs */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveXITeamTab('team1')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                          activeXITeamTab === 'team1'
                            ? 'bg-emerald-500 text-black shadow'
                            : 'bg-gray-850 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span>{match.team1}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-black/20">
                          {selectedTeam1XI.length}/11
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveXITeamTab('team2')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                          activeXITeamTab === 'team2'
                            ? 'bg-emerald-500 text-black shadow'
                            : 'bg-gray-850 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span>{match.team2}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-black/20">
                          {selectedTeam2XI.length}/11
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAutoSelectTop11(activeXITeamTab)}
                        className="text-xs text-teal-400 hover:underline font-semibold"
                      >
                        Auto-Fill Top 11
                      </button>
                      <button
                        onClick={() => setSetupStep(1)}
                        className="text-xs text-gray-500 hover:text-gray-300 font-semibold"
                      >
                        Back to Toss
                      </button>
                    </div>
                  </div>

                  {/* Squad Player Selection Grid */}
                  <div className="bg-[#090e1a] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>
                          {activeXITeamTab === 'team1' ? match.team1 : match.team2} Squad List
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                            (activeXITeamTab === 'team1' ? selectedTeam1XI.length : selectedTeam2XI.length) === 11
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {activeXITeamTab === 'team1' ? selectedTeam1XI.length : selectedTeam2XI.length}/11 Confirmed
                        </span>
                      </h4>
                      <span className="text-[11px] text-gray-400">Click a player to toggle selection in Playing XI</span>
                    </div>

                    {((activeXITeamTab === 'team1' ? squadData?.team1?.squad : squadData?.team2?.squad) || []).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {((activeXITeamTab === 'team1' ? squadData?.team1?.squad : squadData?.team2?.squad) || []).map((player) => {
                          const idStr = String(player._id || player);
                          const isSelected =
                            activeXITeamTab === 'team1'
                              ? selectedTeam1XI.includes(idStr)
                              : selectedTeam2XI.includes(idStr);

                          return (
                            <button
                              key={idStr}
                              type="button"
                              onClick={() => togglePlayerInXI(activeXITeamTab, idStr)}
                              className={`p-3 rounded-2xl text-left border transition flex items-center justify-between ${
                                isSelected
                                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow'
                                  : 'bg-[#0c1424] border-gray-800/80 text-gray-300 hover:border-gray-700'
                              }`}
                            >
                              <div className="min-w-0 flex items-center gap-2.5">
                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${
                                    isSelected ? 'bg-emerald-500 text-black font-bold' : 'border border-gray-700'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <div className="truncate">
                                  <p className="font-bold text-xs truncate">{player.displayName || player.name}</p>
                                  <span className="text-[10px] text-gray-400 block">{player.playingRole || 'Player'}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No registered squad members found for this team.</p>
                    )}

                    <div className="pt-4 border-t border-gray-800 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleSavePlayingXI}
                        disabled={actionLoading || selectedTeam1XI.length === 0 || selectedTeam2XI.length === 0}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <span>Confirm Playing XIs & Pick Openers</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: OPENING BATSMEN AND OPENING BOWLER */}
              {setupStep === 3 && (
                <div className="max-w-xl mx-auto space-y-6 bg-[#090e1a] p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-xl">
                  <div className="text-center space-y-1">
                    <h3 className="text-base font-bold text-white">
                      Select Opening Matchups (Innings {getLaunchInningsConfig().inningsNumber})
                    </h3>
                    <p className="text-xs text-gray-400">
                      Choose 2 opening batters for {getLaunchInningsConfig().battingTeam} and the opening bowler for {getLaunchInningsConfig().bowlingTeam}
                    </p>
                  </div>

                  <form onSubmit={handleLaunchScoring} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                        Opening Striker 🏏 ({getLaunchInningsConfig().battingTeam}) *
                      </label>
                      <select
                        value={strikerSelection}
                        onChange={(e) => setStrikerSelection(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0c1424] border border-gray-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                        required
                      >
                        <option value="">Select Striker from Playing XI...</option>
                        {((getLaunchInningsConfig().battingTeamKey === 'team1'
                          ? squadData?.team1?.playingXI
                          : squadData?.team2?.playingXI) || []).map((p) => (
                          <option key={String(p._id || p)} value={String(p._id || p)}>
                            {p.displayName || p.name} ({p.playingRole || 'Batter'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                        Opening Non-Striker ({getLaunchInningsConfig().battingTeam}) *
                      </label>
                      <select
                        value={nonStrikerSelection}
                        onChange={(e) => setNonStrikerSelection(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0c1424] border border-gray-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                        required
                      >
                        <option value="">Select Non-Striker from Playing XI...</option>
                        {((getLaunchInningsConfig().battingTeamKey === 'team1'
                          ? squadData?.team1?.playingXI
                          : squadData?.team2?.playingXI) || [])
                          .filter((p) => String(p._id || p) !== strikerSelection)
                          .map((p) => (
                            <option key={String(p._id || p)} value={String(p._id || p)}>
                              {p.displayName || p.name} ({p.playingRole || 'Batter'})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                        Opening Bowler ⚾ ({getLaunchInningsConfig().bowlingTeam}) *
                      </label>
                      <select
                        value={bowlerSelection}
                        onChange={(e) => setBowlerSelection(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0c1424] border border-gray-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                        required
                      >
                        <option value="">Select Opening Bowler from Playing XI...</option>
                        {((getLaunchInningsConfig().bowlingTeamKey === 'team1'
                          ? squadData?.team1?.playingXI
                          : squadData?.team2?.playingXI) || []).map((p) => (
                          <option key={String(p._id || p)} value={String(p._id || p)}>
                            {p.displayName || p.name} ({p.playingRole || 'Bowler'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSetupStep(2)}
                        className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow transition"
                      >
                        🚀 Launch Live Scoring Console
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab Switcher: Live Scoring Console vs Full Scorecard Tables */}
        {currentInnings && (
          <div className="flex rounded-2xl bg-[#0c1424] p-1 border border-gray-800">
            <button
              onClick={() => setActiveTab('scoring')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'scoring'
                  ? 'bg-emerald-500 text-black shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ⚡ Live Scoring Console
            </button>
            <button
              onClick={() => setActiveTab('scorecard')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'scorecard'
                  ? 'bg-emerald-500 text-black shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📊 Full Scorecard Tables
            </button>
          </div>
        )}

        {/* TAB 1: LIVE SCORING CONSOLE */}
        {activeTab === 'scoring' && currentInnings && (
          <div className="space-y-6">

            {/* UI Safety Alert: Striker and Non-Striker cannot be the same player */}
            {isBattingStateInvalid && (
              <div className="p-5 bg-red-500/15 border-2 border-red-500/60 rounded-3xl text-red-200 space-y-3 shadow-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      Invalid Batting State Detected
                    </h4>
                    <p className="text-xs text-red-300 leading-relaxed">
                      Striker and non-striker cannot be the same player ({currentInnings.striker}). A cricket innings must always have two different active batsmen. Scoring has been locked to prevent corrupt scorecard data.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-red-500/30 flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-gray-200">
                    Fix Non-Striker from Playing XI:
                  </span>
                  <select
                    id="safety-non-striker-repair"
                    onChange={(e) => handleRepairNonStriker(e.target.value)}
                    disabled={actionLoading}
                    className="px-3.5 py-2 bg-[#0c1424] border border-red-400/50 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    defaultValue=""
                  >
                    <option value="">Select distinct batsman...</option>
                    {battingPlayingXI
                      .filter((p) => {
                        const isSame =
                          (currentInnings.strikerId && String(p._id || p) === String(currentInnings.strikerId)) ||
                          (p.displayName || p.name).toLowerCase() === currentInnings.striker.toLowerCase();
                        return !isSame && !dismissedNames.has((p.displayName || p.name).toLowerCase());
                      })
                      .map((p) => (
                        <option key={String(p._id || p)} value={String(p._id || p)}>
                          {p.displayName || p.name} ({p.playingRole || 'Batter'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

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
              <div className={`p-4 bg-[#0c1424] rounded-2xl shadow-lg relative ${
                isBattingStateInvalid ? 'border-2 border-red-500/80 bg-red-950/20' : 'border border-gray-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isBattingStateInvalid
                      ? 'bg-red-500/30 text-red-300 border border-red-500/50 animate-pulse'
                      : 'bg-gray-800 text-gray-300'
                  }`}>
                    {isBattingStateInvalid ? '⚠️ Duplicate Non-Striker' : 'Non-Striker'}
                  </span>
                  {!isBattingStateInvalid && (
                    <button
                      onClick={handleSwapStrike}
                      disabled={actionLoading}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                      title="Swap striker and non-striker ends"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Swap Strike</span>
                    </button>
                  )}
                </div>
                <h4 className={`text-lg font-bold truncate ${isBattingStateInvalid ? 'text-red-300' : 'text-white'}`}>
                  {isBattingStateInvalid ? `${nonStrikerBatsman.name} (Conflict)` : nonStrikerBatsman.name}
                </h4>
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
                    Bowler (Max {maxOversPerBowler} ov)
                  </span>
                  <button
                    onClick={() => setShowBowlerModal(true)}
                    className="text-[11px] text-teal-400 hover:underline font-semibold"
                  >
                    Change Bowler
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
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Record Next Delivery</span>
                  </h3>
                  {currentInnings.status === 'completed' ? (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> INNINGS CONCLUDED
                    </span>
                  ) : isBattingStateInvalid ? (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> SCORING LOCKED
                    </span>
                  ) : null}
                </div>

                {currentInnings.status === 'completed' && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>Innings {currentInnings.inningsNumber} is completed. Score entry for this innings is closed.</span>
                    </div>
                    {currentInnings.inningsNumber === 1 && !inningsList.find((i) => i.inningsNumber === 2) && (
                      <button
                        onClick={() => setShowInnings2Modal(true)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shrink-0 transition shadow flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start Innings 2</span>
                      </button>
                    )}
                  </div>
                )}

                {isBattingStateInvalid && currentInnings.status !== 'completed' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>Scoring is locked because striker and non-striker are the same player. Use the fix dropdown above to pick a valid non-striker.</span>
                  </div>
                )}

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
                      disabled={actionLoading || isBattingStateInvalid || currentInnings.status === 'completed'}
                      className={`py-3.5 sm:py-4 rounded-2xl font-black font-mono text-xl sm:text-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex flex-col items-center justify-center ${btn.style}`}
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
                        dismissedPlayerId: currentInnings.strikerId || '',
                        newBatsman: availableBatters.length > 0 ? (availableBatters[0].displayName || availableBatters[0].name) : '',
                        newBatsmanId: availableBatters.length > 0 ? (availableBatters[0]._id || '') : '',
                        fielder: '',
                        fielderId: '',
                        runs: 0,
                      });
                      setShowWicketModal(true);
                    }}
                    disabled={actionLoading || isBattingStateInvalid || currentInnings.status === 'completed'}
                    className="py-3 px-2 rounded-2xl font-black text-xs sm:text-sm bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    <span>⚡ Wicket</span>
                  </button>

                  <button
                    onClick={() => handleRecordDelivery(0, 'wide', 1)}
                    disabled={actionLoading || isBattingStateInvalid || currentInnings.status === 'completed'}
                    className="py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Wide (+1)
                  </button>

                  <button
                    onClick={() => handleRecordDelivery(0, 'no_ball', 1)}
                    disabled={actionLoading || isBattingStateInvalid || currentInnings.status === 'completed'}
                    className="py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    No Ball (+1)
                  </button>

                  <button
                    onClick={() => handleRecordDelivery(1, 'bye', 0)}
                    disabled={actionLoading || isBattingStateInvalid || currentInnings.status === 'completed'}
                    className="py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm bg-gray-850 hover:bg-gray-800 text-gray-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Bye (1b)
                  </button>

                  <button
                    onClick={() => handleRecordDelivery(1, 'leg_bye', 0)}
                    disabled={actionLoading || isBattingStateInvalid || currentInnings.status === 'completed'}
                    className="py-3 px-2 rounded-2xl font-bold text-xs sm:text-sm bg-gray-850 hover:bg-gray-800 text-gray-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
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
                      disabled={currentInnings.status === 'completed'}
                      className="px-3.5 py-2 bg-gray-850 hover:bg-gray-800 text-gray-300 text-xs font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Change Bowler
                    </button>

                    {currentInnings.status === 'completed' ? (
                      currentInnings.inningsNumber === 1 && !inningsList.find((i) => i.inningsNumber === 2) ? (
                        <button
                          onClick={() => setShowInnings2Modal(true)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs rounded-xl transition shadow shadow-emerald-500/20 flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Innings 2</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowCompleteMatchModal(true)}
                          disabled={actionLoading || match.status === 'completed'}
                          className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-xl transition disabled:opacity-40"
                        >
                          {match.status === 'completed' ? 'Match Completed' : 'Complete Match'}
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => setShowEndInningsModal(true)}
                        disabled={actionLoading}
                        className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold rounded-xl transition"
                      >
                        Conclude Innings
                      </button>
                    )}
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
                        <td className="py-2.5 px-3 font-sans text-gray-400 text-[11px]">
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

      {/* SQUAD DRAWER MODAL / SLIDEOUT */}
      {showSquadDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
          <div className="bg-[#0e1526] border-l border-gray-800 w-full max-w-md h-full p-6 shadow-2xl flex flex-col space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Confirmed Playing XIs</h3>
              </div>
              <button
                onClick={() => setShowSquadDrawer(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Team 1 Playing XI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {match.team1} (Playing XI)
                </h4>
                <span className="text-[10px] text-gray-400">
                  {squadData?.team1?.playingXI?.length || 0} Players
                </span>
              </div>

              <div className="space-y-2">
                {(squadData?.team1?.playingXI || []).map((p) => {
                  const pName = p.displayName || p.name;
                  const isStriker = currentInnings?.striker === pName;
                  const isNonStriker = currentInnings?.nonStriker === pName;
                  const isBowler = currentInnings?.currentBowler === pName;
                  const dismissedRecord = currentInnings?.batsmen?.find((b) => b.name === pName && b.isOut);

                  let statusBadge = <span className="text-[10px] text-gray-500 font-medium">⚪ Available</span>;
                  if (isStriker) {
                    statusBadge = <span className="text-[10px] text-emerald-400 font-bold">🟢 Striker ({strikerBatsman.runs}*)</span>;
                  } else if (isNonStriker) {
                    statusBadge = <span className="text-[10px] text-emerald-400 font-bold">🟢 Batting ({nonStrikerBatsman.runs}*)</span>;
                  } else if (isBowler) {
                    statusBadge = <span className="text-[10px] text-teal-400 font-bold">🔵 Bowling</span>;
                  } else if (dismissedRecord) {
                    statusBadge = <span className="text-[10px] text-red-400 font-medium">🔴 Out ({dismissedRecord.runs})</span>;
                  }

                  return (
                    <div
                      key={p._id || p}
                      className="p-2.5 rounded-xl bg-[#090e1a] border border-gray-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{pName}</p>
                        <span className="text-[10px] text-gray-400">{p.playingRole || 'Player'}</span>
                      </div>
                      <div>{statusBadge}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team 2 Playing XI */}
            <div className="space-y-3 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  {match.team2} (Playing XI)
                </h4>
                <span className="text-[10px] text-gray-400">
                  {squadData?.team2?.playingXI?.length || 0} Players
                </span>
              </div>

              <div className="space-y-2">
                {(squadData?.team2?.playingXI || []).map((p) => {
                  const pName = p.displayName || p.name;
                  const isStriker = currentInnings?.striker === pName;
                  const isNonStriker = currentInnings?.nonStriker === pName;
                  const isBowler = currentInnings?.currentBowler === pName;
                  const dismissedRecord = currentInnings?.batsmen?.find((b) => b.name === pName && b.isOut);

                  let statusBadge = <span className="text-[10px] text-gray-500 font-medium">⚪ Available</span>;
                  if (isStriker) {
                    statusBadge = <span className="text-[10px] text-emerald-400 font-bold">🟢 Striker</span>;
                  } else if (isNonStriker) {
                    statusBadge = <span className="text-[10px] text-emerald-400 font-bold">🟢 Batting</span>;
                  } else if (isBowler) {
                    statusBadge = <span className="text-[10px] text-teal-400 font-bold">🔵 Bowling</span>;
                  } else if (dismissedRecord) {
                    statusBadge = <span className="text-[10px] text-red-400 font-medium">🔴 Out ({dismissedRecord.runs})</span>;
                  }

                  return (
                    <div
                      key={p._id || p}
                      className="p-2.5 rounded-xl bg-[#090e1a] border border-gray-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{pName}</p>
                        <span className="text-[10px] text-gray-400">{p.playingRole || 'Player'}</span>
                      </div>
                      <div>{statusBadge}</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: SELECT BOWLER (With Consecutive Over & Max Over Rules Enforced) */}
      {showBowlerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e1526] border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Select Next Bowler</h3>
                <p className="text-xs text-gray-400">
                  Select a bowler from {currentInnings?.bowlingTeam}'s Playing XI
                </p>
              </div>
              <button onClick={() => setShowBowlerModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {fieldingPlayingXI.map((player) => {
                const pName = player.displayName || player.name;
                const prevBowler = currentInnings?.previousBowler || '';
                const isConsecutive = prevBowler.toLowerCase() === pName.toLowerCase();

                // Find bowling stats
                const bowlerStats = currentInnings?.bowlers?.find(
                  (b) => b.name.toLowerCase() === pName.toLowerCase()
                );
                const completedOvers = Math.floor((bowlerStats?.legalBalls || 0) / 6);
                const isMaxOvers = completedOvers >= maxOversPerBowler;

                const isBlocked = isConsecutive || isMaxOvers;

                return (
                  <button
                    key={player._id || player}
                    type="button"
                    disabled={isBlocked || actionLoading}
                    onClick={() => handleSelectBowler(pName)}
                    className={`w-full p-3 rounded-2xl text-left border transition flex items-center justify-between ${
                      isBlocked
                        ? 'bg-[#080d18] border-gray-850 text-gray-600 opacity-60 cursor-not-allowed'
                        : 'bg-[#0c1424] hover:bg-[#121c33] border-gray-800 text-white cursor-pointer hover:border-teal-500/50'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">{pName}</p>
                      <span className="text-[10px] text-gray-400">
                        {bowlerStats ? `${bowlerStats.overs} ov • ${bowlerStats.wickets}-${bowlerStats.runsConceded}` : 'Yet to bowl'}
                      </span>
                    </div>

                    <div>
                      {isConsecutive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Bowled Last Over
                        </span>
                      ) : isMaxOvers ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Max {maxOversPerBowler} ov
                        </span>
                      ) : (
                        <span className="text-xs text-teal-400 font-semibold">Select ➜</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowBowlerModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WICKET ENTRY (With Fielding Attribution from Fielding XI) */}
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
                  <option value="retired_out">Retired Out</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Dismissed Batsman</label>
                <select
                  value={wicketForm.dismissedPlayer || currentInnings?.striker}
                  onChange={(e) => {
                    const dName = e.target.value;
                    const isStr = dName === currentInnings?.striker;
                    setWicketForm((prev) => ({
                      ...prev,
                      dismissedPlayer: dName,
                      dismissedPlayerId: isStr ? (currentInnings?.strikerId || '') : (currentInnings?.nonStrikerId || ''),
                    }));
                  }}
                  className="w-full px-3 py-2 bg-[#080d18] border border-gray-800 rounded-xl text-white text-xs"
                >
                  <option value={currentInnings?.striker}>{currentInnings?.striker} (Striker)</option>
                  <option value={currentInnings?.nonStriker}>{currentInnings?.nonStriker} (Non-Striker)</option>
                </select>
              </div>

              {/* Fielder Selector (If Caught, Run Out, or Stumped) */}
              {['caught', 'run_out', 'stumped'].includes(wicketForm.type) && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                    Fielder ({currentInnings?.bowlingTeam}) *
                  </label>
                  <select
                    value={wicketForm.fielder}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const fObj = fieldingPlayingXI.find(
                        (p) => (p.displayName || p.name) === selectedName
                      );
                      setWicketForm((prev) => ({
                        ...prev,
                        fielder: selectedName,
                        fielderId: fObj?._id || '',
                      }));
                    }}
                    className="w-full px-3 py-2 bg-[#080d18] border border-gray-800 rounded-xl text-white text-xs"
                    required
                  >
                    <option value="">Select Fielder from Fielding XI...</option>
                    {fieldingPlayingXI.map((f) => (
                      <option key={String(f._id || f)} value={f.displayName || f.name}>
                        {f.displayName || f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Next Batsman from Batting XI */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  New Incoming Batsman *
                </label>
                {availableBatters.length > 0 ? (
                  <select
                    value={wicketForm.newBatsmanId || wicketForm.newBatsman}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const bObj = availableBatters.find((b) => String(b._id || b) === selectedVal || (b.displayName || b.name) === selectedVal);
                      setWicketForm((prev) => ({
                        ...prev,
                        newBatsman: bObj ? (bObj.displayName || bObj.name) : selectedVal,
                        newBatsmanId: bObj ? (bObj._id || '') : '',
                      }));
                    }}
                    className="w-full px-3 py-2 bg-[#080d18] border border-gray-800 rounded-xl text-white text-xs"
                    required
                  >
                    <option value="">Select from Remaining Batting XI...</option>
                    {availableBatters.map((b) => (
                      <option key={String(b._id || b)} value={String(b._id || b)}>
                        {b.displayName || b.name} ({b.playingRole || 'Batter'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter player name"
                    value={wicketForm.newBatsman}
                    onChange={(e) => setWicketForm((prev) => ({ ...prev, newBatsman: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#080d18] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                )}
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

      {/* Innings 2 Launch Modal */}
      {showInnings2Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0c1424] border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowInnings2Modal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                2nd Innings Setup
              </span>
              <h3 className="text-xl font-black text-white">Start 2nd Innings (Run Chase)</h3>
              <p className="text-xs text-gray-400">
                Configure opening batsmen for <strong className="text-emerald-400">{getLaunchInningsConfig().battingTeam}</strong> and opening bowler for <strong className="text-teal-400">{getLaunchInningsConfig().bowlingTeam}</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-[#090e1a] border border-gray-800 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-gray-400 uppercase font-bold text-[10px]">Target to Win</span>
              <strong className="text-amber-300 font-mono text-sm">
                {(inningsList.find((i) => i.inningsNumber === 1)?.totalRuns || currentInnings?.totalRuns || 0) + 1} runs ({match.overs} ov)
              </strong>
            </div>

            <form onSubmit={handleLaunchScoring} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Opening Striker 🏏 ({getLaunchInningsConfig().battingTeam}) *
                </label>
                <select
                  value={strikerSelection}
                  onChange={(e) => setStrikerSelection(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#090e1a] border border-gray-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">Select Striker from Playing XI...</option>
                  {((getLaunchInningsConfig().battingTeamKey === 'team1'
                    ? squadData?.team1?.playingXI
                    : squadData?.team2?.playingXI) || []).map((p) => (
                    <option key={String(p._id || p)} value={String(p._id || p)}>
                      {p.displayName || p.name} ({p.playingRole || 'Batter'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Opening Non-Striker ({getLaunchInningsConfig().battingTeam}) *
                </label>
                <select
                  value={nonStrikerSelection}
                  onChange={(e) => setNonStrikerSelection(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#090e1a] border border-gray-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">Select Non-Striker from Playing XI...</option>
                  {((getLaunchInningsConfig().battingTeamKey === 'team1'
                    ? squadData?.team1?.playingXI
                    : squadData?.team2?.playingXI) || [])
                    .filter((p) => String(p._id || p) !== strikerSelection)
                    .map((p) => (
                      <option key={String(p._id || p)} value={String(p._id || p)}>
                        {p.displayName || p.name} ({p.playingRole || 'Batter'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  Opening Bowler ⚾ ({getLaunchInningsConfig().bowlingTeam}) *
                </label>
                <select
                  value={bowlerSelection}
                  onChange={(e) => setBowlerSelection(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#090e1a] border border-gray-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">Select Opening Bowler from Playing XI...</option>
                  {((getLaunchInningsConfig().bowlingTeamKey === 'team1'
                    ? squadData?.team1?.playingXI
                    : squadData?.team2?.playingXI) || []).map((p) => (
                    <option key={String(p._id || p)} value={String(p._id || p)}>
                      {p.displayName || p.name} ({p.playingRole || 'Bowler'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInnings2Modal(false)}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !strikerSelection || !nonStrikerSelection || !bowlerSelection}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-xl transition disabled:opacity-40"
                >
                  {actionLoading ? 'Starting...' : '🏏 Start Innings 2'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conclude Innings Confirm Dialog */}
      <ConfirmDialog
        isOpen={showEndInningsModal}
        title="Conclude Innings"
        message={`Are you sure you want to conclude ${currentInnings?.battingTeam || 'this'}'s innings? Once concluded, score entry for this innings will be locked.`}
        confirmText="Conclude Innings"
        variant="primary"
        loading={actionLoading}
        onConfirm={handleEndInnings}
        onCancel={() => setShowEndInningsModal(false)}
      />
    </div>
  );
}
