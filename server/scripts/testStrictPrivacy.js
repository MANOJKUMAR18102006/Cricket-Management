/**
 * Automated Verification Script: testStrictPrivacy.js
 * Validates strict backend connection privacy for Player Career Statistics and Match History.
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=====================================================');
  console.log('🔒 CRICKPULSE STRICT PRIVACY & CONNECTION TEST SUITE');
  console.log('=====================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (condition, message) => {
    total++;
    if (condition) {
      console.log(`✅ TEST ${total} PASSED: ${message}`);
      passed++;
    } else {
      console.error(`❌ TEST ${total} FAILED: ${message}`);
      process.exitCode = 1;
    }
  };

  try {
    const timestamp = Date.now();

    // 1. Create Player A (Target player)
    const userARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `target_${timestamp}`,
        email: `target_${timestamp}@crickpulse.test`,
        password: 'Password123!',
      }),
    }).then((r) => r.json());

    const tokenA = userARes.token;
    const playerARes = await fetch(`${BASE_URL}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        displayName: `Target Star ${timestamp}`,
        playingRole: 'Batter',
        profileVisibility: 'private',
        battingStyle: 'Right-hand bat',
      }),
    }).then((r) => r.json());

    const playerAId = playerARes.player._id;

    // 2. Create Player B (Unconnected viewer)
    const userBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `viewer_${timestamp}`,
        email: `viewer_${timestamp}@crickpulse.test`,
        password: 'Password123!',
      }),
    }).then((r) => r.json());

    const tokenB = userBRes.token;
    const playerBRes = await fetch(`${BASE_URL}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        displayName: `Viewer Player ${timestamp}`,
        playingRole: 'All-Rounder',
        profileVisibility: 'private',
      }),
    }).then((r) => r.json());

    const playerBId = playerBRes.player._id;

    // TEST 1: Unauthenticated request to GET /api/players/:id/stats
    console.log('--- TEST 1: Unauthenticated Access to /stats (HTTP 401) ---');
    const unauthStatsRes = await fetch(`${BASE_URL}/players/${playerAId}/stats`);
    assert(
      unauthStatsRes.status === 401,
      `Unauthenticated access to stats rejected with HTTP ${unauthStatsRes.status}`
    );

    // TEST 2: Unauthenticated request to GET /api/players/:id/matches
    console.log('\n--- TEST 2: Unauthenticated Access to /matches (HTTP 401) ---');
    const unauthMatchesRes = await fetch(`${BASE_URL}/players/${playerAId}/matches`);
    assert(
      unauthMatchesRes.status === 401,
      `Unauthenticated access to matches rejected with HTTP ${unauthMatchesRes.status}`
    );

    // TEST 3: Unconnected viewer accessing Player A's stats -> 403 Forbidden
    console.log('\n--- TEST 3: Unconnected Viewer Access to /stats (HTTP 403) ---');
    const unconnectedStatsRes = await fetch(`${BASE_URL}/players/${playerAId}/stats`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const unconnectedStatsData = await unconnectedStatsRes.json();
    assert(
      unconnectedStatsRes.status === 403 && unconnectedStatsData.privacyRestricted === true,
      `Unconnected viewer blocked from stats with HTTP 403 and privacyRestricted: true`
    );

    // TEST 4: Unconnected viewer accessing Player A's matches -> 403 Forbidden
    console.log('\n--- TEST 4: Unconnected Viewer Access to /matches (HTTP 403) ---');
    const unconnectedMatchesRes = await fetch(`${BASE_URL}/players/${playerAId}/matches`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const unconnectedMatchesData = await unconnectedMatchesRes.json();
    assert(
      unconnectedMatchesRes.status === 403 && unconnectedMatchesData.privacyRestricted === true,
      `Unconnected viewer blocked from matches with HTTP 403 and privacyRestricted: true`
    );

    // TEST 5: Pending connection request viewer -> Still 403 Forbidden
    console.log('\n--- TEST 5: Pending Connection Access Guard (HTTP 403) ---');
    // Player B sends request to Player A
    const sendReqRes = await fetch(`${BASE_URL}/connections/request/${playerAId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
    }).then((r) => r.json());

    const pendingStatsRes = await fetch(`${BASE_URL}/players/${playerAId}/stats`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      pendingStatsRes.status === 403,
      `Pending connection request viewer is still blocked with HTTP 403`
    );

    // TEST 6: Accepted connection viewer accessing stats -> HTTP 200
    console.log('\n--- TEST 6: Accepted Connection Access to /stats (HTTP 200) ---');
    // Player A accepts the connection request
    const connectionId = sendReqRes.connection._id;
    await fetch(`${BASE_URL}/connections/${connectionId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const connectedStatsRes = await fetch(`${BASE_URL}/players/${playerAId}/stats`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const connectedStatsData = await connectedStatsRes.json();
    assert(
      connectedStatsRes.status === 200 && connectedStatsData.success === true && connectedStatsData.stats !== undefined,
      `Connected viewer granted access to career statistics with HTTP 200`
    );

    // TEST 7: Accepted connection viewer accessing matches -> HTTP 200
    console.log('\n--- TEST 7: Accepted Connection Access to /matches (HTTP 200) ---');
    const connectedMatchesRes = await fetch(`${BASE_URL}/players/${playerAId}/matches`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const connectedMatchesData = await connectedMatchesRes.json();
    assert(
      connectedMatchesRes.status === 200 && connectedMatchesData.success === true && Array.isArray(connectedMatchesData.matches),
      `Connected viewer granted access to match history with HTTP 200`
    );

    // TEST 8: Account owner viewing their own stats & matches -> HTTP 200
    console.log('\n--- TEST 8: Account Owner Access to Own Stats & Matches (HTTP 200) ---');
    const ownerStatsRes = await fetch(`${BASE_URL}/players/${playerAId}/stats`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const ownerMatchesRes = await fetch(`${BASE_URL}/players/${playerAId}/matches`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(
      ownerStatsRes.status === 200 && ownerMatchesRes.status === 200,
      `Account owner can view their own statistics and match history directly with HTTP 200`
    );

    console.log('\n=====================================================');
    console.log(`🎉 ALL ${passed} / ${total} STRICT PRIVACY TESTS PASSED!`);
    console.log('=====================================================\n');
  } catch (error) {
    console.error('Test suite error:', error);
    process.exitCode = 1;
  }
}

runTests();
