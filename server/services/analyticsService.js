import mongoose from 'mongoose';
import Player from '../models/Player.js';
import Match from '../models/Match.js';
import Innings from '../models/Innings.js';
import Connection from '../models/Connection.js';
import { canViewPlayerData } from './privacyService.js';

/**
 * Format legal balls count to cricket overs string (e.g. 23 legal balls -> "3.5")
 */
const formatOvers = (legalBalls) => {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
};

/**
 * Get IDs of players that the viewer is authorized to view in leaderboards.
 * 
 * Rules:
 * 1. All public players are visible to anyone.
 * 2. If viewerPlayerId is provided:
 *    - viewer can see themselves.
 *    - viewer can see players with an accepted connection.
 * 3. All other private players are strictly excluded.
 */
export const getAuthorizedPlayerIdsForViewer = async (viewerPlayerId) => {
  // 1. All public players
  const publicPlayers = await Player.find({ profileVisibility: 'public' }).select('_id');
  const allowedSet = new Set(publicPlayers.map((p) => String(p._id)));

  // 2. If viewer is authenticated
  if (viewerPlayerId) {
    allowedSet.add(String(viewerPlayerId));

    // Accepted connections
    const connections = await Connection.find({
      status: 'accepted',
      $or: [
        { requester: viewerPlayerId },
        { receiver: viewerPlayerId },
      ],
    });

    connections.forEach((conn) => {
      if (String(conn.requester) === String(viewerPlayerId)) {
        allowedSet.add(String(conn.receiver));
      } else {
        allowedSet.add(String(conn.requester));
      }
    });
  }

  return allowedSet;
};

/**
 * Get Leaderboards across 8 categories with filters and privacy protection
 * 
 * @param {string|mongoose.Types.ObjectId|null} viewerPlayerId
 * @param {Object} filters { tournament, team, format, startDate, endDate, limit }
 */
