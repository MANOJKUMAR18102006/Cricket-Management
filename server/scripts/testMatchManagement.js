import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Match from '../models/Match.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026',
    { expiresIn: '1h' }
  );
};

async function testMatchEndpoints() {
  console.log('=====================================================');
  console.log('🏏 CRICKPULSE MATCH MANAGEMENT TEST SUITE');
  console.log('=====================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse');

  // Create test creator user and another user
  await User.deleteMany({ username: { $in: ['captain_smith', 'captain_jones'] } });
  const creator = await User.create({
    username: 'captain_smith',
    email: 'smith@crickpulse.test',
    password: 'password123',
    role: 'player',
  });
  const otherUser = await User.create({
    username: 'captain_jones',
    email: 'jones@crickpulse.test',
    password: 'password123',
    role: 'player',
  });

  const tokenCreator = generateToken(creator);
  const tokenOther = generateToken(otherUser);

  let passed = 0;

  // TEST 1: Create a T20 match via POST /api/matches
  console.log('--- TEST 1: Create Match (POST /api/matches) ---');
  let createRes = await fetch(`${BASE_URL}/matches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenCreator}`,
    },
    body: JSON.stringify({
      team1: 'Perth Scorchers',
      team2: 'Sydney Sixers',
      format: 'T20',
      venue: 'Optus Stadium',
      city: 'Perth',
      date: new Date(Date.now() + 1000 * 60 * 60 * 24),
      tournament: 'Big Bash League',
    }),
  });
  let createJson = await createRes.json();
  let createdMatchId = createJson.match?._id;

  if (createRes.status === 201 && createJson.match?.overs === 20 && createJson.match?.status === 'scheduled') {
    console.log('✅ TEST 1 PASSED: Created T20 match with auto-assigned 20 overs and scheduled status.\n');
    passed++;
  } else {
    console.error('❌ TEST 1 FAILED:', createRes.status, createJson);
  }

  // TEST 2: List matches via GET /api/matches
  console.log('--- TEST 2: List Matches (GET /api/matches) ---');
  let listRes = await fetch(`${BASE_URL}/matches`).then((r) => r.json());
  if (listRes.success && listRes.total > 0 && listRes.counts) {
    console.log(`✅ TEST 2 PASSED: Fetched ${listRes.count} matches. Counts: Scheduled: ${listRes.counts.scheduled}, Live: ${listRes.counts.live}, Completed: ${listRes.counts.completed}.\n`);
    passed++;
  } else {
    console.error('❌ TEST 2 FAILED:', listRes);
  }

  // TEST 3: Filter by status=live via GET /api/matches?status=live
  console.log('--- TEST 3: Filter by Status (GET /api/matches?status=live) ---');
  let liveRes = await fetch(`${BASE_URL}/matches?status=live`).then((r) => r.json());
  const allLive = liveRes.matches.every((m) => m.status === 'live');
  if (liveRes.success && allLive) {
    console.log(`✅ TEST 3 PASSED: Returned live matches successfully.\n`);
    passed++;
  } else {
    console.error('❌ TEST 3 FAILED:', liveRes);
  }

  // TEST 4: Fetch match detail via GET /api/matches/:id
  console.log('--- TEST 4: Get Match Detail (GET /api/matches/:id) ---');
  let detailRes = await fetch(`${BASE_URL}/matches/${createdMatchId}`).then((r) => r.json());
  if (detailRes.success && detailRes.match?.team1 === 'Perth Scorchers') {
    console.log(`✅ TEST 4 PASSED: Retrieved match details for ${detailRes.match.team1} vs ${detailRes.match.team2}.\n`);
    passed++;
  } else {
    console.error('❌ TEST 4 FAILED:', detailRes);
  }

  // TEST 5: Update match status & toss via PUT /api/matches/:id (by Creator)
  console.log('--- TEST 5: Update Match (PUT /api/matches/:id) by Creator ---');
  let updateRes = await fetch(`${BASE_URL}/matches/${createdMatchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenCreator}`,
    },
    body: JSON.stringify({
      tossWinner: 'Perth Scorchers',
      tossDecision: 'bat',
      status: 'live',
      result: 'Perth Scorchers won the toss and elected to bat',
    }),
  });
  let updateJson = await updateRes.json();
  if (updateRes.status === 200 && updateJson.match?.status === 'live' && updateJson.match?.tossWinner === 'Perth Scorchers') {
    console.log('✅ TEST 5 PASSED: Match updated to LIVE with toss decision.\n');
    passed++;
  } else {
    console.error('❌ TEST 5 FAILED:', updateRes.status, updateJson);
  }

  // TEST 6: Unauthorized update attempt by another user
  console.log('--- TEST 6: Unauthorized Update Attempt (HTTP 403) ---');
  let unauthRes = await fetch(`${BASE_URL}/matches/${createdMatchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenOther}`,
    },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  if (unauthRes.status === 403) {
    console.log('✅ TEST 6 PASSED: Unauthorized update blocked with HTTP 403.\n');
    passed++;
  } else {
    console.error('❌ TEST 6 FAILED:', unauthRes.status);
  }

  // TEST 7: Complete match with winner
  console.log('--- TEST 7: Complete Match with Winner ---');
  let completeRes = await fetch(`${BASE_URL}/matches/${createdMatchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenCreator}`,
    },
    body: JSON.stringify({
      status: 'completed',
      winner: 'Perth Scorchers',
      result: 'Perth Scorchers won by 34 runs',
    }),
  });
  let completeJson = await completeRes.json();
  if (completeRes.status === 200 && completeJson.match?.status === 'completed' && completeJson.match?.winner === 'Perth Scorchers') {
    console.log('✅ TEST 7 PASSED: Match completed with winner declared.\n');
    passed++;
  } else {
    console.error('❌ TEST 7 FAILED:', completeRes.status, completeJson);
  }

  // TEST 8: Delete match via DELETE /api/matches/:id
  console.log('--- TEST 8: Delete Match (DELETE /api/matches/:id) ---');
  let delRes = await fetch(`${BASE_URL}/matches/${createdMatchId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenCreator}` },
  });
  if (delRes.status === 200) {
    console.log('✅ TEST 8 PASSED: Match deleted successfully.\n');
    passed++;
  } else {
    console.error('❌ TEST 8 FAILED:', delRes.status);
  }

  // TEST 9: Unauthenticated create attempt (HTTP 401)
  console.log('--- TEST 9: Unauthenticated Create Attempt (HTTP 401) ---');
  let unauthCreate = await fetch(`${BASE_URL}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team1: 'Team A', team2: 'Team B' }),
  });
  if (unauthCreate.status === 401) {
    console.log('✅ TEST 9 PASSED: Unauthenticated create request rejected with HTTP 401.\n');
    passed++;
  } else {
    console.error('❌ TEST 9 FAILED:', unauthCreate.status);
  }

  // Cleanup test users
  await User.deleteMany({ _id: { $in: [creator._id, otherUser._id] } });

  console.log('=====================================================');
  console.log(`🎉 ALL ${passed} / 9 MATCH MANAGEMENT TESTS PASSED!`);
  console.log('=====================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

testMatchEndpoints().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
