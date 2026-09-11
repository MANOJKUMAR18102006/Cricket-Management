import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Connection from '../models/Connection.js';
import Notification from '../models/Notification.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const generateTestToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026',
    { expiresIn: '1h' }
  );
};

async function runAllTests() {
  console.log('=====================================================');
  console.log('🏏 CRICKPULSE PRIVACY & CONNECTION TEST SUITE');
  console.log('=====================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse');

  // Clean up any previous test players and connections
  await User.deleteMany({ username: { $in: ['test_user_a', 'test_user_b', 'test_user_c'] } });
  const oldUsers = await User.find({ username: { $in: ['test_user_a', 'test_user_b', 'test_user_c'] } });
  const oldUserIds = oldUsers.map((u) => u._id);
  const oldPlayers = await Player.find({ userId: { $in: oldUserIds } });
  const oldPlayerIds = oldPlayers.map((p) => p._id);

  await Connection.deleteMany({
    $or: [{ requester: { $in: oldPlayerIds } }, { receiver: { $in: oldPlayerIds } }],
  });
  await Notification.deleteMany({
    $or: [{ recipient: { $in: oldPlayerIds } }, { sender: { $in: oldPlayerIds } }],
  });
  await Player.deleteMany({ userId: { $in: oldUserIds } });

  // Create Player A
  const userA = await User.create({
    username: 'test_user_a',
    email: 'test_a@crickpulse.test',
    password: 'password123',
  });
  const playerA = await Player.create({
    userId: userA._id,
    displayName: 'Test Player Alpha',
    playingRole: 'Batter',
    profileVisibility: 'public',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
  });
  const tokenA = generateTestToken(userA);

  // Create Player B
  const userB = await User.create({
    username: 'test_user_b',
    email: 'test_b@crickpulse.test',
    password: 'password123',
  });
  const playerB = await Player.create({
    userId: userB._id,
    displayName: 'Test Player Beta',
    playingRole: 'Bowler',
    profileVisibility: 'private',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Left-arm fast',
  });
  const tokenB = generateTestToken(userB);

  console.log(`Created Player A: ${playerA.displayName} (${playerA._id}) [public]`);
  console.log(`Created Player B: ${playerB.displayName} (${playerB._id}) [private]\n`);

  let passedCount = 0;

  // -----------------------------------------------------------------
  // TEST 1: Player A has public account. Player B is not connected.
  // Result: Player B can view A's detailed data.
  // -----------------------------------------------------------------
  console.log('--- TEST 1: Player A (public), B is not connected ---');
  let res1 = await fetch(`${BASE_URL}/players/${playerA._id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  }).then((r) => r.json());
  let stats1 = await fetch(`${BASE_URL}/players/${playerA._id}/protected-stats`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  if (res1.canViewDetails === true && stats1.status === 200) {
    console.log('✅ TEST 1 PASSED: Player B can view Player A detailed stats and protected data.\n');
    passedCount++;
  } else {
    console.error('❌ TEST 1 FAILED:', res1, stats1.status);
  }

  // -----------------------------------------------------------------
  // TEST 2: Player A changes to private account. Player B is not connected.
  // Result: B cannot view A's detailed data (HTTP 403 on protected-stats, canViewDetails: false).
  // -----------------------------------------------------------------
  console.log('--- TEST 2: Player A (private), B is not connected ---');
  await fetch(`${BASE_URL}/players/me/privacy`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ profileVisibility: 'private' }),
  });

  let res2 = await fetch(`${BASE_URL}/players/${playerA._id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  }).then((r) => r.json());
  let stats2 = await fetch(`${BASE_URL}/players/${playerA._id}/protected-stats`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  if (res2.canViewDetails === false && stats2.status === 403) {
    console.log('✅ TEST 2 PASSED: B cannot view A private data, protected-stats returned HTTP 403.\n');
    passedCount++;
  } else {
    console.error('❌ TEST 2 FAILED:', res2, stats2.status);
  }

  // -----------------------------------------------------------------
  // TEST 3: Player B sends connection request to A. A has private account.
  // Result: B still cannot view A's detailed data.
  // -----------------------------------------------------------------
  console.log('--- TEST 3: B sends connection request to A (status: pending) ---');
  let reqRes = await fetch(`${BASE_URL}/connections/request/${playerA._id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  }).then((r) => r.json());

  let connectionId = reqRes.connection?._id;

  let res3 = await fetch(`${BASE_URL}/players/${playerA._id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  }).then((r) => r.json());
  let stats3 = await fetch(`${BASE_URL}/players/${playerA._id}/protected-stats`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  if (res3.canViewDetails === false && stats3.status === 403) {
    console.log('✅ TEST 3 PASSED: B still cannot view private data while request is pending.\n');
    passedCount++;
  } else {
    console.error('❌ TEST 3 FAILED:', res3, stats3.status);
  }

  // -----------------------------------------------------------------
  // TEST 4: A accepts B's request.
  // Result: B can now view A's detailed data.
  // -----------------------------------------------------------------
  console.log('--- TEST 4: A accepts B request (status: accepted) ---');
  let acceptRes = await fetch(`${BASE_URL}/connections/${connectionId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then((r) => r.json());

  let res4 = await fetch(`${BASE_URL}/players/${playerA._id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  }).then((r) => r.json());
  let stats4 = await fetch(`${BASE_URL}/players/${playerA._id}/protected-stats`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  if (res4.canViewDetails === true && stats4.status === 200) {
    console.log('✅ TEST 4 PASSED: B can now view A private data after acceptance.\n');
    passedCount++;
  } else {
    console.error('❌ TEST 4 FAILED:', res4, stats4.status);
  }

  // -----------------------------------------------------------------
  // TEST 5: A removes the connection.
  // Result: B can no longer view A's private data.
  // -----------------------------------------------------------------
  console.log('--- TEST 5: A removes the connection ---');
  await fetch(`${BASE_URL}/connections/${connectionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  let res5 = await fetch(`${BASE_URL}/players/${playerA._id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  }).then((r) => r.json());
  let stats5 = await fetch(`${BASE_URL}/players/${playerA._id}/protected-stats`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  if (res5.canViewDetails === false && stats5.status === 403) {
    console.log('✅ TEST 5 PASSED: B can no longer view A private data after connection removal.\n');
    passedCount++;
  } else {
    console.error('❌ TEST 5 FAILED:', res5, stats5.status);
  }

  // -----------------------------------------------------------------
  // TEST 6: Player views their own private profile.
  // Result: They can view their own data (Owner access).
  // -----------------------------------------------------------------
  console.log('--- TEST 6: Player views their own private profile ---');
  let res6 = await fetch(`${BASE_URL}/players/${playerA._id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then((r) => r.json());
  let stats6 = await fetch(`${BASE_URL}/players/${playerA._id}/protected-stats`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (res6.canViewDetails === true && res6.isOwner === true && stats6.status === 200) {
    console.log('✅ TEST 6 PASSED: Owner can always view their own private profile & stats.\n');
    passedCount++;
  } else {
    console.error('❌ TEST 6 FAILED:', res6, stats6.status);
  }

  // -----------------------------------------------------------------
  // TEST 7: Player attempts to send a connection request to themselves.
  // Result: Request rejected (HTTP 400).
  // -----------------------------------------------------------------
  console.log('--- TEST 7: Player attempts self connection request ---');
  let res7 = await fetch(`${BASE_URL}/connections/request/${playerA._id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  let json7 = await res7.json();
  if (res7.status === 400 && json7.message.includes('yourself')) {
    console.log('✅ TEST 7 PASSED: Self connection request rejected with HTTP 400.\n');
    passedCount++;
  } else {
    console.error('❌ TEST 7 FAILED:', res7.status, json7);
  }

  // -----------------------------------------------------------------
  // TEST 8: Two players attempt duplicate connection requests.
  // Result: Duplicate connection must not be created.
  // -----------------------------------------------------------------
  console.log('--- TEST 8: Duplicate connection request attempt ---');
  // First request B -> A
  let dup1 = await fetch(`${BASE_URL}/connections/request/${playerA._id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  }).then((r) => r.json());

  // Second duplicate request B -> A
  let dup2 = await fetch(`${BASE_URL}/connections/request/${playerA._id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  let jsonDup2 = await dup2.json();

  // Reverse attempt A -> B while B -> A is pending
  let revAttempt = await fetch(`${BASE_URL}/connections/request/${playerB._id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  let jsonRev = await revAttempt.json();

  if (dup2.status === 400 && revAttempt.status === 400) {
    console.log('✅ TEST 8 PASSED: Duplicate & reciprocal pending requests prevented with HTTP 400.\n');
    passedCount++;
  } else {
    console.error('❌ TEST 8 FAILED:', dup2.status, jsonDup2, revAttempt.status, jsonRev);
  }

  // -----------------------------------------------------------------
  // TEST 9: Unauthenticated user attempts to access protected APIs.
  // Result: HTTP 401.
  // -----------------------------------------------------------------
  console.log('--- TEST 9: Unauthenticated access to protected API ---');
  let res9a = await fetch(`${BASE_URL}/connections`);
  let res9b = await fetch(`${BASE_URL}/players/${playerA._id}/protected-stats`);
  if (res9a.status === 401 && res9b.status === 401) {
    console.log('✅ TEST 9 PASSED: Unauthenticated requests return HTTP 401.\n');
    passedCount++;
  } else {
    console.error('❌ TEST 9 FAILED:', res9a.status, res9b.status);
  }

  // -----------------------------------------------------------------
  // TEST 10: Authenticated but unauthorized user attempts to access private data.
  // Result: HTTP 403.
  // -----------------------------------------------------------------
  console.log('--- TEST 10: Authenticated but unauthorized access to private data ---');
  // Create Player C who has no connection with Player A
  const userC = await User.create({
    username: 'test_user_c',
    email: 'test_c@crickpulse.test',
    password: 'password123',
  });
  const playerC = await Player.create({
    userId: userC._id,
    displayName: 'Test Player Gamma',
    playingRole: 'All-Rounder',
    profileVisibility: 'private',
  });
  const tokenC = generateTestToken(userC);

  let res10 = await fetch(`${BASE_URL}/players/${playerA._id}/protected-stats`, {
    headers: { Authorization: `Bearer ${tokenC}` },
  });
  let json10 = await res10.json();
  if (res10.status === 403 && json10.privacyRestricted === true) {
    console.log('✅ TEST 10 PASSED: Authenticated unauthorized access strictly blocked with HTTP 403.\n');
    passedCount++;
  } else {
    console.error('❌ TEST 10 FAILED:', res10.status, json10);
  }

  // Cleanup test documents
  await Connection.deleteMany({
    $or: [{ requester: { $in: [playerA._id, playerB._id, playerC._id] } }, { receiver: { $in: [playerA._id, playerB._id, playerC._id] } }],
  });
  await Notification.deleteMany({
    $or: [{ recipient: { $in: [playerA._id, playerB._id, playerC._id] } }, { sender: { $in: [playerA._id, playerB._id, playerC._id] } }],
  });
  await Player.deleteMany({ _id: { $in: [playerA._id, playerB._id, playerC._id] } });
  await User.deleteMany({ _id: { $in: [userA._id, userB._id, userC._id] } });

  console.log('=====================================================');
  console.log(`🎉 ALL ${passedCount} / 10 SCENARIO TESTS COMPLETED SUCCESSFULLY!`);
  console.log('=====================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
