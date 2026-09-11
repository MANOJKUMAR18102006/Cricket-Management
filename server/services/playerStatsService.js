import Player from '../models/Player.js';
import Match from '../models/Match.js';
import Innings from '../models/Innings.js';

/**
 * Format legal balls count to cricket overs string (e.g. 23 legal balls -> "3.5")
 */
const formatOvers = (legalBalls) => {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
};

/**
 * Automatically calculate career statistics for a player from completed match performance data
 * 
 * @param {string|mongoose.Types.ObjectId} playerId 
 * @param {string} formatFilter 'all' | 'T20' | 'T10' | 'ODI' | 'Custom'
 * @returns {Promise<Object>} Calculated career statistics
 */
export const calculatePlayerStats = async (playerId, formatFilter = 'all') => {
  const player = await Player.findById(playerId).populate('userId', 'username');
  if (!player) {
    return null;
  }

  // Variations of player identifiers to ensure complete historical matching
  const playerIds = [String(player._id)];
  const playerNames = [
    player.displayName.trim().toLowerCase(),
    ...(player.userId?.username ? [player.userId.username.trim().toLowerCase()] : []),
  ];

  const matchesPlayer = (targetId, targetName) => {
    if (targetId && playerIds.includes(String(targetId))) {
      return true;
    }
    if (targetName && playerNames.includes(targetName.trim().toLowerCase())) {
      return true;
    }
    return false;
  };

  // Build match query for completed fixtures
  const matchQuery = { status: 'completed' };
  const normalizedFormat = formatFilter ? formatFilter.trim() : 'all';

  if (normalizedFormat.toLowerCase() !== 'all' && normalizedFormat.toLowerCase() !== 'overall') {
    matchQuery.format = new RegExp(`^${normalizedFormat}$`, 'i');
  }

  const completedMatches = await Match.find(matchQuery).select('_id format team1 team2');
  const matchIds = completedMatches.map((m) => m._id);

  // Fetch all innings for matching completed fixtures
  const inningsList = await Innings.find({ match: { $in: matchIds } });

  const uniqueMatchesSet = new Set();

  // BATTING COUNTERS
  let battingInnings = 0;
  let totalRuns = 0;
  let totalBalls = 0;
  let fours = 0;
  let sixes = 0;
  let fifties = 0;
  let hundreds = 0;
  let highestScore = 0;
  let highestScoreNotOut = false;
  let dismissals = 0;

  // BOWLING COUNTERS
  let bowlingInnings = 0;
  let totalLegalBalls = 0;
  let totalRunsConceded = 0;
  let totalWickets = 0;
  let bestWickets = 0;
  let bestRunsConceded = Infinity;

  // FIELDING COUNTERS
  let catches = 0;
  let runOuts = 0;
  let stumpings = 0;

  // Iterate over innings to aggregate performance
  inningsList.forEach((innings) => {
    let playedInThisInnings = false;

    // 1. Batting aggregation
    if (Array.isArray(innings.batsmen)) {
      innings.batsmen.forEach((b) => {
        if (matchesPlayer(b.playerId, b.name)) {
          playedInThisInnings = true;
          uniqueMatchesSet.add(String(innings.match));

          // Only count as innings if player faced balls, scored runs, or was dismissed
          if (b.balls > 0 || b.runs > 0 || b.isOut) {
            battingInnings++;
            totalRuns += b.runs || 0;
            totalBalls += b.balls || 0;
            fours += b.fours || 0;
            sixes += b.sixes || 0;

            if (b.runs >= 100) {
              hundreds++;
            } else if (b.runs >= 50) {
              fifties++;
            }

            if (b.isOut) {
              dismissals++;
            }

            // Track highest score
            if (
              b.runs > highestScore ||
              (b.runs === highestScore && !b.isOut && !highestScoreNotOut)
            ) {
              highestScore = b.runs;
              highestScoreNotOut = !b.isOut;
            }
          }
        }
      });
    }

    // 2. Bowling aggregation
    if (Array.isArray(innings.bowlers)) {
      innings.bowlers.forEach((bowl) => {
        if (matchesPlayer(bowl.playerId, bowl.name)) {
          playedInThisInnings = true;
          uniqueMatchesSet.add(String(innings.match));

          if (bowl.legalBalls > 0 || bowl.runsConceded > 0 || bowl.wickets > 0) {
            bowlingInnings++;
            totalLegalBalls += bowl.legalBalls || 0;
            totalRunsConceded += bowl.runsConceded || 0;
            totalWickets += bowl.wickets || 0;

            // Track best bowling figures (highest wickets, then lowest runs conceded)
            const w = bowl.wickets || 0;
            const r = bowl.runsConceded || 0;
            if (
              w > bestWickets ||
              (w === bestWickets && r < bestRunsConceded && (w > 0 || bestRunsConceded === Infinity))
            ) {
              bestWickets = w;
              bestRunsConceded = r;
            }
          }
        }
      });
    }

    // 3. Fielding aggregation from deliveries
    if (Array.isArray(innings.deliveries)) {
      innings.deliveries.forEach((del) => {
        if (del.isWicket && del.commentary) {
          const commLower = del.commentary.toLowerCase();
          playerNames.forEach((pName) => {
            // Check caught
            if (del.wicketType === 'caught' && commLower.includes(`c ${pName}`)) {
              catches++;
              uniqueMatchesSet.add(String(innings.match));
            }
            // Check stumped
            if (del.wicketType === 'stumped' && commLower.includes(`st ${pName}`)) {
              stumpings++;
              uniqueMatchesSet.add(String(innings.match));
            }
            // Check run out
            if (del.wicketType === 'run_out' && commLower.includes(`run out (${pName})`)) {
              runOuts++;
              uniqueMatchesSet.add(String(innings.match));
            }
          });
        }
      });
    }
  });

  // Calculate Batting derived metrics
  const battingAverage =
    dismissals > 0
      ? (totalRuns / dismissals).toFixed(2)
      : totalRuns > 0
      ? `${totalRuns}*`
      : '0.00';

  const strikeRate =
    totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(2) : '0.00';

  const highestScoreStr =
    highestScore > 0 ? `${highestScore}${highestScoreNotOut ? '*' : ''}` : '0';

  // Calculate Bowling derived metrics
  const bowlingAverage =
    totalWickets > 0 ? (totalRunsConceded / totalWickets).toFixed(2) : '0.00';

  const oversDecimal = Math.floor(totalLegalBalls / 6) + (totalLegalBalls % 6) / 6;
  const economy =
    oversDecimal > 0 ? (totalRunsConceded / oversDecimal).toFixed(2) : '0.00';

  const bestBowlingStr =
    bestWickets > 0 || (bestRunsConceded !== Infinity && totalLegalBalls > 0)
      ? `${bestWickets}/${bestRunsConceded === Infinity ? 0 : bestRunsConceded}`
      : '-';

  return {
    playerId: player._id,
    displayName: player.displayName,
    format: normalizedFormat,
    batting: {
      matches: uniqueMatchesSet.size,
      innings: battingInnings,
      runs: totalRuns,
      balls: totalBalls,
      highestScore: highestScoreStr,
      battingAverage,
      strikeRate,
      fours,
      sixes,
      fifties,
      hundreds,
    },
    bowling: {
      matches: uniqueMatchesSet.size,
      innings: bowlingInnings,
      overs: formatOvers(totalLegalBalls),
      runsConceded: totalRunsConceded,
      wickets: totalWickets,
      bestBowling: bestBowlingStr,
      bowlingAverage,
      economy,
    },
    fielding: {
      catches,
      runOuts,
      stumpings,
    },
  };
};

export default {
  calculatePlayerStats,
};