export const getLeaderboards = async (viewerPlayerId, filters = {}) => {
  const {
    tournament,
    team,
    format,
    startDate,
    endDate,
    limit = 10,
  } = filters;

  const maxLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  // 1. Resolve which players are visible to this viewer
  const allowedPlayerIdSet = await getAuthorizedPlayerIdsForViewer(viewerPlayerId);

  // Fetch candidate players data
  const allowedObjectIds = Array.from(allowedPlayerIdSet)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const candidatePlayers = await Player.find({
    _id: { $in: allowedObjectIds },
  }).populate('userId', 'username');

  // Map of player identifier lookup
  const playerMap = new Map();
  candidatePlayers.forEach((p) => {
    playerMap.set(String(p._id), {
      _id: p._id,
      displayName: p.displayName,
      username: p.userId?.username || 'player',
      profileImage: p.profileImage || '',
      currentTeam: p.currentTeam || 'Free Agent',
      playingRole: p.playingRole,
      names: [
        p.displayName.trim().toLowerCase(),
        ...(p.userId?.username ? [p.userId.username.trim().toLowerCase()] : []),
      ],
    });
  });

  // 2. Build Match query
  const matchQuery = { status: 'completed' };

  if (format && format.toLowerCase() !== 'all' && format.toLowerCase() !== 'overall') {
    matchQuery.format = new RegExp(`^${format.trim()}$`, 'i');
  }

  if (tournament && tournament.trim()) {
    matchQuery.tournament = new RegExp(tournament.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  if (team && team.trim()) {
    const teamRegex = new RegExp(team.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    matchQuery.$or = [
      { team1: teamRegex },
      { team2: teamRegex },
    ];
  }

  if (startDate || endDate) {
    matchQuery.date = {};
    if (startDate) matchQuery.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchQuery.date.$lte = end;
    }
  }

  const matches = await Match.find(matchQuery).select('_id date tournament format team1 team2');
  const matchIds = matches.map((m) => m._id);

  if (matchIds.length === 0 || candidatePlayers.length === 0) {
    return {
      topRunScorers: [],
      topWicketTakers: [],
      bestBattingAverage: [],
      bestStrikeRate: [],
      mostSixes: [],
      mostFours: [],
      mostCatches: [],
      bestEconomy: [],
      totalMatchesScanned: 0,
      totalPlayersConsidered: candidatePlayers.length,
    };
  }

  // 3. Fetch Innings for matches
  const inningsList = await Innings.find({ match: { $in: matchIds } });

  // Initialize aggregation counters per allowed player
  const playerStatsMap = new Map();
  candidatePlayers.forEach((p) => {
    playerStatsMap.set(String(p._id), {
      player: playerMap.get(String(p._id)),
      matchesPlayed: new Set(),
      battingInnings: 0,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      dismissals: 0,
      bowlingInnings: 0,
      legalBalls: 0,
      runsConceded: 0,
      wickets: 0,
      catches: 0,
    });
  });

  const findPlayerId = (targetId, targetName) => {
    if (targetId && playerStatsMap.has(String(targetId))) {
      return String(targetId);
    }
    if (targetName) {
      const nameLower = targetName.trim().toLowerCase();
      for (const [pId, info] of playerMap.entries()) {
        if (info.names.includes(nameLower)) {
          return pId;
        }
      }
    }
    return null;
  };

  // 4. Aggregate innings data
  inningsList.forEach((innings) => {
    const matchIdStr = String(innings.match);

    // Batting
    if (Array.isArray(innings.batsmen)) {
      innings.batsmen.forEach((b) => {
        const pId = findPlayerId(b.playerId, b.name);
        if (pId) {
          const stats = playerStatsMap.get(pId);
          stats.matchesPlayed.add(matchIdStr);
          if (b.balls > 0 || b.runs > 0 || b.isOut) {
            stats.battingInnings++;
            stats.runs += b.runs || 0;
            stats.balls += b.balls || 0;
            stats.fours += b.fours || 0;
            stats.sixes += b.sixes || 0;
            if (b.isOut) {
              stats.dismissals++;
            }
          }
        }
      });
    }

    // Bowling
    if (Array.isArray(innings.bowlers)) {
      innings.bowlers.forEach((bowl) => {
        const pId = findPlayerId(bowl.playerId, bowl.name);
        if (pId) {
          const stats = playerStatsMap.get(pId);
          stats.matchesPlayed.add(matchIdStr);
          if (bowl.legalBalls > 0 || bowl.runsConceded > 0 || bowl.wickets > 0) {
            stats.bowlingInnings++;
            stats.legalBalls += bowl.legalBalls || 0;
            stats.runsConceded += bowl.runsConceded || 0;
            stats.wickets += bowl.wickets || 0;
          }
        }
      });
    }

    // Catches / Fielding from commentary
    if (Array.isArray(innings.deliveries)) {
      innings.deliveries.forEach((del) => {
        if (del.isWicket && del.wicketType === 'caught' && del.commentary) {
          const comm = del.commentary.toLowerCase();
          for (const [pId, info] of playerMap.entries()) {
            if (info.names.some((nm) => comm.includes(`c ${nm}`))) {
              const stats = playerStatsMap.get(pId);
              stats.catches++;
              stats.matchesPlayed.add(matchIdStr);
              break;
            }
          }
        }
      });
    }
  });

  // 5. Build ranked lists for the 8 categories
  const allPlayerStats = Array.from(playerStatsMap.values()).map((s) => {
    const matchesCount = s.matchesPlayed.size;
    const battingAvg =
      s.dismissals > 0
        ? parseFloat((s.runs / s.dismissals).toFixed(2))
        : s.runs > 0
        ? s.runs
        : 0;

    const strikeRate =
      s.balls > 0 ? parseFloat(((s.runs / s.balls) * 100).toFixed(2)) : 0;

    const oversDecimal =
      Math.floor(s.legalBalls / 6) + (s.legalBalls % 6) / 6;

    const economy =
      oversDecimal > 0
        ? parseFloat((s.runsConceded / oversDecimal).toFixed(2))
        : null;

    return {
      playerId: s.player._id,
      displayName: s.player.displayName,
      username: s.player.username,
      profileImage: s.player.profileImage,
      currentTeam: s.player.currentTeam,
      playingRole: s.player.playingRole,
      matches: matchesCount,
      innings: s.battingInnings,
      runs: s.runs,
      balls: s.balls,
      fours: s.fours,
      sixes: s.sixes,
      dismissals: s.dismissals,
      battingAverage: battingAvg,
      strikeRate,
      bowlingInnings: s.bowlingInnings,
      legalBalls: s.legalBalls,
      overs: formatOvers(s.legalBalls),
      runsConceded: s.runsConceded,
      wickets: s.wickets,
      economy,
      catches: s.catches,
    };
  });

  // 1. Top Run Scorers
  const topRunScorers = [...allPlayerStats]
    .filter((p) => p.runs > 0)
    .sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate)
    .slice(0, maxLimit)
    .map((p, i) => ({ rank: i + 1, ...p, statValue: p.runs, statLabel: 'Runs' }));

  // 2. Top Wicket Takers
  const topWicketTakers = [...allPlayerStats]
    .filter((p) => p.wickets > 0)
    .sort((a, b) => b.wickets - a.wickets || (a.economy ?? 999) - (b.economy ?? 999))
    .slice(0, maxLimit)
    .map((p, i) => ({ rank: i + 1, ...p, statValue: p.wickets, statLabel: 'Wickets' }));

  // 3. Best Batting Average (minimum 1 innings)
  const bestBattingAverage = [...allPlayerStats]
    .filter((p) => p.innings > 0 && p.battingAverage > 0)
    .sort((a, b) => b.battingAverage - a.battingAverage || b.runs - a.runs)
    .slice(0, maxLimit)
    .map((p, i) => ({ rank: i + 1, ...p, statValue: p.battingAverage, statLabel: 'Average' }));

  // 4. Best Strike Rate (minimum 1 ball faced)
  const bestStrikeRate = [...allPlayerStats]
    .filter((p) => p.balls > 0 && p.strikeRate > 0)
    .sort((a, b) => b.strikeRate - a.strikeRate || b.runs - a.runs)
    .slice(0, maxLimit)
    .map((p, i) => ({ rank: i + 1, ...p, statValue: p.strikeRate, statLabel: 'Strike Rate' }));

  // 5. Most Sixes
  const mostSixes = [...allPlayerStats]
    .filter((p) => p.sixes > 0)
    .sort((a, b) => b.sixes - a.sixes || b.runs - a.runs)
    .slice(0, maxLimit)
    .map((p, i) => ({ rank: i + 1, ...p, statValue: p.sixes, statLabel: 'Sixes' }));

  // 6. Most Fours
  const mostFours = [...allPlayerStats]
    .filter((p) => p.fours > 0)
    .sort((a, b) => b.fours - a.fours || b.runs - a.runs)
    .slice(0, maxLimit)
    .map((p, i) => ({ rank: i + 1, ...p, statValue: p.fours, statLabel: 'Fours' }));

  // 7. Most Catches
  const mostCatches = [...allPlayerStats]
    .filter((p) => p.catches > 0)
    .sort((a, b) => b.catches - a.catches || b.matches - a.matches)
    .slice(0, maxLimit)
    .map((p, i) => ({ rank: i + 1, ...p, statValue: p.catches, statLabel: 'Catches' }));

  // 8. Best Economy (minimum 6 legal balls / 1 over bowled)
  const bestEconomy = [...allPlayerStats]
    .filter((p) => p.legalBalls >= 6 && p.economy !== null)
    .sort((a, b) => a.economy - b.economy || b.wickets - a.wickets)
    .slice(0, maxLimit)
    .map((p, i) => ({ rank: i + 1, ...p, statValue: p.economy, statLabel: 'Economy' }));

  return {
    topRunScorers,
    topWicketTakers,
    bestBattingAverage,
    bestStrikeRate,
    mostSixes,
    mostFours,
    mostCatches,
    bestEconomy,
    totalMatchesScanned: matches.length,
    totalPlayersConsidered: candidatePlayers.length,
  };
};

/**
 * Get detailed player performance analytics and trends over time
 * 
 * @param {string|mongoose.Types.ObjectId} targetPlayerId
 * @param {string|mongoose.Types.ObjectId|null} viewerPlayerId
 * @param {Object} filters { format, tournament, startDate, endDate }
 */
export const getPlayerAnalytics = async (targetPlayerId, viewerPlayerId, filters = {}) => {
  const targetPlayer = await Player.findById(targetPlayerId).populate('userId', 'username');
  if (!targetPlayer) {
    const error = new Error('Player not found');
    error.status = 404;
    throw error;
  }

  // PRIVACY CHECK
  const authorized = await canViewPlayerData(viewerPlayerId, targetPlayer._id);
  if (!authorized) {
    const error = new Error("This player's cricket statistics are private. Connect with this player to view their analytics.");
    error.status = 403;
    error.privacyRestricted = true;
    throw error;
  }

  const { format, tournament, startDate, endDate } = filters;

  const playerNames = [
    targetPlayer.displayName.trim().toLowerCase(),
    ...(targetPlayer.userId?.username ? [targetPlayer.userId.username.trim().toLowerCase()] : []),
  ];
  const targetIdStr = String(targetPlayer._id);

  const matchesPlayer = (tId, tName) => {
    if (tId && String(tId) === targetIdStr) return true;
    if (tName && playerNames.includes(tName.trim().toLowerCase())) return true;
    return false;
  };

  // Build match query
  const matchQuery = { status: 'completed' };

  if (format && format.toLowerCase() !== 'all' && format.toLowerCase() !== 'overall') {
    matchQuery.format = new RegExp(`^${format.trim()}$`, 'i');
  }

  if (tournament && tournament.trim()) {
    matchQuery.tournament = new RegExp(tournament.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  if (startDate || endDate) {
    matchQuery.date = {};
    if (startDate) matchQuery.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchQuery.date.$lte = end;
    }
  }

  const matches = await Match.find(matchQuery).sort({ date: 1 }); // chronological order
  const matchIds = matches.map((m) => m._id);

  const inningsList = await Innings.find({ match: { $in: matchIds } });

  // Map innings by match ID
  const inningsByMatch = new Map();
  inningsList.forEach((inn) => {
    const mId = String(inn.match);
    if (!inningsByMatch.has(mId)) {
      inningsByMatch.set(mId, []);
    }
    inningsByMatch.get(mId).push(inn);
  });

  const matchPerformances = [];

  matches.forEach((match) => {
    const mId = String(match._id);
    const inningsForMatch = inningsByMatch.get(mId) || [];

    let played = false;
    let battingStats = {
      batted: false,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
      dismissal: 'Did not bat',
    };

    let bowlingStats = {
      bowled: false,
      overs: '0.0',
      legalBalls: 0,
      runsConceded: 0,
      wickets: 0,
      economy: 0,
    };

    let fieldingStats = {
      catches: 0,
    };

    let playerTeam = '';
    let opponentTeam = '';

    inningsForMatch.forEach((inn) => {
      // Check batsmen
      if (Array.isArray(inn.batsmen)) {
        const bEntry = inn.batsmen.find((b) => matchesPlayer(b.playerId, b.name));
        if (bEntry) {
          played = true;
          playerTeam = inn.battingTeam;
          opponentTeam = inn.bowlingTeam;

          if (bEntry.balls > 0 || bEntry.runs > 0 || bEntry.isOut) {
            battingStats = {
              batted: true,
              runs: bEntry.runs || 0,
              balls: bEntry.balls || 0,
              fours: bEntry.fours || 0,
              sixes: bEntry.sixes || 0,
              strikeRate: bEntry.balls > 0 ? parseFloat(((bEntry.runs / bEntry.balls) * 100).toFixed(1)) : 0,
              isOut: !!bEntry.isOut,
              dismissal: bEntry.isOut ? (bEntry.dismissal || 'Out') : 'Not out',
            };
          }
        }
      }

      // Check bowlers
      if (Array.isArray(inn.bowlers)) {
        const bowlEntry = inn.bowlers.find((bw) => matchesPlayer(bw.playerId, bw.name));
        if (bowlEntry) {
          played = true;
          playerTeam = inn.bowlingTeam;
          opponentTeam = inn.battingTeam;

          if (bowlEntry.legalBalls > 0 || bowlEntry.runsConceded > 0 || bowlEntry.wickets > 0) {
            const oversDec = Math.floor(bowlEntry.legalBalls / 6) + (bowlEntry.legalBalls % 6) / 6;
            const econ = oversDec > 0 ? parseFloat((bowlEntry.runsConceded / oversDec).toFixed(2)) : 0;

            bowlingStats = {
              bowled: true,
              overs: formatOvers(bowlEntry.legalBalls),
              legalBalls: bowlEntry.legalBalls || 0,
              runsConceded: bowlEntry.runsConceded || 0,
              wickets: bowlEntry.wickets || 0,
              economy: econ,
            };
          }
        }
      }

      // Check deliveries for catches
      if (Array.isArray(inn.deliveries)) {
        inn.deliveries.forEach((del) => {
          if (del.isWicket && del.wicketType === 'caught' && del.commentary) {
            const comm = del.commentary.toLowerCase();
            if (playerNames.some((nm) => comm.includes(`c ${nm}`))) {
              played = true;
              fieldingStats.catches++;
            }
          }
        });
      }
    });

    if (played) {
      if (!opponentTeam) {
        opponentTeam = match.team1 === playerTeam ? match.team2 : match.team1;
      }

      const matchDateStr = match.date ? new Date(match.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }) : 'TBD';

      // Impact score calculation for performance index:
      // (runs * 1) + (fours * 1) + (sixes * 2) + (wickets * 25) + (catches * 10) - (runsConceded * 0.5)
      const impactScore = Math.max(
        0,
        Math.round(
          battingStats.runs +
          battingStats.fours +
          battingStats.sixes * 2 +
          bowlingStats.wickets * 25 +
          fieldingStats.catches * 10 -
          (bowlingStats.runsConceded * 0.5)
        )
      );

      matchPerformances.push({
        matchId: match._id,
        rawDate: match.date,
        date: matchDateStr,
        opponent: opponentTeam || 'Opponent',
        tournament: match.tournament || 'Match',
        format: match.format,
        batting: battingStats,
        bowling: bowlingStats,
        fielding: fieldingStats,
        impactScore,
      });
    }
  });

  // Calculate trends chronologically
  let cumulativeRuns = 0;
  let cumulativeBalls = 0;
  let cumulativeWickets = 0;

  const runsPerMatch = [];
  const strikeRateTrend = [];
  const wicketsTrend = [];
  const performanceOverTime = [];

  matchPerformances.forEach((perf, idx) => {
    const matchLabel = `M${idx + 1} (${perf.opponent})`;

    cumulativeRuns += perf.batting.runs;
    cumulativeBalls += perf.batting.balls;
    cumulativeWickets += perf.bowling.wickets;

    const cumulativeSR =
      cumulativeBalls > 0
        ? parseFloat(((cumulativeRuns / cumulativeBalls) * 100).toFixed(1))
        : 0;

    // 1. Runs per match
    runsPerMatch.push({
      matchIndex: idx + 1,
      label: matchLabel,
      date: perf.date,
      opponent: perf.opponent,
      tournament: perf.tournament,
      runs: perf.batting.runs,
      balls: perf.batting.balls,
      fours: perf.batting.fours,
      sixes: perf.batting.sixes,
      cumulativeRuns,
      isOut: perf.batting.isOut,
      dismissal: perf.batting.dismissal,
    });

    // 2. Strike rate trend
    strikeRateTrend.push({
      matchIndex: idx + 1,
      label: matchLabel,
      date: perf.date,
      opponent: perf.opponent,
      matchStrikeRate: perf.batting.strikeRate,
      cumulativeStrikeRate: cumulativeSR,
      runs: perf.batting.runs,
      balls: perf.batting.balls,
    });

    // 3. Wickets trend
    wicketsTrend.push({
      matchIndex: idx + 1,
      label: matchLabel,
      date: perf.date,
      opponent: perf.opponent,
      wickets: perf.bowling.wickets,
      runsConceded: perf.bowling.runsConceded,
      economy: perf.bowling.economy,
      overs: perf.bowling.overs,
      cumulativeWickets,
    });

    // 4. Performance over time (integrated impact)
    performanceOverTime.push({
      matchIndex: idx + 1,
      label: matchLabel,
      date: perf.date,
      opponent: perf.opponent,
      impactScore: perf.impactScore,
      runs: perf.batting.runs,
      wickets: perf.bowling.wickets,
      catches: perf.fielding.catches,
    });
  });

  // Recent Form: last 5 matches reversed (most recent first)
  const recentForm = [...matchPerformances]
    .slice(-5)
    .reverse()
    .map((p) => {
      let badge = '';
      if (p.batting.batted && p.bowling.bowled) {
        badge = `${p.batting.runs}${p.batting.isOut ? '' : '*'} & ${p.bowling.wickets}/${p.bowling.runsConceded}`;
      } else if (p.batting.batted) {
        badge = `${p.batting.runs}${p.batting.isOut ? '' : '*'}(${p.batting.balls})`;
      } else if (p.bowling.bowled) {
        badge = `${p.bowling.wickets}/${p.bowling.runsConceded} (${p.bowling.overs})`;
      } else {
        badge = p.fielding.catches > 0 ? `${p.fielding.catches} ct` : 'DNB';
      }

      return {
        matchId: p.matchId,
        date: p.date,
        opponent: p.opponent,
        tournament: p.tournament,
        format: p.format,
        badge,
        runs: p.batting.runs,
        balls: p.batting.balls,
        wickets: p.bowling.wickets,
        overs: p.bowling.overs,
        catches: p.fielding.catches,
        impactScore: p.impactScore,
      };
    });

  return {
    player: {
      _id: targetPlayer._id,
      displayName: targetPlayer.displayName,
      profileImage: targetPlayer.profileImage,
      playingRole: targetPlayer.playingRole,
      currentTeam: targetPlayer.currentTeam,
      city: targetPlayer.city,
    },
    totalMatches: matchPerformances.length,
    recentForm,
    runsPerMatch,
    strikeRateTrend,
    wicketsTrend,
    performanceOverTime,
  };
};

export default {
  getAuthorizedPlayerIdsForViewer,
  getLeaderboards,
  getPlayerAnalytics,
};
