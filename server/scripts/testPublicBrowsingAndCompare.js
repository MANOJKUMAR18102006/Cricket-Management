import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';

import User from '../models/User.js';
import Player from '../models/Player.js';
import Connection from '../models/Connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026';
const PORT = 5000;

function makeRequest({ path, method = 'GET', token = null }) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({ status: res.statusCode, data });
          } catch {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING PUBLIC BROWSING & COMPARE SYSTEM TESTS ---');
  await mongoose.connect('mongodb://localhost:27017/crickpulse');

  try {
    // 1. Setup test users and players
    const testTimestamp = Date.now();
    
    // User A (Viewer / Comparer)
    const userA = await User.create({
      name: `Tester A ${testTimestamp}`,
      username: `tester_a_${testTimestamp}`,
      email: `tester_a_${testTimestamp}@test.com`,
      password: 'password123',
    });
    const playerA = await Player.create({
      userId: userA._id,
      displayName: `Player A ${testTimestamp}`,
      profileVisibility: 'public',
      stats: { matches: 5, runs: 150, wickets: 3 },
    });
    const tokenA = jwt.sign({ id: userA._id, role: userA.role }, JWT_SECRET, { expiresIn: '1h' });

    // Public Player B
    const userB = await User.create({
      name: `Public B ${testTimestamp}`,
      username: `public_b_${testTimestamp}`,
      email: `public_b_${testTimestamp}@test.com`,
      password: 'password123',
    });
    const playerB = await Player.create({
      userId: userB._id,
      displayName: `Public Player B ${testTimestamp}`,
      profileVisibility: 'public',
      stats: { matches: 8, runs: 280, wickets: 7 },
    });

    // Private Player C
    const userC = await User.create({
      name: `Private C ${testTimestamp}`,
      username: `private_c_${testTimestamp}`,
      email: `private_c_${testTimestamp}@test.com`,
      password: 'password123',
    });
    const playerC = await Player.create({
      userId: userC._id,
      displayName: `Private Player C ${testTimestamp}`,
      profileVisibility: 'private',
      stats: { matches: 12, runs: 400, wickets: 15 },
    });

    console.log('Setup complete:');
    console.log(`Player A (User): ${playerA._id}`);
    console.log(`Player B (Public): ${playerB._id}`);
    console.log(`Player C (Private): ${playerC._id}`);

    // TEST 1: Guest accessing public player stats -> should be 200 OK
    const guestPublicStats = await makeRequest({ path: `/api/players/${playerB._id}/stats` });
    console.log(`TEST 1 - Guest accessing Public Player stats: Status ${guestPublicStats.status} (Expected: 200)`);
    if (guestPublicStats.status !== 200 || !guestPublicStats.data.success) {
      throw new Error(`TEST 1 Failed: ${JSON.stringify(guestPublicStats)}`);
    }

    // TEST 2: Guest accessing private player stats -> should be 403 Forbidden with privacyRestricted
    const guestPrivateStats = await makeRequest({ path: `/api/players/${playerC._id}/stats` });
    console.log(`TEST 2 - Guest accessing Private Player stats: Status ${guestPrivateStats.status} (Expected: 403, privacyRestricted: ${guestPrivateStats.data?.privacyRestricted})`);
    if (guestPrivateStats.status !== 403 || !guestPrivateStats.data?.privacyRestricted) {
      throw new Error(`TEST 2 Failed: ${JSON.stringify(guestPrivateStats)}`);
    }

    // TEST 3: Authenticated Player A comparing with Public Player B -> should be 200 OK
    const comparePublic = await makeRequest({
      path: `/api/players/compare?player=${playerB._id}`,
      token: tokenA,
    });
    console.log(`TEST 3 - Compare with Public Player B: Status ${comparePublic.status} (Expected: 200)`);
    if (comparePublic.status !== 200 || !comparePublic.data.success) {
      throw new Error(`TEST 3 Failed: ${JSON.stringify(comparePublic)}`);
    }

    // TEST 4: Authenticated Player A comparing with Private Player C WITHOUT connection -> should be 403 Forbidden with privacyRestricted
    const comparePrivateNoConn = await makeRequest({
      path: `/api/players/compare?player=${playerC._id}`,
      token: tokenA,
    });
    console.log(`TEST 4 - Compare with Private Player C (No Connection): Status ${comparePrivateNoConn.status} (Expected: 403, privacyRestricted: ${comparePrivateNoConn.data?.privacyRestricted})`);
    if (comparePrivateNoConn.status !== 403 || !comparePrivateNoConn.data?.privacyRestricted) {
      throw new Error(`TEST 4 Failed: ${JSON.stringify(comparePrivateNoConn)}`);
    }

    // TEST 5: Create accepted connection between Player A and Private Player C
    const conn = await Connection.create({
      requester: playerA._id,
      receiver: playerC._id,
      status: 'accepted',
    });
    console.log(`Connection established between Player A and Private Player C: ${conn._id}`);

    // TEST 6: Authenticated Player A comparing with Private Player C WITH accepted connection -> should be 200 OK
    const comparePrivateWithConn = await makeRequest({
      path: `/api/players/compare?player=${playerC._id}`,
      token: tokenA,
    });
    console.log(`TEST 6 - Compare with Private Player C (With Connection): Status ${comparePrivateWithConn.status} (Expected: 200)`);
    if (comparePrivateWithConn.status !== 200 || !comparePrivateWithConn.data.success) {
      throw new Error(`TEST 6 Failed: ${JSON.stringify(comparePrivateWithConn)}`);
    }

    // TEST 7: Authenticated Player A accessing Private Player C stats WITH accepted connection -> should be 200 OK
    const playerAStatsPrivateC = await makeRequest({
      path: `/api/players/${playerC._id}/stats`,
      token: tokenA,
    });
    console.log(`TEST 7 - Access Private Player C stats with Connection: Status ${playerAStatsPrivateC.status} (Expected: 200)`);
    if (playerAStatsPrivateC.status !== 200 || !playerAStatsPrivateC.data.success) {
      throw new Error(`TEST 7 Failed: ${JSON.stringify(playerAStatsPrivateC)}`);
    }

    // Clean up test records
    await Connection.deleteMany({ _id: conn._id });
    await Player.deleteMany({ _id: { $in: [playerA._id, playerB._id, playerC._id] } });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id, userC._id] } });
    console.log('--- ALL PUBLIC BROWSING & COMPARE TESTS PASSED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('Test run error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
