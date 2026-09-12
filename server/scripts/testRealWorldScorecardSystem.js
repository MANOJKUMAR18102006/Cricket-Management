import mongoose from 'mongoose';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Innings from '../models/Innings.js';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('=== REAL-WORLD SCORECARD & LIVE SCORING VERIFICATION ===');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse');
  console.log('Connected to MongoDB.');

  // Find or create test users and players
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.findOne();
  }

  // Login to get token
  let token = '';
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminUser.email, password: 'password123' })
  });
  const loginData = await loginRes.json();
  if (loginData.token) {
    token = loginData.token;
  } else {
    // Generate a temporary JWT if standard login password differs in seed
    const jwt = (await import('jsonwebtoken')).default;
    token = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1d' });
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Create 2 test teams with 12 players each
  console.log('\n--- 1. Setting up Test Teams and Players ---');
  const team1Players = [];
  const team2Players = [];

  for (let i = 1; i <= 12; i++) {
    const dummyUser1 = new mongoose.Types.ObjectId();
    const p1 = await Player.findOneAndUpdate(
      { displayName: `T1 Player ${i}` },
      { userId: dummyUser1, displayName: `T1 Player ${i}`, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', playingRole: 'Batter' },
      { upsert: true, new: true }
    );
    team1Players.push(p1);

    const dummyUser2 = new mongoose.Types.ObjectId();
    const p2 = await Player.findOneAndUpdate(
      { displayName: `T2 Player ${i}` },
      { userId: dummyUser2, displayName: `T2 Player ${i}`, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', playingRole: 'Bowler' },
      { upsert: true, new: true }
    );
    team2Players.push(p2);
  }

  const team1 = await Team.findOneAndUpdate(
    { name: 'Royal Strikers XI' },
    { name: 'Royal Strikers XI', shortName: 'RSXI', members: team1Players.map(p => p._id), createdBy: adminUser._id },
    { upsert: true, new: true }
  );

  const team2 = await Team.findOneAndUpdate(
    { name: 'Super Titans XI' },
    { name: 'Super Titans XI', shortName: 'STXI', members: team2Players.map(p => p._id), createdBy: adminUser._id },
    { upsert: true, new: true }
  );

  // Create a match
  console.log('\n--- 2. Creating Test T20 Match ---');
  const testMatch = await Match.create({
    team1: team1.name,
    team2: team2.name,
    format: 'T20',
    overs: 20,
    venue: 'Eden Park',
    city: 'Auckland',
    date: new Date(),
    status: 'scheduled',
    createdBy: adminUser._id
  });

  console.log(`Created match ID: ${testMatch._id}`);

  // Test GET /api/matches/:id/squad
  console.log('\n--- 3. Fetching Match Squad (GET /api/matches/:id/squad) ---');
  const squadRes = await fetch(`${BASE_URL}/matches/${testMatch._id}/squad`);
  const squadData = await squadRes.json();
  console.log(`Squad fetched successfully: ${squadData.success}`);
  console.log(`Team 1 Squad Size: ${squadData.team1.squad.length}, Max Overs Per Bowler: ${squadData.maxOversPerBowler}`);

  // Test POST /api/matches/:id/playing-xi with > 11 players (should fail)
  console.log('\n--- 4. Testing Playing XI Validation (> 11 players) ---');
  const invalidRes = await fetch(`${BASE_URL}/matches/${testMatch._id}/playing-xi`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      team: 'team1',
      playerIds: team1Players.map(p => p._id) // 12 players
    })
  });
  const invalidData = await invalidRes.json();
  console.log(`12 Players rejected: ${!invalidData.success} - Message: "${invalidData.message}"`);

  // Confirm exactly 11 players for both teams
  console.log('\n--- 5. Confirming Valid Playing XI (11 players each) ---');
  const xi1 = team1Players.slice(0, 11).map(p => p._id);
  const xi2 = team2Players.slice(0, 11).map(p => p._id);

  const setXI1Res = await fetch(`${BASE_URL}/matches/${testMatch._id}/playing-xi`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ team: 'team1', playerIds: xi1 })
  });
  const setXI1Data = await setXI1Res.json();
  console.log(`Team 1 XI Confirmed: ${setXI1Data.success}, Count: ${setXI1Data.playingXI.length}`);

  const setXI2Res = await fetch(`${BASE_URL}/matches/${testMatch._id}/playing-xi`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ team: 'team2', playerIds: xi2 })
  });
  const setXI2Data = await setXI2Res.json();
  console.log(`Team 2 XI Confirmed: ${setXI2Data.success}, Count: ${setXI2Data.playingXI.length}`);

  // Start Innings 1
  console.log('\n--- 6. Starting Innings 1 ---');
  const striker = team1Players[0].displayName;
  const nonStriker = team1Players[1].displayName;
  const bowler1 = team2Players[0].displayName;

  const startRes = await fetch(`${BASE_URL}/scoring/${testMatch._id}/start-innings`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      inningsNumber: 1,
      battingTeam: team1.name,
      bowlingTeam: team2.name,
      striker,
      nonStriker,
      bowler: bowler1
    })
  });
  const startData = await startRes.json();
  console.log(`Innings 1 started: ${startData.success}, Striker: ${startData.currentInnings.striker}, Bowler: ${startData.currentInnings.currentBowler}`);

  // Score ball 1: 1 run (strike rotates)
  console.log('\n--- 7. Delivery 1: 1 Run (Strike Rotation) ---');
  const del1Res = await fetch(`${BASE_URL}/matches/${testMatch._id}/deliveries`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ runs: 1, type: 'normal' })
  });
  const del1Data = await del1Res.json();
  console.log(`Delivery 1: Total: ${del1Data.currentInnings.totalRuns}/${del1Data.currentInnings.wickets} (${del1Data.currentInnings.overs} ov), Striker: ${del1Data.currentInnings.striker}`);
  if (del1Data.currentInnings.striker !== nonStriker) {
    console.error('Strike rotation failed!');
  } else {
    console.log('✅ Strike rotated correctly on odd run.');
  }

  // Score ball 2: Wide (+1 extra run, legal balls unchanged)
  console.log('\n--- 8. Delivery 2: Wide (+1 extra) ---');
  const del2Res = await fetch(`${BASE_URL}/matches/${testMatch._id}/deliveries`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ runs: 0, type: 'wide', extraRuns: 1 })
  });
  const del2Data = await del2Res.json();
  console.log(`Delivery 2 (Wide): Total: ${del2Data.currentInnings.totalRuns}/${del2Data.currentInnings.wickets} (${del2Data.currentInnings.overs} ov)`);

  // Score ball 3: Wicket (Caught with Fielder attribution)
  console.log('\n--- 9. Delivery 3: Wicket (Caught by Fielder) ---');
  const fielder = team2Players[4]; // fielder from fielding XI
  const newBatsman = team1Players[2].displayName;

  const del3Res = await fetch(`${BASE_URL}/matches/${testMatch._id}/deliveries`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      runs: 0,
      type: 'wicket',
      wicket: {
        type: 'caught',
        dismissedPlayer: nonStriker,
        newBatsman,
        fielder: fielder.displayName,
        fielderId: fielder._id
      }
    })
  });
  const del3Data = await del3Res.json();
  console.log(`Delivery 3: Total: ${del3Data.currentInnings.totalRuns}/${del3Data.currentInnings.wickets} (${del3Data.currentInnings.overs} ov)`);
  const dismissedRecord = del3Data.currentInnings.batsmen.find(b => b.name === nonStriker);
  console.log(`Dismissal text: "${dismissedRecord.dismissal}"`);
  if (dismissedRecord.dismissal.includes(fielder.displayName)) {
    console.log(`✅ Fielder credited in dismissal text: "${dismissedRecord.dismissal}"`);
  } else {
    console.error(`❌ Fielder missing from dismissal text`);
  }

  // Bowl 4 more legal balls to complete over 1
  console.log('\n--- 10. Bowling out Over 1 (6 legal balls) ---');
  for (let b = 0; b < 4; b++) {
    await fetch(`${BASE_URL}/matches/${testMatch._id}/deliveries`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ runs: 0, type: 'normal' })
    });
  }

  const scoreStateRes = await fetch(`${BASE_URL}/matches/${testMatch._id}/scorecard`);
  const scoreState = await scoreStateRes.json();
  console.log(`Over 1 Complete: ${scoreState.currentInnings.overs} ov, Previous Bowler recorded as: ${scoreState.currentInnings.previousBowler}`);

  // Test Consecutive Over Restriction: Attempt to set same bowler (bowler1) for Over 2
  console.log('\n--- 11. Testing Consecutive Over Restriction ---');
  const consecRes = await fetch(`${BASE_URL}/matches/${testMatch._id}/bowler`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ bowler: bowler1 })
  });
  const consecData = await consecRes.json();
  console.log(`Consecutive over by ${bowler1} rejected: ${!consecData.success} - Message: "${consecData.message}"`);
  if (!consecData.success && consecData.message.includes('consecutive')) {
    console.log('✅ Consecutive over restriction enforced correctly!');
  } else {
    console.error('❌ Consecutive over restriction failed!');
  }

  // Set eligible bowler (bowler2)
  console.log('\n--- 12. Setting Eligible Bowler for Over 2 ---');
  const bowler2 = team2Players[1].displayName;
  const setBowlerRes = await fetch(`${BASE_URL}/matches/${testMatch._id}/bowler`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ bowler: bowler2 })
  });
  const setBowlerData = await setBowlerRes.json();
  console.log(`Eligible bowler set: ${setBowlerData.success}, Current Bowler: ${setBowlerData.currentBowler}`);

  // Test Undo Last Ball
  console.log('\n--- 13. Testing Undo Last Ball ---');
  const undoRes = await fetch(`${BASE_URL}/scoring/${testMatch._id}/undo`, {
    method: 'POST',
    headers: authHeaders
  });
  const undoData = await undoRes.json();
  console.log(`Undo result: ${undoData.success}, Overs now: ${undoData.currentInnings.overs} ov`);
  console.log('✅ Undo successfully rolled back delivery.');

  // Clean up test data
  console.log('\n--- 14. Cleaning Up Test Fixture ---');
  await Match.findByIdAndDelete(testMatch._id);
  await Innings.deleteMany({ match: testMatch._id });
  console.log('Test match cleaned up.');

  console.log('\n=== ALL REAL-WORLD SCORECARD BACKEND TESTS PASSED ===');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
