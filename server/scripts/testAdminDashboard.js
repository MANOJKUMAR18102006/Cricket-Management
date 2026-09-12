import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026';

const runTests = async () => {
  console.log('=====================================================');
  console.log('🛡️  CRICKPULSE ADMIN DASHBOARD & RBAC TEST SUITE');
  console.log('=====================================================');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crickpulse');

  // Create or retrieve Test Admin User & Test Regular Player User
  const timestamp = Date.now();
  const adminUser = await User.create({
    username: `admin_${timestamp}`,
    email: `admin_${timestamp}@crickpulse.test`,
    password: 'password123',
    role: 'admin',
    status: 'active',
  });

  const regularUser = await User.create({
    username: `player_${timestamp}`,
    email: `player_${timestamp}@crickpulse.test`,
    password: 'password123',
    role: 'player',
    status: 'active',
  });

  const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, JWT_SECRET, { expiresIn: '1d' });
  const playerToken = jwt.sign({ id: regularUser._id, role: regularUser.role }, JWT_SECRET, { expiresIn: '1d' });

  try {
    // --- TEST 1: Anonymous request to /api/admin/stats (Expect 401) ---
    console.log('\n--- TEST 1: Anonymous request to /api/admin/stats (Expect 401) ---');
    const anonRes = await fetch(`${API_BASE}/admin/stats`);
    if (anonRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for anonymous request, got ${anonRes.status}`);
    }
    console.log('✅ TEST 1 PASSED: Anonymous request rejected with 401.');

    // --- TEST 2: Regular Player request to /api/admin/stats (Expect 403) ---
    console.log('\n--- TEST 2: Regular Player request to /api/admin/stats (Expect 403) ---');
    const playerRes = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${playerToken}` },
    });
    if (playerRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for player role, got ${playerRes.status}`);
    }
    const playerJson = await playerRes.json();
    console.log(`Response message: "${playerJson.message}"`);
    console.log('✅ TEST 2 PASSED: Regular player rejected with 403 Forbidden.');

    // --- TEST 3: Admin request to /api/admin/stats (Expect 200) ---
    console.log('\n--- TEST 3: Admin request to /api/admin/stats (Expect 200) ---');
    const adminRes = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (adminRes.status !== 200) {
      const errText = await adminRes.text();
      throw new Error(`Expected 200 for admin, got ${adminRes.status}: ${errText}`);
    }
    const statsData = await adminRes.json();
    console.log('Dashboard Stats retrieved:');
    console.log(JSON.stringify(statsData.stats, null, 2));

    const requiredStats = [
      'totalUsers',
      'totalPlayers',
      'totalTeams',
      'totalMatches',
      'completedMatches',
      'liveMatches',
      'totalTournaments',
    ];

    for (const key of requiredStats) {
      if (statsData.stats[key] === undefined) {
        throw new Error(`Missing expected stat key: ${key}`);
      }
    }
    console.log('✅ TEST 3 PASSED: All 7 required statistics returned to admin.');

    // --- TEST 4: Admin Disables User Account ---
    console.log('\n--- TEST 4: Admin Disables User Account ---');
    const disableRes = await fetch(`${API_BASE}/admin/users/${regularUser._id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'disabled' }),
    });

    if (disableRes.status !== 200) {
      throw new Error(`Failed to disable user: ${await disableRes.text()}`);
    }
    const disableJson = await disableRes.json();
    if (disableJson.user.status !== 'disabled') {
      throw new Error(`User status not updated to disabled`);
    }
    console.log('✅ User account disabled successfully by admin.');

    // --- TEST 5: Disabled User attempts login & authenticated action (Expect 403) ---
    console.log('\n--- TEST 5: Disabled User attempts login & API access (Expect 403) ---');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: regularUser.email,
        password: 'password123',
      }),
    });
    if (loginRes.status !== 403) {
      throw new Error(`Expected 403 for disabled user login, got ${loginRes.status}`);
    }

    const authMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${playerToken}` },
    });
    if (authMeRes.status !== 403) {
      throw new Error(`Expected 403 for disabled user token, got ${authMeRes.status}`);
    }
    console.log('✅ TEST 5 PASSED: Disabled user blocked on both login and authMiddleware.');

    // --- TEST 6: Admin Re-enables User Account ---
    console.log('\n--- TEST 6: Admin Re-enables User Account ---');
    const enableRes = await fetch(`${API_BASE}/admin/users/${regularUser._id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'active' }),
    });
    if (enableRes.status !== 200) {
      throw new Error(`Failed to re-enable user: ${await enableRes.text()}`);
    }
    console.log('✅ TEST 6 PASSED: User account successfully re-enabled.');

    // --- TEST 7: Admin Moderates Team & Match ---
    console.log('\n--- TEST 7: Admin Moderates Team & Match ---');
    const tempTeam = await Team.create({
      name: `Inappropriate Team ${timestamp}`,
      city: 'Delhi',
      createdBy: adminUser._id,
    });

    const tempMatch = await Match.create({
      team1: 'Team A',
      team2: 'Team B',
      format: 'T20',
      status: 'scheduled',
      tournament: `Championship ${timestamp}`,
      date: new Date(),
      venue: 'National Cricket Arena',
      city: 'Delhi',
      overs: 20,
      createdBy: adminUser._id,
    });

    // Update match status to 'live'
    const updateMatchRes = await fetch(`${API_BASE}/admin/matches/${tempMatch._id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'live' }),
    });
    if (updateMatchRes.status !== 200) {
      throw new Error(`Failed to update match status: ${await updateMatchRes.text()}`);
    }

    // Delete inappropriate team
    const delTeamRes = await fetch(`${API_BASE}/admin/teams/${tempTeam._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (delTeamRes.status !== 200) {
      throw new Error(`Failed to delete team: ${await delTeamRes.text()}`);
    }

    // Delete inappropriate match
    const delMatchRes = await fetch(`${API_BASE}/admin/matches/${tempMatch._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (delMatchRes.status !== 200) {
      throw new Error(`Failed to delete match: ${await delMatchRes.text()}`);
    }
    console.log('✅ TEST 7 PASSED: Admin updated match status and removed inappropriate content.');

    console.log('\n=====================================================');
    console.log('🎉 ALL 7 / 7 ADMIN BACKEND TESTS PASSED!');
    console.log('=====================================================');
  } finally {
    // Cleanup test users
    await User.deleteMany({ _id: { $in: [adminUser._id, regularUser._id] } });
    await mongoose.disconnect();
    console.log('🧹 Cleaned up temporary test data.');
  }
};

runTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
