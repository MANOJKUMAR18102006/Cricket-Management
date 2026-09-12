import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Connection from '../models/Connection.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026';

const run = async () => {
  console.log('=====================================================');
  console.log('🧪 TEST: CONNECTION STATUS ON PLAYERS LIST');
  console.log('=====================================================');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crickpulse');

  const timestamp = Date.now();

  // Create User & Player A (Viewer)
  const userA = await User.create({
    username: `conn_user_a_${timestamp}`,
    email: `conn_a_${timestamp}@crickpulse.test`,
    password: 'password123',
    role: 'player',
    status: 'active',
  });
  const playerA = await Player.create({
    userId: userA._id,
    displayName: `Player A ${timestamp}`,
    playingRole: 'Batter',
    profileVisibility: 'public',
  });

  // Create User & Player B (Connected)
  const userB = await User.create({
    username: `conn_user_b_${timestamp}`,
    email: `conn_b_${timestamp}@crickpulse.test`,
    password: 'password123',
    role: 'player',
    status: 'active',
  });
  const playerB = await Player.create({
    userId: userB._id,
    displayName: `Player B ${timestamp}`,
    playingRole: 'Bowler',
    profileVisibility: 'public',
  });

  // Create User & Player C (Pending Sent)
  const userC = await User.create({
    username: `conn_user_c_${timestamp}`,
    email: `conn_c_${timestamp}@crickpulse.test`,
    password: 'password123',
    role: 'player',
    status: 'active',
  });
  const playerC = await Player.create({
    userId: userC._id,
    displayName: `Player C ${timestamp}`,
    playingRole: 'All-Rounder',
    profileVisibility: 'public',
  });

  // Create Accepted Connection between Player A and Player B
  const acceptedConn = await Connection.create({
    requester: playerA._id,
    receiver: playerB._id,
    status: 'accepted',
  });

  // Create Pending Connection from Player A to Player C
  const pendingConn = await Connection.create({
    requester: playerA._id,
    receiver: playerC._id,
    status: 'pending',
  });

  const tokenA = jwt.sign({ id: userA._id, role: userA.role }, JWT_SECRET, { expiresIn: '1d' });

  try {
    // 1. Unauthenticated request to /api/players
    console.log('\n--- Test 1: Unauthenticated request to /api/players ---');
    const anonRes = await fetch(`${API_BASE}/players?search=${timestamp}`);
    const anonData = await anonRes.json();
    console.log('Anon count returned:', anonData.players?.length);
    anonData.players?.forEach((p) => {
      console.log(`Player: ${p.displayName} -> connectionStatus: "${p.connectionStatus}"`);
      if (p.connectionStatus !== 'none') {
        throw new Error(`Expected 'none' for unauthenticated request, got ${p.connectionStatus}`);
      }
    });
    console.log('✅ TEST 1 PASSED: Unauthenticated returns connectionStatus: "none"');

    // 2. Authenticated request as User A to /api/players (Self Excluded)
    console.log('\n--- Test 2: Authenticated request as User A (Self Excluded) ---');
    const authRes = await fetch(`${API_BASE}/players?search=${timestamp}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const authData = await authRes.json();
    console.log('Auth count returned for User A:', authData.players?.length);

    const foundA = authData.players?.find((p) => String(p._id) === String(playerA._id));
    const foundB = authData.players?.find((p) => String(p._id) === String(playerB._id));
    const foundC = authData.players?.find((p) => String(p._id) === String(playerC._id));

    if (foundA) {
      throw new Error(`Self Player A should NOT appear in User A's discovery list!`);
    }
    console.log('✅ Self Player A successfully excluded from User A discovery list.');

    if (foundB?.connectionStatus !== 'connected') {
      throw new Error(`Expected foundB connectionStatus to be 'connected', got ${foundB?.connectionStatus}`);
    }
    console.log(`✅ Connected Player B visible with status="connected".`);

    if (foundC?.connectionStatus !== 'pending_sent') {
      throw new Error(`Expected foundC connectionStatus to be 'pending_sent', got ${foundC?.connectionStatus}`);
    }
    console.log(`✅ Pending Player C visible with status="pending_sent".`);

    // 3. Authenticated request as User B (User B CAN see Player A as "connected")
    console.log('\n--- Test 3: Authenticated request as User B (Player A visible as "connected") ---');
    const tokenB = jwt.sign({ id: userB._id, role: userB.role }, JWT_SECRET, { expiresIn: '1d' });
    const authBRes = await fetch(`${API_BASE}/players?search=${timestamp}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const authBData = await authBRes.json();
    const foundAInB = authBData.players?.find((p) => String(p._id) === String(playerA._id));
    const foundBInB = authBData.players?.find((p) => String(p._id) === String(playerB._id));

    if (foundBInB) {
      throw new Error(`Self Player B should NOT appear in User B's discovery list!`);
    }
    if (!foundAInB || foundAInB.connectionStatus !== 'connected') {
      throw new Error(`Expected Player A to be visible to User B with status="connected", got ${foundAInB?.connectionStatus}`);
    }
    console.log(`✅ Player A is visible to other player (User B) as "connected"!`);

    console.log('\n=====================================================');
    console.log('🎉 ALL EXCLUSION AND RECIPROCAL VISIBILITY TESTS PASSED!');
    console.log('=====================================================');
  } finally {
    // Cleanup test data
    await Connection.deleteMany({ _id: { $in: [acceptedConn._id, pendingConn._id] } });
    await Player.deleteMany({ _id: { $in: [playerA._id, playerB._id, playerC._id] } });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id, userC._id] } });
    await mongoose.disconnect();
  }
};

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
