import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Match from '../models/Match.js';
import Innings from '../models/Innings.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import { recalculateInnings, formatOvers } from '../services/scoringService.js';
import { validateBatterEligibility } from '../controllers/scoringController.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';

async function runTests() {
  console.log('--- STARTING CRITICAL BUG FIX TESTS: STRIKER & NON-STRIKER SCORING ---');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failedTests++;
    }
  }

  try {
    // Clean up test matches
    await Match.deleteMany({ tournament: 'TEST_SCORING_FIX_TOURNAMENT' });
    await Innings.deleteMany({ battingTeam: 'TEST_TEAM_A' });

    // 1. Create test players with unique ObjectIds
    const p1Id = new mongoose.Types.ObjectId();
    const p2Id = new mongoose.Types.ObjectId();
    const p3Id = new mongoose.Types.ObjectId();
    const bowler1Id = new mongoose.Types.ObjectId();
    const bowler2Id = new mongoose.Types.ObjectId();

    const p1Name = 'Surya Kumar';
    const p2Name = 'Manoj Player';
    const p3Name = 'Rohit Third';
    const bowler1Name = 'Bumrah Bowler';
    const bowler2Name = 'Shami Bowler';

    const testMatch = new Match({
      team1: 'TEST_TEAM_A',
      team2: 'TEST_TEAM_B',
      format: 'T20',
      overs: 20,
      venue: 'Wankhede Stadium',
      city: 'Mumbai',
      date: new Date(),
      tournament: 'TEST_SCORING_FIX_TOURNAMENT',
      status: 'live',
      team1PlayingXI: [p1Id, p2Id, p3Id],
      team2PlayingXI: [bowler1Id, bowler2Id],
      createdBy: new mongoose.Types.ObjectId(),
    });
    await testMatch.save();

    // ==========================================
    // TEST 1: BACKEND VALIDATION - strikerId === nonStrikerId
    // ==========================================
    console.log('\n--- TEST 1: Backend Rejection of Duplicate Batter ID ---');
    const mockInnings = {
      battingTeam: 'TEST_TEAM_A',
      batsmen: [],
    };
    const duplicateIdCheck = validateBatterEligibility(
      testMatch,
      mockInnings,
      { name: p1Name, id: p1Id.toString() },
      { name: 'Duplicate Name', id: p1Id.toString() }
    );
    assert(!duplicateIdCheck.valid, 'Backend strictly rejects identical player IDs for striker and non-striker');

    const duplicateNameCheck = validateBatterEligibility(
      testMatch,
      mockInnings,
      { name: 'Surya', id: p1Id.toString() },
      { name: 'surya', id: p2Id.toString() }
    );
    assert(!duplicateNameCheck.valid, 'Backend strictly rejects case-insensitive matching player names');

    const distinctCheck = validateBatterEligibility(
      testMatch,
      mockInnings,
      { name: p1Name, id: p1Id.toString() },
      { name: p2Name, id: p2Id.toString() }
    );
    assert(distinctCheck.valid, 'Backend approves distinct players from Playing XI');

    // ==========================================
    // TEST 2: PLAYER OUTSIDE PLAYING XI REJECTION
    // ==========================================
    console.log('\n--- TEST 2: Rejection of Player Outside Playing XI ---');
    const outsidePlayerId = new mongoose.Types.ObjectId();
    const outsideCheck = validateBatterEligibility(
      testMatch,
      mockInnings,
      { name: 'Outsider', id: outsidePlayerId.toString() },
      { name: p2Name, id: p2Id.toString() }
    );
    assert(!outsideCheck.valid, 'Backend rejects player who is not in batting Playing XI');

    // ==========================================
    // TEST 3: INITIAL INNINGS CREATION
    // ==========================================
    console.log('\n--- TEST 3: Innings Initialization ---');
    let innings = new Innings({
      match: testMatch._id,
      inningsNumber: 1,
      battingTeam: 'TEST_TEAM_A',
      bowlingTeam: 'TEST_TEAM_B',
      striker: p1Name,
      strikerId: p1Id,
      nonStriker: p2Name,
      nonStrikerId: p2Id,
      openingStriker: p1Name,
      openingStrikerId: p1Id,
      openingNonStriker: p2Name,
      openingNonStrikerId: p2Id,
      currentBowler: bowler1Name,
      currentBowlerId: bowler1Id,
      batsmen: [
        { name: p1Name, playerId: p1Id, battingOrder: 1, dismissal: 'not out' },
        { name: p2Name, playerId: p2Id, battingOrder: 2, dismissal: 'not out' },
      ],
      bowlers: [{ name: bowler1Name, playerId: bowler1Id }],
    });
    recalculateInnings(innings, testMatch.overs);
    await innings.save();

    assert(innings.striker === p1Name && innings.nonStriker === p2Name, 'Opening pair initialized properly');
    assert(String(innings.strikerId) !== String(innings.nonStrikerId), 'Striker and Non-striker have distinct Player IDs');

    // ==========================================
    // TEST 4: CLICK 4 — BOUNDARY SCORING
    // Initial: Surya 0 (0), Manoj 0 (0)
    // Ball 1: 4 runs off bat
    // Expected: Surya 4 (1), Manoj 0 (0), Team 4/0, Over 0.1, Strike DOES NOT swap
    // ==========================================
    console.log('\n--- TEST 4: Four Boundary Scoring & Non-Striker Isolation ---');
    innings.deliveries.push({
      over: 0,
      ballInOver: 1,
      type: 'normal',
      runsScored: 4,
      extraRuns: 0,
      totalDeliveryRuns: 4,
      isLegal: true,
      striker: innings.striker,
      strikerId: innings.strikerId,
      nonStriker: innings.nonStriker,
      nonStrikerId: innings.nonStrikerId,
      bowler: innings.currentBowler,
      bowlerId: innings.currentBowlerId,
      isWicket: false,
    });
    recalculateInnings(innings, testMatch.overs);
    await innings.save();

    let surya = innings.batsmen.find((b) => String(b.playerId) === String(p1Id));
    let manoj = innings.batsmen.find((b) => String(b.playerId) === String(p2Id));

    assert(surya.runs === 4 && surya.balls === 1 && surya.fours === 1, 'Surya receives 4 runs and faces 1 ball');
    assert(manoj.runs === 0 && manoj.balls === 0, 'Manoj runs and balls faced are completely unchanged (0 runs, 0 balls)');
    assert(innings.striker === p1Name, 'Even runs (4): Strike DOES NOT swap, Surya remains on strike');

    // ==========================================
    // TEST 5: CLICK 1 — SINGLE & STRIKE ROTATION
    // Ball 2: 1 run off bat
    // Expected: Surya 5 (2), Manoj 0 (0), Team 5/0, Over 0.2, Strike SWAPS to Manoj!
    // ==========================================
    console.log('\n--- TEST 5: Single Run & Strike Rotation ---');
    innings.deliveries.push({
      over: 0,
      ballInOver: 2,
      type: 'normal',
      runsScored: 1,
      extraRuns: 0,
      totalDeliveryRuns: 1,
      isLegal: true,
      striker: innings.striker,
      strikerId: innings.strikerId,
      nonStriker: innings.nonStriker,
      nonStrikerId: innings.nonStrikerId,
      bowler: innings.currentBowler,
      bowlerId: innings.currentBowlerId,
      isWicket: false,
    });
    recalculateInnings(innings, testMatch.overs);
    await innings.save();

    surya = innings.batsmen.find((b) => String(b.playerId) === String(p1Id));
    manoj = innings.batsmen.find((b) => String(b.playerId) === String(p2Id));

    assert(surya.runs === 5 && surya.balls === 2, 'Surya updated to 5 runs off 2 balls');
    assert(manoj.runs === 0 && manoj.balls === 0, 'Manoj remained untouched on 0 runs off 0 balls');
    assert(innings.striker === p2Name && String(innings.strikerId) === String(p2Id), 'Odd runs (1): Manoj is now STRIKER');
    assert(innings.nonStriker === p1Name && String(innings.nonStrikerId) === String(p1Id), 'Odd runs (1): Surya is now NON-STRIKER');

    // ==========================================
    // TEST 6: CLICK 2 — TWO RUNS FOR MANOJ
    // Ball 3: Manoj on strike, runs = 2
    // Expected: Manoj 2 (1), Surya 5 (2), Team 7/0, Over 0.3, Strike DOES NOT swap
    // ==========================================
    console.log('\n--- TEST 6: Two Runs on New Striker ---');
    innings.deliveries.push({
      over: 0,
      ballInOver: 3,
      type: 'normal',
      runsScored: 2,
      extraRuns: 0,
      totalDeliveryRuns: 2,
      isLegal: true,
      striker: innings.striker,
      strikerId: innings.strikerId,
      nonStriker: innings.nonStriker,
      nonStrikerId: innings.nonStrikerId,
      bowler: innings.currentBowler,
      bowlerId: innings.currentBowlerId,
      isWicket: false,
    });
    recalculateInnings(innings, testMatch.overs);
    await innings.save();

    surya = innings.batsmen.find((b) => String(b.playerId) === String(p1Id));
    manoj = innings.batsmen.find((b) => String(b.playerId) === String(p2Id));

    assert(manoj.runs === 2 && manoj.balls === 1, 'Manoj receives +2 runs and faces 1 ball (2 off 1)');
    assert(surya.runs === 5 && surya.balls === 2, 'Surya untouched on non-striker end (5 off 2)');
    assert(innings.striker === p2Name, 'Even runs (2): Manoj remains STRIKER');

    // ==========================================
    // TEST 7: CLICK 0 — DOT BALL
    // Ball 4: Manoj on strike, runs = 0
    // Expected: Manoj 2 (2), Surya 5 (2), Team 7/0, Over 0.4
    // ==========================================
    console.log('\n--- TEST 7: Dot Ball (0 runs) ---');
    innings.deliveries.push({
      over: 0,
      ballInOver: 4,
      type: 'normal',
      runsScored: 0,
      extraRuns: 0,
      totalDeliveryRuns: 0,
      isLegal: true,
      striker: innings.striker,
      strikerId: innings.strikerId,
      nonStriker: innings.nonStriker,
      nonStrikerId: innings.nonStrikerId,
      bowler: innings.currentBowler,
      bowlerId: innings.currentBowlerId,
      isWicket: false,
    });
    recalculateInnings(innings, testMatch.overs);
    await innings.save();

    manoj = innings.batsmen.find((b) => String(b.playerId) === String(p2Id));
    surya = innings.batsmen.find((b) => String(b.playerId) === String(p1Id));

    assert(manoj.runs === 2 && manoj.balls === 2, 'Manoj balls faced increases by 1, runs unchanged (2 off 2)');
    assert(surya.runs === 5 && surya.balls === 2, 'Surya untouched (5 off 2)');
    assert(innings.striker === p2Name, 'Manoj remains striker');

    // ==========================================
    // TEST 8: WIDE (+1)
    // Manoj on strike. Wide is bowled.
    // Expected: Batter balls faced NOT incremented, 0 batter runs, team +1, legal balls unchanged (4)
    // ==========================================
    console.log('\n--- TEST 8: Wide Ball ---');
    innings.deliveries.push({
      over: 0,
      ballInOver: 4,
      type: 'wide',
      runsScored: 0,
      extraRuns: 1,
      totalDeliveryRuns: 1,
      isLegal: false,
      striker: innings.striker,
      strikerId: innings.strikerId,
      nonStriker: innings.nonStriker,
      nonStrikerId: innings.nonStrikerId,
      bowler: innings.currentBowler,
      bowlerId: innings.currentBowlerId,
      isWicket: false,
    });
    recalculateInnings(innings, testMatch.overs);
    await innings.save();

    manoj = innings.batsmen.find((b) => String(b.playerId) === String(p2Id));
    surya = innings.batsmen.find((b) => String(b.playerId) === String(p1Id));

    assert(manoj.runs === 2 && manoj.balls === 2, 'Manoj runs and balls unchanged after wide (2 off 2)');
    assert(surya.runs === 5 && surya.balls === 2, 'Surya runs and balls unchanged (5 off 2)');
    assert(innings.totalRuns === 8, 'Team runs incremented by 1 extra (8 total runs)');
    assert(innings.legalBalls === 4 && innings.overs === '0.4', 'Legal balls unchanged after wide (0.4 overs)');
    assert(innings.extras.wides === 1, 'Extras wide recorded as 1');

    // ==========================================
    // TEST 9: BYE (1b)
    // Ball 5: Bye 1 run
    // Expected: Batter runs 0, batter balls +1, team runs +1, legal balls 5, odd runs swap strike!
    // ==========================================
    console.log('\n--- TEST 9: Bye Delivery ---');
    innings.deliveries.push({
      over: 0,
      ballInOver: 5,
      type: 'bye',
      runsScored: 1,
      extraRuns: 0,
      totalDeliveryRuns: 1,
      isLegal: true,
      striker: innings.striker,
      strikerId: innings.strikerId,
      nonStriker: innings.nonStriker,
      nonStrikerId: innings.nonStrikerId,
      bowler: innings.currentBowler,
      bowlerId: innings.currentBowlerId,
      isWicket: false,
    });
    recalculateInnings(innings, testMatch.overs);
    await innings.save();

    manoj = innings.batsmen.find((b) => String(b.playerId) === String(p2Id));
    surya = innings.batsmen.find((b) => String(b.playerId) === String(p1Id));

    assert(manoj.runs === 2 && manoj.balls === 3, 'Manoj balls faced increases to 3, runs remain 2');
    assert(innings.extras.byes === 1, 'Extras byes incremented by 1');
    assert(innings.totalRuns === 9, 'Team runs incremented to 9');
    assert(innings.striker === p1Name && String(innings.strikerId) === String(p1Id), 'Odd bye (1): Strike rotates to Surya');

    // ==========================================
    // TEST 10: 6TH LEGAL BALL & END OF OVER ROTATION
    // Ball 6: Surya on strike. Hits 0 (dot).
    // Because it is the 6th legal ball of over, batsmen change ends!
    // ==========================================
    console.log('\n--- TEST 10: Over Completion (6th Ball) Strike Rotation ---');
    innings.deliveries.push({
      over: 0,
      ballInOver: 6,
      type: 'normal',
      runsScored: 0,
      extraRuns: 0,
      totalDeliveryRuns: 0,
      isLegal: true,
      striker: innings.striker,
      strikerId: innings.strikerId,
      nonStriker: innings.nonStriker,
      nonStrikerId: innings.nonStrikerId,
      bowler: innings.currentBowler,
      bowlerId: innings.currentBowlerId,
      isWicket: false,
    });
    recalculateInnings(innings, testMatch.overs);
    await innings.save();

    assert(innings.legalBalls === 6 && innings.overs === '1.0', '1.0 overs completed');
    // On the 0 dot ball, strike would stay on Surya, but END OF OVER changes ends!
    assert(innings.striker === p2Name && String(innings.strikerId) === String(p2Id), 'End of over: Manoj is STRIKER for next over');
    assert(innings.nonStriker === p1Name && String(innings.nonStrikerId) === String(p1Id), 'End of over: Surya is NON-STRIKER for next over');
    assert(String(innings.strikerId) !== String(innings.nonStrikerId), 'Striker and Non-Striker remain strictly distinct');

    // ==========================================
    // TEST 11: WICKET & NEW BATSMAN INTEGRATION
    // Over 1, Ball 1: Manoj is bowled! New batsman Rohit Third (p3Id) comes in.
    // Expected: Manoj out (2 off 3), Surya remains not out (5 off 3).
    // Active pair: Rohit (striker) & Surya (non-striker).
    // ==========================================
    console.log('\n--- TEST 11: Wicket & New Batsman Arrival ---');
    innings.deliveries.push({
      over: 1,
      ballInOver: 1,
      type: 'wicket',
      runsScored: 0,
      extraRuns: 0,
      totalDeliveryRuns: 0,
      isLegal: true,
      striker: innings.striker,
      strikerId: innings.strikerId,
      nonStriker: innings.nonStriker,
      nonStrikerId: innings.nonStrikerId,
      bowler: bowler2Name,
      bowlerId: bowler2Id,
      isWicket: true,
      wicketType: 'bowled',
      dismissedPlayer: p2Name,
      dismissedPlayerId: p2Id,
      newBatsman: p3Name,
      newBatsmanId: p3Id,
    });
    recalculateInnings(innings, testMatch.overs);
    await innings.save();

    manoj = innings.batsmen.find((b) => String(b.playerId) === String(p2Id));
    surya = innings.batsmen.find((b) => String(b.playerId) === String(p1Id));
    const rohit = innings.batsmen.find((b) => String(b.playerId) === String(p3Id));

    assert(manoj.isOut === true, 'Manoj marked as OUT');
    assert(manoj.runs === 2 && manoj.balls === 4, 'Manoj final score: 2 runs off 4 balls');
    assert(surya.isOut === false && surya.runs === 5 && surya.balls === 3, 'Surya remains NOT OUT with 5 off 3 balls');
    assert(rohit !== undefined && rohit.runs === 0 && rohit.balls === 0, 'Rohit Third added to batsmen card with 0 (0)');
    assert(innings.striker === p3Name && String(innings.strikerId) === String(p3Id), 'Rohit is new active STRIKER');
    assert(innings.nonStriker === p1Name && String(innings.nonStrikerId) === String(p1Id), 'Surya is active NON-STRIKER');
    assert(String(innings.strikerId) !== String(innings.nonStrikerId), 'Striker and Non-Striker have distinct IDs');

    // Clean up test data
    await Match.findByIdAndDelete(testMatch._id);
    await Innings.deleteMany({ match: testMatch._id });

    console.log('\n==================================================');
    console.log(`ALL TESTS COMPLETED: ${passedTests} passed, ${failedTests} failed`);
    console.log('==================================================\n');

    process.exit(failedTests > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
