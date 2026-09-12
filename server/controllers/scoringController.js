import Match from '../models/Match.js';
import Innings from '../models/Innings.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import { recalculateInnings, formatOvers, getMaxOversPerBowler } from '../services/scoringService.js';
import { notifyMatchCompleted } from '../services/notificationService.js';

/**
 * Check if the user is authorized to score the match (Creator or Admin)
 */
const isAuthorizedScorer = (match, user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return match.createdBy.toString() === user._id.toString();
};

/**
 * Validate that a bowler is eligible to bowl according to cricket rules:
 * 1. Cannot bowl consecutive overs
 * 2. Maximum overs limit for format (e.g. 4 for T20, 2 for T10, 10 for ODI)
 * 3. Belongs to fielding team's Playing XI (if Playing XI defined)
 */
export const validateBowlerEligibility = (match, innings, bowlerName, prevBowlerOverride = null) => {
  const cleanName = (bowlerName || '').trim();
  if (!cleanName) {
    return { valid: false, message: 'Bowler name is required' };
  }

  // Check consecutive over restriction
  const prevBowler = prevBowlerOverride || innings.previousBowler || '';
  if (prevBowler && prevBowler.toLowerCase() === cleanName.toLowerCase()) {
    return { valid: false, message: `Bowler "${cleanName}" cannot bowl consecutive overs` };
  }

  // Maximum overs check
  const maxOvers = getMaxOversPerBowler(match.format, match.overs);
  const bowlerStats = innings.bowlers?.find(
    (b) => b.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (bowlerStats) {
    const completedOvers = Math.floor((bowlerStats.legalBalls || 0) / 6);
    if (completedOvers >= maxOvers) {
      return {
        valid: false,
        message: `Bowler "${cleanName}" has already reached the maximum limit of ${maxOvers} overs`,
      };
    }
  }

  // Playing XI check
  const isTeam1Bowling = innings.bowlingTeam === match.team1;
  const fieldingXI = isTeam1Bowling ? match.team1PlayingXI : match.team2PlayingXI;
  if (Array.isArray(fieldingXI) && fieldingXI.length > 0) {
    const isInXI = fieldingXI.some((p) => {
      const pName = (p.displayName || p.name || '').trim().toLowerCase();
      return pName === cleanName.toLowerCase() || String(p._id || p) === cleanName;
    });
    if (!isInXI) {
      return {
        valid: false,
        message: `Bowler "${cleanName}" must be a member of the fielding team's Playing XI`,
      };
    }
  }

  return { valid: true };
};

/**
 * Validate that a batter is eligible:
 * 1. Cannot be the same as the other batter at the crease (by ID or name)
 * 2. Cannot be already dismissed in this innings
 * 3. Belongs to batting team's Playing XI (if Playing XI defined)
 */
export const validateBatterEligibility = (match, innings, batterInput, otherBatterInput = null) => {
  const parseBatter = (val) => {
    if (!val) return { name: '', id: '' };
    if (typeof val === 'object') {
      return {
        name: (val.name || val.displayName || '').trim(),
        id: (val._id || val.id || val.playerId || '').toString().trim(),
      };
    }
    const s = String(val).trim();
    return { name: s, id: s };
  };

  const batter = parseBatter(batterInput);
  const other = parseBatter(otherBatterInput);

  if (!batter.name && !batter.id) {
    return { valid: false, message: 'Batter identifier is required' };
  }

  // 1. Cannot be the same player as the other batter at the crease
  if (other.name || other.id) {
    if (batter.id && other.id && batter.id === other.id) {
      return { valid: false, message: 'Striker and non-striker cannot be the same batsman (identical Player ID)' };
    }
    if (batter.name && other.name && batter.name.toLowerCase() === other.name.toLowerCase()) {
      return { valid: false, message: 'Striker and non-striker cannot be the same batsman' };
    }
  }

  // 2. Cannot be already dismissed in this innings
  const dismissed = innings.batsmen?.find((b) => {
    const isSameId = batter.id && b.playerId && String(b.playerId) === batter.id;
    const isSameName = batter.name && b.name.trim().toLowerCase() === batter.name.toLowerCase();
    return (isSameId || isSameName) && b.isOut;
  });
  if (dismissed) {
    return { valid: false, message: `Batter "${dismissed.name}" has already been dismissed` };
  }

  // 3. Must belong to batting team's Playing XI (if Playing XI defined)
  const isTeam1Batting = innings.battingTeam === match.team1;
  const battingXI = isTeam1Batting ? match.team1PlayingXI : match.team2PlayingXI;
  if (Array.isArray(battingXI) && battingXI.length > 0) {
    const isInXI = battingXI.some((p) => {
      const pId = String(p._id || p);
      const pName = (p.displayName || p.name || '').trim().toLowerCase();
      if (batter.id && pId === batter.id) return true;
      if (batter.name && pName === batter.name.toLowerCase()) return true;
      return false;
    });
    if (!isInXI) {
      return {
        valid: false,
        message: `Batter "${batter.name || batter.id}" must be a member of the batting team's Playing XI`,
      };
    }
  }

  return { valid: true };
};

/**
 * @desc    Get current scoring state for a match
 * @route   GET /api/scoring/:matchId
 * @access  Public
 */
export const getMatchScoringState = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;

    const match = await Match.findById(matchId)
      .populate('createdBy', 'username role')
      .populate('team1PlayingXI', 'displayName profileImage playingRole jerseyNumber city')
      .populate('team2PlayingXI', 'displayName profileImage playingRole jerseyNumber city');

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const inningsList = await Innings.find({ match: matchId }).sort({ inningsNumber: 1 });
    const currentInningsNumber = match.currentInningsNumber || 1;
    const currentInnings = inningsList.find((i) => i.inningsNumber === currentInningsNumber) || inningsList[0] || null;

    // Self-healing check: If striker and non-striker are identical in the database, heal immediately!
    if (currentInnings && currentInnings.striker && currentInnings.nonStriker) {
      const sameId = currentInnings.strikerId && currentInnings.nonStrikerId && String(currentInnings.strikerId) === String(currentInnings.nonStrikerId);
      const sameName = currentInnings.striker.trim().toLowerCase() === currentInnings.nonStriker.trim().toLowerCase();
      if (sameId || sameName) {
        recalculateInnings(currentInnings, match.overs);
        await currentInnings.save();
      }
    }

    let currentOverDeliveries = [];
    if (currentInnings && currentInnings.deliveries && currentInnings.deliveries.length > 0) {
      const currentLegalBalls = currentInnings.legalBalls || 0;
      const currentOverIndex = Math.floor(currentLegalBalls / 6);
      currentOverDeliveries = currentInnings.deliveries.filter((d) => d.over === currentOverIndex);
    }

    res.status(200).json({
      success: true,
      match,
      currentInnings,
      inningsList,
      currentOverDeliveries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Squads and Playing XI for both teams in a match
 * @route   GET /api/matches/:matchId/squad
 * @access  Public
 */
export const getMatchSquad = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;

    const match = await Match.findById(matchId)
      .populate('team1PlayingXI', 'displayName profileImage playingRole jerseyNumber city')
      .populate('team2PlayingXI', 'displayName profileImage playingRole jerseyNumber city');

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const team1Doc = await Team.findOne({ name: { $regex: new RegExp(`^${match.team1.trim()}$`, 'i') } })
      .populate('members', 'displayName profileImage playingRole jerseyNumber city')
      .populate('captain', 'displayName profileImage')
      .populate('viceCaptain', 'displayName profileImage');

    const team2Doc = await Team.findOne({ name: { $regex: new RegExp(`^${match.team2.trim()}$`, 'i') } })
      .populate('members', 'displayName profileImage playingRole jerseyNumber city')
      .populate('captain', 'displayName profileImage')
      .populate('viceCaptain', 'displayName profileImage');

    const maxOversPerBowler = getMaxOversPerBowler(match.format, match.overs);

    res.status(200).json({
      success: true,
      matchId: match._id,
      maxOversPerBowler,
      team1: {
        name: match.team1,
        teamId: team1Doc?._id || null,
        squad: team1Doc?.members || [],
        captain: team1Doc?.captain || null,
        viceCaptain: team1Doc?.viceCaptain || null,
        playingXI: match.team1PlayingXI || [],
      },
      team2: {
        name: match.team2,
        teamId: team2Doc?._id || null,
        squad: team2Doc?.members || [],
        captain: team2Doc?.captain || null,
        viceCaptain: team2Doc?.viceCaptain || null,
        playingXI: match.team2PlayingXI || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set Playing XI for both teams
 * @route   POST /api/matches/:matchId/playing-xi
 * @access  Private (Creator / Admin)
 */
export const setPlayingXI = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;
    let { team1PlayingXI, team2PlayingXI, team, playerIds } = req.body;

    if (team === 'team1' && Array.isArray(playerIds)) {
      team1PlayingXI = playerIds;
    } else if (team === 'team2' && Array.isArray(playerIds)) {
      team2PlayingXI = playerIds;
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to configure this match' });
    }

    const team1Doc = await Team.findOne({ name: { $regex: new RegExp(`^${match.team1.trim()}$`, 'i') } });
    const team2Doc = await Team.findOne({ name: { $regex: new RegExp(`^${match.team2.trim()}$`, 'i') } });

    // Validate Team 1 Playing XI
    if (team1PlayingXI !== undefined) {
      if (!Array.isArray(team1PlayingXI)) {
        return res.status(400).json({ success: false, message: 'team1PlayingXI must be an array' });
      }
      if (team1PlayingXI.length > 11) {
        return res.status(400).json({ success: false, message: 'Playing XI cannot exceed 11 players' });
      }
      const unique1 = new Set(team1PlayingXI.map((id) => String(id)));
      if (unique1.size !== team1PlayingXI.length) {
        return res.status(400).json({ success: false, message: 'Playing XI cannot contain duplicate players' });
      }
      if (team1Doc && team1Doc.members && team1Doc.members.length > 0) {
        const squadIds = new Set(team1Doc.members.map((m) => String(m._id || m)));
        const nonMembers = team1PlayingXI.filter((id) => !squadIds.has(String(id)));
        if (nonMembers.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'All players in Team 1 Playing XI must be valid squad members',
          });
        }
      }
      match.team1PlayingXI = team1PlayingXI;
    }

    // Validate Team 2 Playing XI
    if (team2PlayingXI !== undefined) {
      if (!Array.isArray(team2PlayingXI)) {
        return res.status(400).json({ success: false, message: 'team2PlayingXI must be an array' });
      }
      if (team2PlayingXI.length > 11) {
        return res.status(400).json({ success: false, message: 'Playing XI cannot exceed 11 players' });
      }
      const unique2 = new Set(team2PlayingXI.map((id) => String(id)));
      if (unique2.size !== team2PlayingXI.length) {
        return res.status(400).json({ success: false, message: 'Playing XI cannot contain duplicate players' });
      }
      if (team2Doc && team2Doc.members && team2Doc.members.length > 0) {
        const squadIds = new Set(team2Doc.members.map((m) => String(m._id || m)));
        const nonMembers = team2PlayingXI.filter((id) => !squadIds.has(String(id)));
        if (nonMembers.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'All players in Team 2 Playing XI must be valid squad members',
          });
        }
      }
      match.team2PlayingXI = team2PlayingXI;
    }

    await match.save();

    const populatedMatch = await Match.findById(match._id)
      .populate('team1PlayingXI', 'displayName profileImage playingRole jerseyNumber city')
      .populate('team2PlayingXI', 'displayName profileImage playingRole jerseyNumber city');

    res.status(200).json({
      success: true,
      message: 'Playing XI confirmed successfully',
      playingXI: team === 'team1' ? populatedMatch.team1PlayingXI : team === 'team2' ? populatedMatch.team2PlayingXI : undefined,
      team1PlayingXI: populatedMatch.team1PlayingXI,
      team2PlayingXI: populatedMatch.team2PlayingXI,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Start an innings (1st or 2nd)
 * @route   POST /api/scoring/:matchId/start-innings
 * @access  Private (Creator / Admin)
 */
export const startInnings = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;
    const {
      inningsNumber = 1,
      battingTeam,
      bowlingTeam,
      striker,
      strikerId = null,
      nonStriker,
      nonStrikerId = null,
      bowler,
      bowlerId = null,
    } = req.body;

    const match = await Match.findById(matchId)
      .populate('team1PlayingXI', 'displayName profileImage')
      .populate('team2PlayingXI', 'displayName profileImage');

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to score this match' });
    }

    if (!battingTeam || !bowlingTeam) {
      return res.status(400).json({ success: false, message: 'Batting and bowling teams are required' });
    }

    if (!striker || !nonStriker || !bowler) {
      return res.status(400).json({
        success: false,
        message: 'Striker, non-striker, and opening bowler are required to start innings',
      });
    }

    // Backend validation: IDs must not match
    if (strikerId && nonStrikerId && String(strikerId) === String(nonStrikerId)) {
      return res.status(400).json({
        success: false,
        message: 'Striker and non-striker cannot be the same player (identical Player ID)',
      });
    }

    // Names must not match
    if (striker.trim().toLowerCase() === nonStriker.trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Striker and non-striker cannot be the same batsman',
      });
    }

    // Determine target if 2nd innings
    let target = null;
    if (Number(inningsNumber) === 2) {
      const innings1 = await Innings.findOne({ match: matchId, inningsNumber: 1 });
      if (innings1) {
        target = innings1.totalRuns + 1;
      }
    }

    // Find or create the innings
    let innings = await Innings.findOne({ match: matchId, inningsNumber });
    if (!innings) {
      innings = new Innings({
        match: matchId,
        inningsNumber,
        battingTeam: battingTeam.trim(),
        bowlingTeam: bowlingTeam.trim(),
        striker: striker.trim(),
        strikerId: strikerId || null,
        nonStriker: nonStriker.trim(),
        nonStrikerId: nonStrikerId || null,
        openingStriker: striker.trim(),
        openingStrikerId: strikerId || null,
        openingNonStriker: nonStriker.trim(),
        openingNonStrikerId: nonStrikerId || null,
        currentBowler: bowler.trim(),
        currentBowlerId: bowlerId || null,
        previousBowler: '',
        target,
        batsmen: [
          { name: striker.trim(), playerId: strikerId || null, battingOrder: 1, dismissal: 'not out' },
          { name: nonStriker.trim(), playerId: nonStrikerId || null, battingOrder: 2, dismissal: 'not out' },
        ],
        bowlers: [{ name: bowler.trim(), playerId: bowlerId || null }],
      });
    } else {
      innings.battingTeam = battingTeam.trim();
      innings.bowlingTeam = bowlingTeam.trim();
      innings.striker = striker.trim();
      innings.strikerId = strikerId || null;
      innings.nonStriker = nonStriker.trim();
      innings.nonStrikerId = nonStrikerId || null;
      innings.openingStriker = striker.trim();
      innings.openingStrikerId = strikerId || null;
      innings.openingNonStriker = nonStriker.trim();
      innings.openingNonStrikerId = nonStrikerId || null;
      innings.currentBowler = bowler.trim();
      innings.currentBowlerId = bowlerId || null;
      innings.target = target;
      innings.status = 'in_progress';
      if (!innings.batsmen || innings.batsmen.length === 0) {
        innings.batsmen = [
          { name: striker.trim(), playerId: strikerId || null, battingOrder: 1, dismissal: 'not out' },
          { name: nonStriker.trim(), playerId: nonStrikerId || null, battingOrder: 2, dismissal: 'not out' },
        ];
      }
    }

    // Validate batting and bowling participants
    const batterCheck1 = validateBatterEligibility(match, innings, { name: striker, id: strikerId }, { name: nonStriker, id: nonStrikerId });
    if (!batterCheck1.valid) {
      return res.status(400).json({ success: false, message: batterCheck1.message });
    }
    const batterCheck2 = validateBatterEligibility(match, innings, { name: nonStriker, id: nonStrikerId }, { name: striker, id: strikerId });
    if (!batterCheck2.valid) {
      return res.status(400).json({ success: false, message: batterCheck2.message });
    }
    const bowlerCheck = validateBowlerEligibility(match, innings, bowler);
    if (!bowlerCheck.valid) {
      return res.status(400).json({ success: false, message: bowlerCheck.message });
    }

    recalculateInnings(innings, match.overs);
    await innings.save();

    match.status = 'live';
    match.currentInningsNumber = Number(inningsNumber);
    match.liveScore = {
      team: innings.battingTeam,
      runs: innings.totalRuns,
      wickets: innings.wickets,
      overs: innings.overs,
      target: innings.target,
    };
    await match.save();

    const inningsList = await Innings.find({ match: matchId }).sort({ inningsNumber: 1 });

    res.status(200).json({
      success: true,
      message: `Innings ${inningsNumber} started`,
      match,
      currentInnings: innings,
      inningsList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set current bowler
 * @route   PUT /api/matches/:matchId/bowler
 * @access  Private (Creator / Admin)
 */
export const setBowler = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;
    const { bowler, bowlerId } = req.body;

    const match = await Match.findById(matchId)
      .populate('team1PlayingXI', 'displayName profileImage')
      .populate('team2PlayingXI', 'displayName profileImage');

    if (!match || !isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const currentInningsNumber = match.currentInningsNumber || 1;
    const innings = await Innings.findOne({ match: matchId, inningsNumber: currentInningsNumber });
    if (!innings) {
      return res.status(404).json({ success: false, message: 'Innings not found' });
    }

    const check = validateBowlerEligibility(match, innings, bowler);
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    innings.currentBowler = bowler.trim();
    if (bowlerId) innings.currentBowlerId = bowlerId;

    const existing = innings.bowlers?.find((b) => (bowlerId && b.playerId && String(b.playerId) === String(bowlerId)) || b.name.toLowerCase() === bowler.trim().toLowerCase());
    if (!existing) {
      innings.bowlers.push({ name: bowler.trim(), playerId: bowlerId || null });
    } else if (bowlerId && !existing.playerId) {
      existing.playerId = bowlerId;
    }

    await innings.save();

    res.status(200).json({
      success: true,
      message: `${bowler.trim()} is now bowling`,
      currentBowler: innings.currentBowler,
      innings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set current striker
 * @route   PUT /api/matches/:matchId/striker
 * @access  Private (Creator / Admin)
 */
export const setStriker = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;
    const { striker, strikerId } = req.body;

    const match = await Match.findById(matchId)
      .populate('team1PlayingXI', 'displayName')
      .populate('team2PlayingXI', 'displayName');

    if (!match || !isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const innings = await Innings.findOne({ match: matchId, inningsNumber: match.currentInningsNumber || 1 });
    if (!innings) {
      return res.status(404).json({ success: false, message: 'Innings not found' });
    }

    const check = validateBatterEligibility(
      match,
      innings,
      { name: striker, id: strikerId },
      { name: innings.nonStriker, id: innings.nonStrikerId }
    );
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    innings.striker = striker.trim();
    if (strikerId) innings.strikerId = strikerId;

    const existing = innings.batsmen?.find(
      (b) => (strikerId && b.playerId && String(b.playerId) === String(strikerId)) ||
             b.name.toLowerCase() === striker.trim().toLowerCase()
    );
    if (!existing) {
      innings.batsmen.push({
        name: striker.trim(),
        playerId: strikerId || null,
        battingOrder: (innings.batsmen?.length || 0) + 1,
        dismissal: 'not out',
      });
    } else if (strikerId && !existing.playerId) {
      existing.playerId = strikerId;
    }

    await innings.save();

    res.status(200).json({
      success: true,
      message: `Striker set to ${striker.trim()}`,
      striker: innings.striker,
      nonStriker: innings.nonStriker,
      innings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set current non-striker
 * @route   PUT /api/matches/:matchId/non-striker
 * @access  Private (Creator / Admin)
 */
export const setNonStriker = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;
    const { nonStriker, nonStrikerId } = req.body;

    const match = await Match.findById(matchId)
      .populate('team1PlayingXI', 'displayName')
      .populate('team2PlayingXI', 'displayName');

    if (!match || !isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const innings = await Innings.findOne({ match: matchId, inningsNumber: match.currentInningsNumber || 1 });
    if (!innings) {
      return res.status(404).json({ success: false, message: 'Innings not found' });
    }

    const check = validateBatterEligibility(
      match,
      innings,
      { name: nonStriker, id: nonStrikerId },
      { name: innings.striker, id: innings.strikerId }
    );
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    innings.nonStriker = nonStriker.trim();
    if (nonStrikerId) innings.nonStrikerId = nonStrikerId;

    const existing = innings.batsmen?.find(
      (b) => (nonStrikerId && b.playerId && String(b.playerId) === String(nonStrikerId)) ||
             b.name.toLowerCase() === nonStriker.trim().toLowerCase()
    );
    if (!existing) {
      innings.batsmen.push({
        name: nonStriker.trim(),
        playerId: nonStrikerId || null,
        battingOrder: (innings.batsmen?.length || 0) + 1,
        dismissal: 'not out',
      });
    } else if (nonStrikerId && !existing.playerId) {
      existing.playerId = nonStrikerId;
    }

    await innings.save();

    res.status(200).json({
      success: true,
      message: `Non-striker set to ${nonStriker.trim()}`,
      striker: innings.striker,
      nonStriker: innings.nonStriker,
      innings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record a delivery
 * @route   POST /api/scoring/:matchId/delivery
 * @access  Private (Creator / Admin)
 */
export const recordDelivery = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;
    const {
      runs = 0,
      type = 'normal',
      extraRuns = 0,
      wicket = null,
      commentary = '',
    } = req.body;

    const match = await Match.findById(matchId)
      .populate('team1PlayingXI', 'displayName')
      .populate('team2PlayingXI', 'displayName');

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to score this match' });
    }

    const currentInningsNumber = match.currentInningsNumber || 1;
    const innings = await Innings.findOne({ match: matchId, inningsNumber: currentInningsNumber });

    if (!innings) {
      return res.status(400).json({ success: false, message: 'Active innings not found. Start an innings first.' });
    }

    if (innings.status === 'completed') {
      return res.status(400).json({ success: false, message: 'This innings has already been completed.' });
    }

    if (!innings.striker || !innings.nonStriker || !innings.currentBowler) {
      return res.status(400).json({ success: false, message: 'Striker, non-striker, or bowler not set on the pitch.' });
    }

    // Safety check: Prevent scoring if striker and non-striker are the same player
    const isCorruptPair =
      (innings.strikerId && innings.nonStrikerId && String(innings.strikerId) === String(innings.nonStrikerId)) ||
      (innings.striker && innings.nonStriker && innings.striker.trim().toLowerCase() === innings.nonStriker.trim().toLowerCase());
    if (isCorruptPair) {
      return res.status(400).json({
        success: false,
        message: 'Invalid batting state. Striker and non-striker cannot be the same player.',
      });
    }

    // Determine current over and ball counts
    const legalBallsSoFar = innings.legalBalls || 0;
    const currentOver = Math.floor(legalBallsSoFar / 6);
    const ballInOver = (legalBallsSoFar % 6) + 1;

    let isLegal = true;
    let totalDeliveryRuns = 0;

    if (type === 'wide') {
      isLegal = false;
      totalDeliveryRuns = (extraRuns > 0 ? extraRuns : 1) + Number(runs);
    } else if (type === 'no_ball') {
      isLegal = false;
      totalDeliveryRuns = (extraRuns > 0 ? extraRuns : 1) + Number(runs);
    } else {
      isLegal = true;
      totalDeliveryRuns = Number(runs);
    }

    const isWicket = type === 'wicket' || Boolean(wicket && wicket.isWicket);
    const dismissedPlayer = wicket?.dismissedPlayer ? wicket.dismissedPlayer.trim() : (isWicket ? innings.striker : '');
    const dismissedPlayerId = wicket?.dismissedPlayerId || (isWicket && !wicket?.dismissedPlayer ? innings.strikerId : null);
    const newBatsman = wicket?.newBatsman ? wicket.newBatsman.trim() : '';
    const newBatsmanId = wicket?.newBatsmanId || null;

    if (isWicket && (newBatsman || newBatsmanId)) {
      // Find who survived at the crease
      const isStrikerOut = dismissedPlayerId
        ? (innings.strikerId && String(innings.strikerId) === String(dismissedPlayerId))
        : (dismissedPlayer.toLowerCase() === innings.striker.toLowerCase());

      const survivingBatterName = isStrikerOut ? innings.nonStriker : innings.striker;
      const survivingBatterId = isStrikerOut ? innings.nonStrikerId : innings.strikerId;

      if (newBatsmanId && survivingBatterId && String(newBatsmanId) === String(survivingBatterId)) {
        return res.status(400).json({
          success: false,
          message: 'New batsman cannot be the same as the surviving batter at the crease (identical Player ID)',
        });
      }
      if (newBatsman && survivingBatterName && newBatsman.toLowerCase() === survivingBatterName.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'New batsman cannot be the same as the surviving batter at the crease',
        });
      }

      const newBatterCheck = validateBatterEligibility(
        match,
        innings,
        { name: newBatsman, id: newBatsmanId },
        { name: survivingBatterName, id: survivingBatterId }
      );
      if (!newBatterCheck.valid) {
        return res.status(400).json({ success: false, message: newBatterCheck.message });
      }

      // Ensure new batsman is added to innings.batsmen
      const existingNewBman = innings.batsmen?.find(
        (b) => (newBatsmanId && b.playerId && String(b.playerId) === String(newBatsmanId)) ||
               b.name.toLowerCase() === newBatsman.toLowerCase()
      );
      if (!existingNewBman) {
        innings.batsmen.push({
          name: newBatsman,
          playerId: newBatsmanId || null,
          battingOrder: (innings.batsmen?.length || 0) + 1,
          dismissal: 'not out',
        });
      }
    }

    const newDelivery = {
      over: currentOver,
      ballInOver,
      type,
      runsScored: Number(runs),
      extraRuns: Number(extraRuns),
      totalDeliveryRuns,
      isLegal,
      striker: innings.striker,
      strikerId: innings.strikerId || null,
      nonStriker: innings.nonStriker,
      nonStrikerId: innings.nonStrikerId || null,
      bowler: innings.currentBowler,
      bowlerId: innings.currentBowlerId || null,
      isWicket,
      wicketType: wicket?.type || (type === 'wicket' ? 'bowled' : ''),
      dismissedPlayer,
      dismissedPlayerId,
      fielder: wicket?.fielder ? wicket.fielder.trim() : '',
      fielderId: wicket?.fielderId || null,
      newBatsman,
      newBatsmanId,
      commentary: commentary.trim(),
      timestamp: new Date(),
    };

    // If wicket is caught, run out, or stumped, update fielder stats if fielderId exists
    if (isWicket && wicket?.fielderId) {
      try {
        if (wicket.type === 'caught') {
          await Player.findByIdAndUpdate(wicket.fielderId, { $inc: { 'careerStats.fielding.catches': 1 } });
        } else if (wicket.type === 'run_out') {
          await Player.findByIdAndUpdate(wicket.fielderId, { $inc: { 'careerStats.fielding.runOuts': 1 } });
        } else if (wicket.type === 'stumped') {
          await Player.findByIdAndUpdate(wicket.fielderId, { $inc: { 'careerStats.fielding.stumpings': 1 } });
        }
      } catch (fldErr) {
        console.warn('Could not update fielder career stats:', fldErr.message);
      }
    }

    innings.deliveries.push(newDelivery);

    const calcResult = recalculateInnings(innings, match.overs);
    await innings.save();

    match.liveScore = {
      team: innings.battingTeam,
      runs: innings.totalRuns,
      wickets: innings.wickets,
      overs: innings.overs,
      target: innings.target,
    };

    // Automated Match Completion Detection for 2nd Innings
    if (innings.inningsNumber === 2) {
      if (calcResult.isTargetAchieved) {
        const wicketsRemaining = 10 - innings.wickets;
        match.winner = innings.battingTeam;
        match.result = `${innings.battingTeam} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
        match.status = 'completed';
      } else if (calcResult.isAllOut || calcResult.isOversCompleted) {
        if (innings.totalRuns === (innings.target - 1)) {
          match.winner = 'Tie';
          match.result = 'Match tied';
        } else {
          const runDiff = (innings.target - 1) - innings.totalRuns;
          match.winner = innings.bowlingTeam;
          match.result = `${innings.bowlingTeam} won by ${runDiff} run${runDiff === 1 ? '' : 's'}`;
        }
        match.status = 'completed';
      }
    }

    await match.save();

    const currentLegalBalls = innings.legalBalls || 0;
    const currentOverIdx = Math.floor(currentLegalBalls / 6);
    const currentOverDeliveries = innings.deliveries.filter((d) => d.over === currentOverIdx);
    const inningsList = await Innings.find({ match: matchId }).sort({ inningsNumber: 1 });

    res.status(200).json({
      success: true,
      message: 'Delivery recorded',
      currentInnings: innings,
      match,
      inningsList,
      currentOverDeliveries,
      isOverCompleted: isLegal && currentLegalBalls > 0 && currentLegalBalls % 6 === 0,
      isCompleted: innings.status === 'completed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Undo the last recorded delivery
 * @route   POST /api/scoring/:matchId/undo
 * @access  Private (Creator / Admin)
 */
export const undoDelivery = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to score this match' });
    }

    const currentInningsNumber = match.currentInningsNumber || 1;
    const innings = await Innings.findOne({ match: matchId, inningsNumber: currentInningsNumber });

    if (!innings || !innings.deliveries || innings.deliveries.length === 0) {
      return res.status(400).json({ success: false, message: 'No deliveries available to undo' });
    }

    const removedDelivery = innings.deliveries.pop();

    // Revert fielder stats if applicable
    if (removedDelivery.isWicket && removedDelivery.fielderId) {
      try {
        if (removedDelivery.wicketType === 'caught') {
          await Player.findByIdAndUpdate(removedDelivery.fielderId, { $inc: { 'careerStats.fielding.catches': -1 } });
        } else if (removedDelivery.wicketType === 'run_out') {
          await Player.findByIdAndUpdate(removedDelivery.fielderId, { $inc: { 'careerStats.fielding.runOuts': -1 } });
        } else if (removedDelivery.wicketType === 'stumped') {
          await Player.findByIdAndUpdate(removedDelivery.fielderId, { $inc: { 'careerStats.fielding.stumpings': -1 } });
        }
      } catch (revertErr) {
        console.warn('Could not revert fielder stats:', revertErr.message);
      }
    }

    innings.status = 'in_progress';
    recalculateInnings(innings, match.overs);
    await innings.save();

    if (match.status === 'completed') {
      match.status = 'live';
      match.winner = '';
      match.result = '';
    }

    match.liveScore = {
      team: innings.battingTeam,
      runs: innings.totalRuns,
      wickets: innings.wickets,
      overs: innings.overs,
      target: innings.target,
    };
    await match.save();

    const currentLegalBalls = innings.legalBalls || 0;
    const currentOverIdx = Math.floor(currentLegalBalls / 6);
    const currentOverDeliveries = innings.deliveries.filter((d) => d.over === currentOverIdx);
    const inningsList = await Innings.find({ match: matchId }).sort({ inningsNumber: 1 });

    res.status(200).json({
      success: true,
      message: 'Delivery undone',
      currentInnings: innings,
      match,
      inningsList,
      currentOverDeliveries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Swap striker and non-striker
 * @route   POST /api/scoring/:matchId/change-striker
 * @access  Private (Creator / Admin)
 */
export const changeStriker = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;

    const match = await Match.findById(matchId);
    if (!match || !isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const innings = await Innings.findOne({ match: matchId, inningsNumber: match.currentInningsNumber || 1 });
    if (!innings) {
      return res.status(404).json({ success: false, message: 'Innings not found' });
    }

    const tempName = innings.striker;
    const tempId = innings.strikerId;
    innings.striker = innings.nonStriker;
    innings.strikerId = innings.nonStrikerId;
    innings.nonStriker = tempName;
    innings.nonStrikerId = tempId;

    await innings.save();

    res.status(200).json({
      success: true,
      message: 'Strike swapped',
      striker: innings.striker,
      strikerId: innings.strikerId,
      nonStriker: innings.nonStriker,
      nonStrikerId: innings.nonStrikerId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete an over and select new bowler
 * @route   POST /api/scoring/:matchId/end-over
 * @access  Private (Creator / Admin)
 */
export const endOver = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;
    const { newBowler } = req.body;

    const match = await Match.findById(matchId)
      .populate('team1PlayingXI', 'displayName profileImage')
      .populate('team2PlayingXI', 'displayName profileImage');

    if (!match || !isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const innings = await Innings.findOne({ match: matchId, inningsNumber: match.currentInningsNumber || 1 });
    if (!innings) {
      return res.status(404).json({ success: false, message: 'Innings not found' });
    }

    if (!newBowler || !newBowler.trim()) {
      return res.status(400).json({ success: false, message: 'New bowler name is required' });
    }

    // Check consecutive bowler restriction (previous bowler who just bowled the over)
    const check = validateBowlerEligibility(match, innings, newBowler, innings.currentBowler);
    if (!check.valid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    innings.previousBowler = innings.currentBowler;
    innings.currentBowler = newBowler.trim();

    const existingBowler = innings.bowlers.find((b) => b.name.toLowerCase() === newBowler.trim().toLowerCase());
    if (!existingBowler) {
      innings.bowlers.push({ name: newBowler.trim() });
    }

    await innings.save();

    res.status(200).json({
      success: true,
      message: `Over completed. ${newBowler.trim()} is now bowling.`,
      currentBowler: innings.currentBowler,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    End current innings and set target for next
 * @route   POST /api/scoring/:matchId/end-innings
 * @access  Private (Creator / Admin)
 */
export const endInnings = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;
    const { inningsNumber } = req.body || {};

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let innings = null;
    // 1. Explicitly requested inningsNumber
    if (inningsNumber) {
      innings = await Innings.findOne({ match: matchId, inningsNumber: Number(inningsNumber) });
    }

    // 2. Try match.currentInningsNumber
    if (!innings && match.currentInningsNumber) {
      innings = await Innings.findOne({ match: matchId, inningsNumber: match.currentInningsNumber });
    }

    // 3. Try to find any in_progress innings
    if (!innings) {
      innings = await Innings.findOne({ match: matchId, status: 'in_progress' });
    }

    // 4. Fallback to latest innings
    if (!innings) {
      innings = await Innings.findOne({ match: matchId }).sort({ inningsNumber: -1 });
    }

    if (!innings) {
      return res.status(404).json({ success: false, message: 'Active innings not found' });
    }

    innings.status = 'completed';
    await innings.save();

    if (innings.inningsNumber === 1) {
      match.currentInningsNumber = 2;
      await match.save();
    }

    const inningsList = await Innings.find({ match: matchId }).sort({ inningsNumber: 1 });

    res.status(200).json({
      success: true,
      message: `Innings ${innings.inningsNumber} completed`,
      match,
      currentInnings: innings,
      inningsList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete match with winner declaration and result
 * @route   POST /api/scoring/:matchId/complete-match
 * @access  Private (Creator / Admin)
 */
export const completeMatch = async (req, res, next) => {
  try {
    const matchId = req.params.matchId || req.params.id;
    const { winner, result } = req.body;

    const match = await Match.findById(matchId);
    if (!match || !isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    match.status = 'completed';
    match.winner = winner || '';
    match.result = result || '';
    await match.save();

    try {
      const creatorPlayer = await Player.findOne({ userId: req.user._id });
      await notifyMatchCompleted({
        match,
        creatorPlayer,
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch match_completed notification:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Match completed successfully',
      match,
    });
  } catch (error) {
    next(error);
  }
};
