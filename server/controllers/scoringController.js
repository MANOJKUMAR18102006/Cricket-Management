import Match from '../models/Match.js';
import Innings from '../models/Innings.js';
import { recalculateInnings, formatOvers } from '../services/scoringService.js';

/**
 * Check if the user is authorized to score the match (Creator or Admin)
 */
const isAuthorizedScorer = (match, user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return match.createdBy.toString() === user._id.toString();
};

/**
 * @desc    Get current scoring state for a match
 * @route   GET /api/scoring/:matchId
 * @access  Public
 */
export const getMatchScoringState = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId).populate('createdBy', 'username role');
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const inningsList = await Innings.find({ match: matchId }).sort({ inningsNumber: 1 });
    const currentInningsNumber = match.currentInningsNumber || 1;
    const currentInnings = inningsList.find((i) => i.inningsNumber === currentInningsNumber) || inningsList[0] || null;

    // Get current over deliveries for recent balls pill tracker
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
 * @desc    Start an innings (1st or 2nd)
 * @route   POST /api/scoring/:matchId/start-innings
 * @access  Private (Creator / Admin)
 */
export const startInnings = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { inningsNumber = 1, battingTeam, bowlingTeam, striker, nonStriker, bowler } = req.body;

    const match = await Match.findById(matchId);
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
      return res.status(400).json({ success: false, message: 'Striker, non-striker, and bowler are required to start innings' });
    }

    if (striker.trim().toLowerCase() === nonStriker.trim().toLowerCase()) {
      return res.status(400).json({ success: false, message: 'Striker and non-striker cannot be the same batsman' });
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
        nonStriker: nonStriker.trim(),
        currentBowler: bowler.trim(),
        target,
        batsmen: [
          { name: striker.trim(), battingOrder: 1, dismissal: 'not out' },
          { name: nonStriker.trim(), battingOrder: 2, dismissal: 'not out' },
        ],
        bowlers: [
          { name: bowler.trim() },
        ],
      });
    } else {
      innings.battingTeam = battingTeam.trim();
      innings.bowlingTeam = bowlingTeam.trim();
      innings.striker = striker.trim();
      innings.nonStriker = nonStriker.trim();
      innings.currentBowler = bowler.trim();
      innings.target = target;
      innings.status = 'in_progress';
    }

    recalculateInnings(innings, match.overs);
    await innings.save();

    // Update match state
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
 * @desc    Record a delivery
 * @route   POST /api/scoring/:matchId/delivery
 * @access  Private (Creator / Admin)
 */
export const recordDelivery = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const {
      runs = 0,
      type = 'normal',
      extraRuns = 0,
      wicket = null,
      commentary = '',
    } = req.body;

    const match = await Match.findById(matchId);
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

    const newDelivery = {
      over: currentOver,
      ballInOver,
      type,
      runsScored: Number(runs),
      extraRuns: Number(extraRuns),
      totalDeliveryRuns,
      isLegal,
      striker: innings.striker,
      nonStriker: innings.nonStriker,
      bowler: innings.currentBowler,
      isWicket: type === 'wicket' || (wicket && wicket.isWicket),
      wicketType: wicket?.type || (type === 'wicket' ? 'bowled' : ''),
      dismissedPlayer: wicket?.dismissedPlayer || (type === 'wicket' ? innings.striker : ''),
      newBatsman: wicket?.newBatsman ? wicket.newBatsman.trim() : '',
      commentary: commentary.trim(),
      timestamp: new Date(),
    };

    innings.deliveries.push(newDelivery);

    const calcResult = recalculateInnings(innings, match.overs);
    await innings.save();

    // Update match live scoreboard
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
      } else if (calcResult.isCompleted) {
        // Target not achieved and 2nd innings ended
        const firstInnings = await Innings.findOne({ match: matchId, inningsNumber: 1 });
        if (firstInnings) {
          if (innings.totalRuns === firstInnings.totalRuns) {
            match.winner = '';
            match.result = 'Match tied';
          } else {
            const margin = firstInnings.totalRuns - innings.totalRuns;
            match.winner = firstInnings.battingTeam;
            match.result = `${firstInnings.battingTeam} won by ${margin} run${margin === 1 ? '' : 's'}`;
          }
          match.status = 'completed';
        }
      }
    }

    await match.save();

    const inningsList = await Innings.find({ match: matchId }).sort({ inningsNumber: 1 });
    const currentLegalBalls = innings.legalBalls || 0;
    const overIndex = Math.floor(currentLegalBalls / 6);
    const currentOverDeliveries = innings.deliveries.filter((d) => d.over === overIndex);

    res.status(200).json({
      success: true,
      message: 'Delivery recorded',
      currentInnings: innings,
      match,
      inningsList,
      currentOverDeliveries,
      isOverCompleted: isLegal && currentLegalBalls % 6 === 0,
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
    const { matchId } = req.params;

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

    // Pop the latest delivery
    const removedDelivery = innings.deliveries.pop();

    // Reopen innings if it was marked complete
    innings.status = 'in_progress';

    // Recalculate full state
    recalculateInnings(innings, match.overs);
    await innings.save();

    // If match was marked completed, reopen match as live
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

    const inningsList = await Innings.find({ match: matchId }).sort({ inningsNumber: 1 });
    const currentLegalBalls = innings.legalBalls || 0;
    const overIndex = Math.floor(currentLegalBalls / 6);
    const currentOverDeliveries = innings.deliveries.filter((d) => d.over === overIndex);

    res.status(200).json({
      success: true,
      message: 'Delivery undone successfully',
      removedDelivery,
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
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match || !isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const innings = await Innings.findOne({ match: matchId, inningsNumber: match.currentInningsNumber || 1 });
    if (!innings) {
      return res.status(404).json({ success: false, message: 'Innings not found' });
    }

    const temp = innings.striker;
    innings.striker = innings.nonStriker;
    innings.nonStriker = temp;

    await innings.save();

    res.status(200).json({
      success: true,
      message: 'Strike swapped',
      striker: innings.striker,
      nonStriker: innings.nonStriker,
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
    const { matchId } = req.params;
    const { newBowler } = req.body;

    const match = await Match.findById(matchId);
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

    if (newBowler.trim().toLowerCase() === innings.currentBowler?.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'A bowler cannot bowl two consecutive overs' });
    }

    innings.currentBowler = newBowler.trim();

    // Ensure bowler exists in bowlers array
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
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match || !isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const currentInningsNumber = match.currentInningsNumber || 1;
    const innings = await Innings.findOne({ match: matchId, inningsNumber: currentInningsNumber });
    if (!innings) {
      return res.status(404).json({ success: false, message: 'Innings not found' });
    }

    innings.status = 'completed';
    await innings.save();

    let target = null;
    if (currentInningsNumber === 1) {
      target = innings.totalRuns + 1;
      match.currentInningsNumber = 2;
    }

    await match.save();

    res.status(200).json({
      success: true,
      message: `Innings ${currentInningsNumber} completed`,
      target,
      innings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Finalize match with winner and result text
 * @route   POST /api/scoring/:matchId/complete-match
 * @access  Private (Creator / Admin)
 */
export const completeMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { winner, result } = req.body;

    const match = await Match.findById(matchId);
    if (!match || !isAuthorizedScorer(match, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    match.status = 'completed';
    match.winner = winner || '';
    match.result = result || '';
    await match.save();

    res.status(200).json({
      success: true,
      message: 'Match completed successfully',
      match,
    });
  } catch (error) {
    next(error);
  }
};
