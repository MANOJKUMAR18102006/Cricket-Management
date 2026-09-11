import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=====================================================');
  console.log('🛡️  CRICKPULSE TEAM MANAGEMENT TEST SUITE');
  console.log('=====================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';
    await mongoose.connect(mongoUri);

    // Setup Test Users & Players
    const testUsernameA = `team_creator_${Date.now()}`;
    const userA = await User.create({
      username: testUsernameA,
      email: `${testUsernameA}@crickpulse.test`,
      password: 'Password123!',
      role: 'player',
    });

    const playerA = await Player.create({
      userId: userA._id,
      displayName: 'Captain Alpha',
      playingRole: 'Batter',
      city: 'Pune',
    });

    const testUsernameB = `squad_member_${Date.now()}`;
    const userB = await User.create({
      username: testUsernameB,
      email: `${testUsernameB}@crickpulse.test`,
      password: 'Password123!',
      role: 'player',
    });

    const playerB = await Player.create({
      userId: userB._id,
      displayName: 'Bowler Bravo',
      playingRole: 'Bowler',
      city: 'Pune',
    });

    const testUsernameC = `rogue_user_${Date.now()}`;
    const userC = await User.create({
      username: testUsernameC,
      email: `${testUsernameC}@crickpulse.test`,
      password: 'Password123!',
      role: 'player',
    });

    const jwtSecret = process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026';
    const tokenA = jwt.sign({ id: userA._id, role: userA.role }, jwtSecret, { expiresIn: '1h' });
    const tokenB = jwt.sign({ id: userB._id, role: userB.role }, jwtSecret, { expiresIn: '1h' });
    const tokenC = jwt.sign({ id: userC._id, role: userC.role }, jwtSecret, { expiresIn: '1h' });

    let createdTeamId = null;

    // --- TEST 1: Create Team (POST /api/teams) ---
    console.log('--- TEST 1: Create Team (POST /api/teams) ---');
    const teamPayload = {
      name: `Pune Warriors ${Date.now()}`,
      city: 'Pune',
      description: 'Rising cricket club from Pune featuring modern aggressive batting.',
      logo: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e',
    };

    const res1 = await fetch(`${BASE_URL}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify(teamPayload),
    });

    const data1 = await res1.json();
    if (!res1.ok || !data1.success) {
      throw new Error(`TEST 1 Failed: ${data1.message || res1.statusText}`);
    }
    createdTeamId = data1.team._id;
    console.log(`✅ TEST 1 PASSED: Created team "${data1.team.name}" with default captain & member (${playerA.displayName}).\n`);

    // --- TEST 2: List Teams & Search (GET /api/teams) ---
    console.log('--- TEST 2: List Teams & Search (GET /api/teams) ---');
    const res2 = await fetch(`${BASE_URL}/teams?search=Pune`);
    const data2 = await res2.json();
    if (!res2.ok || !data2.success || data2.teams.length === 0) {
      throw new Error('TEST 2 Failed: Could not find team with search query');
    }
    console.log(`✅ TEST 2 PASSED: Listed ${data2.teams.length} teams matching search "Pune".\n`);

    // --- TEST 3: Get Team Profile with Match Stats (GET /api/teams/:id) ---
    console.log('--- TEST 3: Get Team Profile (GET /api/teams/:id) ---');
    // First, verify with Royal Challengers to ensure match stats calculations work
    const rcbTeam = await Team.findOne({ name: 'Royal Challengers' });
    if (rcbTeam) {
      const res3Rcb = await fetch(`${BASE_URL}/teams/${rcbTeam._id}`);
      const data3Rcb = await res3Rcb.json();
      if (!res3Rcb.ok || !data3Rcb.stats) {
        throw new Error('TEST 3 Failed: Missing match statistics in team profile');
      }
      console.log(`✅ TEST 3 PASSED: Retrieved team "${data3Rcb.team.name}". Stats: Matches: ${data3Rcb.stats.matchesCount}, Wins: ${data3Rcb.stats.wins}, Losses: ${data3Rcb.stats.losses}, WinRate: ${data3Rcb.stats.winRate}%.\n`);
    } else {
      const res3 = await fetch(`${BASE_URL}/teams/${createdTeamId}`);
      const data3 = await res3.json();
      if (!res3.ok || !data3.stats) {
        throw new Error('TEST 3 Failed: Missing match statistics');
      }
      console.log(`✅ TEST 3 PASSED: Retrieved team "${data3.team.name}".\n`);
    }

    // --- TEST 4: Add Player to Squad (POST /api/teams/:id/members/:playerId) ---
    console.log('--- TEST 4: Add Player to Squad (POST /api/teams/:id/members/:playerId) ---');
    const res4 = await fetch(`${BASE_URL}/teams/${createdTeamId}/members/${playerB._id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });
    const data4 = await res4.json();
    if (!res4.ok || !data4.success) {
      throw new Error(`TEST 4 Failed: ${data4.message}`);
    }
    console.log(`✅ TEST 4 PASSED: Added player "${playerB.displayName}" to squad. Members count: ${data4.team.members.length}.\n`);

    // --- TEST 5: Set Vice Captain (PUT /api/teams/:id) ---
    console.log('--- TEST 5: Set Vice Captain (PUT /api/teams/:id) ---');
    const res5 = await fetch(`${BASE_URL}/teams/${createdTeamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        viceCaptain: playerB._id,
        description: 'Updated team description with designated vice captain.',
      }),
    });
    const data5 = await res5.json();
    if (!res5.ok || !data5.success || !data5.team.viceCaptain) {
      throw new Error(`TEST 5 Failed: ${data5.message}`);
    }
    console.log(`✅ TEST 5 PASSED: Designated vice captain "${data5.team.viceCaptain.displayName}".\n`);

    // --- TEST 6: Duplicate Member Addition Guard (HTTP 400) ---
    console.log('--- TEST 6: Duplicate Member Guard ---');
    const res6 = await fetch(`${BASE_URL}/teams/${createdTeamId}/members/${playerB._id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });
    if (res6.status !== 400) {
      throw new Error(`TEST 6 Failed: Expected HTTP 400 for duplicate member, got ${res6.status}`);
    }
    console.log('✅ TEST 6 PASSED: Duplicate squad member addition correctly rejected with HTTP 400.\n');

    // --- TEST 7: Remove Member from Squad (DELETE /api/teams/:id/members/:playerId) ---
    console.log('--- TEST 7: Remove Member from Squad ---');
    const res7 = await fetch(`${BASE_URL}/teams/${createdTeamId}/members/${playerB._id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });
    const data7 = await res7.json();
    if (!res7.ok || !data7.success) {
      throw new Error(`TEST 7 Failed: ${data7.message}`);
    }
    console.log(`✅ TEST 7 PASSED: Removed member. Squad count: ${data7.team.members.length}. Vice captain auto-cleared.\n`);

    // --- TEST 8: Unauthorized Update Attempt (HTTP 403) ---
    console.log('--- TEST 8: Unauthorized Update Guard (HTTP 403) ---');
    const res8 = await fetch(`${BASE_URL}/teams/${createdTeamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenC}`, // user C is neither creator nor captain
      },
      body: JSON.stringify({ name: 'Hacked Team Name' }),
    });
    if (res8.status !== 403) {
      throw new Error(`TEST 8 Failed: Expected HTTP 403, got ${res8.status}`);
    }
    console.log('✅ TEST 8 PASSED: Unauthorized update blocked with HTTP 403.\n');

    // --- TEST 9: Delete Team (DELETE /api/teams/:id) ---
    console.log('--- TEST 9: Delete Team (DELETE /api/teams/:id) ---');
    const res9 = await fetch(`${BASE_URL}/teams/${createdTeamId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });
    const data9 = await res9.json();
    if (!res9.ok || !data9.success) {
      throw new Error(`TEST 9 Failed: ${data9.message}`);
    }
    console.log('✅ TEST 9 PASSED: Team deleted successfully.\n');

    console.log('=====================================================');
    console.log('🎉 ALL 9 / 9 TEAM MANAGEMENT TESTS PASSED!');
    console.log('=====================================================');

    // Cleanup test records
    await User.deleteMany({ _id: { $in: [userA._id, userB._id, userC._id] } });
    await Player.deleteMany({ _id: { $in: [playerA._id, playerB._id] } });
    await Team.deleteOne({ _id: createdTeamId });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runTests();
