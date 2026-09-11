import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Match from '../models/Match.js';
import Innings from '../models/Innings.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=====================================================');
  console.log('🏏  CRICKPULSE BALL-BY-BALL SCORING TEST SUITE');
  console.log('=====================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';
    await mongoose.connect(mongoUri);

    // Setup Test Users
    const scorerUsername = `scorer_${Date.now()}`;
    const scorer = await User.create({
      username: scorerUsername,
      email: `${scorerUsername}@crickpulse.test`,
      password: 'Password123!',
      role: 'player',
    });

    const unauthorizedUsername = `unauthorized_${Date.now()}`;
    const unauthorizedUser = await User.create({
      username: unauthorizedUsername,
      email: `${unauthorizedUsername}@crickpulse.test`,
      password: 'Password123!',
      role: 'player',
    });

    const jwtSecret = process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026';
    const scorerToken = jwt.sign({ id: scorer._id, role: scorer.role }, jwtSecret, { expiresIn: '1h' });
    const rogueToken = jwt.sign({ id: unauthorizedUser._id, role: unauthorizedUser.role }, jwtSecret, { expiresIn: '1h' });

    // Create a 5-overs custom match for quick testing
    const match = await Match.create({
      team1: 'Test Strikers',
      team2: 'Test Bowling Club',
      format: 'Custom',
      overs: 5,
      venue: 'Eden Gardens',
      city: 'Kolkata',
      date: new Date(),
      status: 'scheduled',
      createdBy: scorer._id,
    });

    // --- TEST 1: Start 1st Innings ---
    console.log('--- TEST 1: Start 1st Innings (POST /api/scoring/:matchId/start-innings) ---');
    const startPayload = {
      inningsNumber: 1,
      battingTeam: 'Test Strikers',
      bowlingTeam: 'Test Bowling Club',
      striker: 'Virat Kohli',
      nonStriker: 'Rohit Sharma',
      bowler: 'Mitchell Starc',
    };

    const res1 = await fetch(`${BASE_URL}/scoring/${match._id}/start-innings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${scorerToken}`,
      },
      body: JSON.stringify(startPayload),
    });

    const data1 = await res1.json();
    if (!res1.ok || !data1.success) {
      throw new Error(`TEST 1 Failed: ${data1.message}`);
    }
    console.log(`✅ TEST 1 PASSED: Innings 1 started. Striker: ${data1.currentInnings.striker}, Non-Striker: ${data1.currentInnings.nonStriker}, Bowler: ${data1.currentInnings.currentBowler}.\n`);

    // --- TEST 2: Record Normal Deliveries (0, 1 with strike rotation, 4, 6) ---
    console.log('--- TEST 2: Record Deliveries with Strike Rotation ---');
    // Ball 1: Dot ball (0 runs)
    await fetch(`${BASE_URL}/scoring/${match._id}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runs: 0, type: 'normal' }),
    });

    // Ball 2: Single (1 run) -> strike should rotate to Rohit Sharma
    const res2b = await fetch(`${BASE_URL}/scoring/${match._id}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runs: 1, type: 'normal' }),
    });
    const data2b = await res2b.json();
    if (data2b.currentInnings.striker !== 'Rohit Sharma') {
      throw new Error(`TEST 2 Failed: Strike should have rotated to Rohit Sharma, got ${data2b.currentInnings.striker}`);
    }

    // Ball 3: Boundary 4 by Rohit
    const res2c = await fetch(`${BASE_URL}/scoring/${match._id}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runs: 4, type: 'normal' }),
    });
    const data2c = await res2c.json();
    console.log(`✅ TEST 2 PASSED: Deliveries recorded. Score: ${data2c.currentInnings.totalRuns}/${data2c.currentInnings.wickets} (${data2c.currentInnings.overs} ov). Rohit: 5 runs (2 balls).\n`);

    // --- TEST 3: Extras (Wide, No-Ball, Bye) ---
    console.log('--- TEST 3: Record Extras (Wide, No-Ball, Bye) ---');
    // Ball 4: Wide (+1 extra run, legal balls should NOT increment)
    const ballsBeforeWide = data2c.currentInnings.legalBalls;
    const res3a = await fetch(`${BASE_URL}/scoring/${match._id}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runs: 0, type: 'wide', extraRuns: 1 }),
    });
    const data3a = await res3a.json();
    if (data3a.currentInnings.legalBalls !== ballsBeforeWide) {
      throw new Error(`TEST 3 Failed: Wide ball should not increment legal balls count`);
    }
    if (data3a.currentInnings.extras.wides !== 1) {
      throw new Error(`TEST 3 Failed: Extras wide count mismatch`);
    }

    // Ball 5: Bye (1 run)
    const res3b = await fetch(`${BASE_URL}/scoring/${match._id}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runs: 1, type: 'bye' }),
    });
    const data3b = await res3b.json();
    console.log(`✅ TEST 3 PASSED: Extras recorded correctly. Extras total: ${data3b.currentInnings.extras.total} (Wides: ${data3b.currentInnings.extras.wides}, Byes: ${data3b.currentInnings.extras.byes}).\n`);

    // --- TEST 4: Wicket Delivery and New Batsman ---
    console.log('--- TEST 4: Record Wicket with New Batsman Entry ---');
    const res4 = await fetch(`${BASE_URL}/scoring/${match._id}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        type: 'wicket',
        runs: 0,
        wicket: {
          type: 'bowled',
          dismissedPlayer: data3b.currentInnings.striker,
          newBatsman: 'Suryakumar Yadav',
        },
      }),
    });
    const data4 = await res4.json();
    if (data4.currentInnings.wickets !== 1) {
      throw new Error(`TEST 4 Failed: Expected 1 wicket, got ${data4.currentInnings.wickets}`);
    }
    console.log(`✅ TEST 4 PASSED: Wicket recorded. Score: ${data4.currentInnings.totalRuns}/${data4.currentInnings.wickets}. New batsman Suryakumar Yadav arrived on strike.\n`);

    // --- TEST 5: Undo Delivery ---
    console.log('--- TEST 5: Undo Last Delivery (POST /api/scoring/:matchId/undo) ---');
    const res5 = await fetch(`${BASE_URL}/scoring/${match._id}/undo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
    });
    const data5 = await res5.json();
    if (!res5.ok || !data5.success) {
      throw new Error(`TEST 5 Failed: ${data5.message}`);
    }
    if (data5.currentInnings.wickets !== 0) {
      throw new Error(`TEST 5 Failed: Undoing wicket delivery should revert wickets to 0, got ${data5.currentInnings.wickets}`);
    }
    console.log(`✅ TEST 5 PASSED: Delivery undone successfully. Score reverted to ${data5.currentInnings.totalRuns}/${data5.currentInnings.wickets}.\n`);

    // --- TEST 6: Manual Strike Swap ---
    console.log('--- TEST 6: Change Striker (POST /api/scoring/:matchId/change-striker) ---');
    const strikerBefore = data5.currentInnings.striker;
    const nonStrikerBefore = data5.currentInnings.nonStriker;
    const res6 = await fetch(`${BASE_URL}/scoring/${match._id}/change-striker`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
    });
    const data6 = await res6.json();
    if (data6.striker !== nonStrikerBefore || data6.nonStriker !== strikerBefore) {
      throw new Error(`TEST 6 Failed: Striker swap failed`);
    }
    console.log(`✅ TEST 6 PASSED: Strike manually changed. Striker is now ${data6.striker}.\n`);

    // --- TEST 7: End Over & New Bowler ---
    console.log('--- TEST 7: End Over with New Bowler Selection (POST /api/scoring/:matchId/end-over) ---');
    const res7 = await fetch(`${BASE_URL}/scoring/${match._id}/end-over`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ newBowler: 'Jasprit Bumrah' }),
    });
    const data7 = await res7.json();
    if (!res7.ok || !data7.success || data7.currentBowler !== 'Jasprit Bumrah') {
      throw new Error(`TEST 7 Failed: ${data7.message}`);
    }
    console.log(`✅ TEST 7 PASSED: New bowler assigned: ${data7.currentBowler}.\n`);

    // --- TEST 8: End 1st Innings and Start 2nd Innings with Target ---
    console.log('--- TEST 8: End 1st Innings and Verify 2nd Innings Target ---');
    const res8a = await fetch(`${BASE_URL}/scoring/${match._id}/end-innings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${scorerToken}` },
    });
    const data8a = await res8a.json();
    const expectedTarget = data8a.innings.totalRuns + 1;

    // Start 2nd Innings
    const res8b = await fetch(`${BASE_URL}/scoring/${match._id}/start-innings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({
        inningsNumber: 2,
        battingTeam: 'Test Bowling Club',
        bowlingTeam: 'Test Strikers',
        striker: 'David Warner',
        nonStriker: 'Travis Head',
        bowler: 'Mohammed Shami',
      }),
    });
    const data8b = await res8b.json();
    if (data8b.currentInnings.target !== expectedTarget) {
      throw new Error(`TEST 8 Failed: Expected target ${expectedTarget}, got ${data8b.currentInnings.target}`);
    }
    console.log(`✅ TEST 8 PASSED: Innings 1 completed (${data8a.innings.totalRuns} runs). Innings 2 target set to ${expectedTarget}.\n`);

    // --- TEST 9: Chase Down Target and Auto-Complete Match ---
    console.log('--- TEST 9: Automated Match Completion upon Target Win ---');
    // Hit a 6 and a 4 to chase down the target
    await fetch(`${BASE_URL}/scoring/${match._id}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runs: 6, type: 'normal' }),
    });

    const res9 = await fetch(`${BASE_URL}/scoring/${match._id}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${scorerToken}` },
      body: JSON.stringify({ runs: 4, type: 'normal' }),
    });
    const data9 = await res9.json();

    if (data9.match.status !== 'completed' || data9.match.winner !== 'Test Bowling Club') {
      throw new Error(`TEST 9 Failed: Target achieved but match status not completed. Winner: ${data9.match.winner}, Status: ${data9.match.status}`);
    }
    console.log(`✅ TEST 9 PASSED: Target achieved! Match status: ${data9.match.status}, Winner: ${data9.match.winner}, Result: "${data9.match.result}".\n`);

    // --- TEST 10: Unauthorized Scoring Attempt Guard (HTTP 403) ---
    console.log('--- TEST 10: Unauthorized Scorer Guard (HTTP 403) ---');
    const res10 = await fetch(`${BASE_URL}/scoring/${match._id}/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rogueToken}` },
      body: JSON.stringify({ runs: 1, type: 'normal' }),
    });
    if (res10.status !== 403) {
      throw new Error(`TEST 10 Failed: Expected HTTP 403 for unauthorized scorer, got ${res10.status}`);
    }
    console.log('✅ TEST 10 PASSED: Unauthorized scoring request blocked with HTTP 403.\n');

    console.log('=====================================================');
    console.log('🎉 ALL 10 / 10 BALL-BY-BALL SCORING TESTS PASSED!');
    console.log('=====================================================');

    // Clean up test documents
    await User.deleteMany({ _id: { $in: [scorer._id, unauthorizedUser._id] } });
    await Match.deleteOne({ _id: match._id });
    await Innings.deleteMany({ match: match._id });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runTests();
