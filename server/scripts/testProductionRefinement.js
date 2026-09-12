import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Match from '../models/Match.js';
import Team from '../models/Team.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026';

const runTests = async () => {
  console.log('=====================================================');
  console.log('🚀 CRICKPULSE PRODUCTION REFINEMENT VERIFICATION');
  console.log('=====================================================');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crickpulse');

  const timestamp = Date.now();
  const testUser = await User.create({
    username: `refine_user_${timestamp}`,
    email: `refine_${timestamp}@crickpulse.test`,
    password: 'password123',
    role: 'player',
    status: 'active',
  });

  const authToken = jwt.sign({ id: testUser._id, role: testUser.role }, JWT_SECRET, { expiresIn: '1d' });

  try {
    // 1. Test CastError / Invalid ObjectId handling on /api/teams/:id
    console.log('\n--- TEST 1: Invalid ObjectId on /api/teams/:id (Expect 400 Bad Request) ---');
    const teamRes = await fetch(`${API_BASE}/teams/invalid-team-id-xyz`);
    const teamData = await teamRes.json();
    console.log(`Status: ${teamRes.status}, Response:`, teamData);
    if (teamRes.status !== 400) {
      throw new Error(`Expected 400 for malformed team ID, got ${teamRes.status}`);
    }
    console.log('✅ TEST 1 PASSED: Malformed team ID handled with 400 Bad Request.');

    // 2. Test CastError / Invalid ObjectId on /api/players/:id
    console.log('\n--- TEST 2: Invalid ObjectId on /api/players/:id (Expect 400 Bad Request) ---');
    const playerRes = await fetch(`${API_BASE}/players/not-an-id`);
    const playerData = await playerRes.json();
    console.log(`Status: ${playerRes.status}, Response:`, playerData);
    if (playerRes.status !== 400) {
      throw new Error(`Expected 400 for malformed player ID, got ${playerRes.status}`);
    }
    console.log('✅ TEST 2 PASSED: Malformed player ID handled with 400 Bad Request.');

    // 3. Test CastError / Invalid ObjectId on /api/matches/:id
    console.log('\n--- TEST 3: Invalid ObjectId on /api/matches/:id (Expect 400 Bad Request) ---');
    const matchRes = await fetch(`${API_BASE}/matches/123456789-bad`);
    const matchData = await matchRes.json();
    console.log(`Status: ${matchRes.status}, Response:`, matchData);
    if (matchRes.status !== 400) {
      throw new Error(`Expected 400 for malformed match ID, got ${matchRes.status}`);
    }
    console.log('✅ TEST 3 PASSED: Malformed match ID handled with 400 Bad Request.');

    // 4. Test CastError / Invalid ObjectId on /api/notifications/:id/read
    console.log('\n--- TEST 4: Invalid ObjectId on /api/notifications/:id/read (Expect 400 Bad Request) ---');
    const notifRes = await fetch(`${API_BASE}/notifications/invalid-notif/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const notifData = await notifRes.json();
    console.log(`Status: ${notifRes.status}, Response:`, notifData);
    if (notifRes.status !== 400) {
      throw new Error(`Expected 400 for malformed notification ID, got ${notifRes.status}`);
    }
    console.log('✅ TEST 4 PASSED: Malformed notification ID handled with 400 Bad Request.');

    // 5. Test Duplicate User Registration Error Handling (code 11000 -> 400)
    console.log('\n--- TEST 5: Duplicate User Registration Handling (Expect 400 Bad Request) ---');
    const dupRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUser.username,
        email: testUser.email,
        password: 'password123',
      }),
    });
    const dupData = await dupRes.json();
    console.log(`Status: ${dupRes.status}, Response:`, dupData);
    if (dupRes.status !== 400) {
      throw new Error(`Expected 400 for duplicate user registration, got ${dupRes.status}`);
    }
    console.log('✅ TEST 5 PASSED: Duplicate registration cleanly returns 400 Bad Request.');

    // 6. Verify Database Indexes
    console.log('\n--- TEST 6: Verify Database Indexes on Models ---');
    const userIndexes = await User.collection.indexes();
    const playerIndexes = await Player.collection.indexes();
    const matchIndexes = await Match.collection.indexes();

    console.log('User collection indexes:', userIndexes.map((i) => Object.keys(i.key).join('_')));
    console.log('Player collection indexes:', playerIndexes.map((i) => Object.keys(i.key).join('_')));
    console.log('Match collection indexes:', matchIndexes.map((i) => Object.keys(i.key).join('_')));

    // Ensure User has indexes
    const hasUserEmail = userIndexes.some((i) => i.key.email);
    const hasUserUsername = userIndexes.some((i) => i.key.username);
    if (!hasUserEmail || !hasUserUsername) {
      throw new Error('User model missing email/username unique index.');
    }

    console.log('✅ TEST 6 PASSED: Database indexes successfully verified.');

    console.log('\n=====================================================');
    console.log('🎉 ALL PRODUCTION REFINEMENT TESTS PASSED PERFECTLY!');
    console.log('=====================================================');
  } finally {
    // Cleanup
    await User.findByIdAndDelete(testUser._id);
    await mongoose.disconnect();
  }
};

runTests().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
