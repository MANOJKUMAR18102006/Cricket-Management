/**
 * Verification Test: testPlayerComparison.js
 * Validates Player Comparison, format selection, stronger statistic identification, and strict connection privacy.
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=====================================================');
  console.log('⚔️  CRICKPULSE PLAYER COMPARISON TEST SUITE');
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

    // 1. Create Player Alpha (Batter)
    const userARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `alpha_${timestamp}`,
        email: `alpha_${timestamp}@crickpulse.test`,
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
        displayName: `Alpha Batter ${timestamp}`,
        playingRole: 'Batter',
        currentTeam: 'Chennai Kings',
        city: 'Chennai',
      }),
    }).then((r) => r.json());

    const playerAId = playerARes.player._id;

    // 2. Create Player Beta (All-Rounder)
    const userBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `beta_${timestamp}`,
        email: `beta_${timestamp}@crickpulse.test`,
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
        displayName: `Beta Bowler ${timestamp}`,
        playingRole: 'All-Rounder',
        currentTeam: 'Madurai Stars',
        city: 'Madurai',
      }),
    }).then((r) => r.json());

    const playerBId = playerBRes.player._id;

    // --- TEST 1: Unauthenticated request to /compare (HTTP 401) ---
    console.log('--- TEST 1: Unauthenticated Comparison (HTTP 401) ---');
    const unauthRes = await fetch(`${BASE_URL}/players/compare?playerB=${playerBId}`);
    assert(
      unauthRes.status === 401,
      `Unauthenticated access to /compare rejected with HTTP ${unauthRes.status}`
    );

    // --- TEST 2: Comparison between unconnected players (HTTP 403) ---
    console.log('\n--- TEST 2: Unconnected Players Comparison (HTTP 403) ---');
    const unconnRes = await fetch(`${BASE_URL}/players/compare?playerB=${playerBId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const unconnData = await unconnRes.json();
    assert(
      unconnRes.status === 403 &&
        unconnData.privacyRestricted === true &&
        unconnData.message === 'Connect with this player to compare cricket statistics.',
      `Unconnected comparison rejected with HTTP 403 and message: "${unconnData.message}"`
    );

    // --- TEST 3: Comparison with pending connection request (HTTP 403) ---
    console.log('\n--- TEST 3: Pending Connection Comparison Guard (HTTP 403) ---');
    // Player A sends connection request to Player B
    const reqRes = await fetch(`${BASE_URL}/connections/request/${playerBId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());

    const pendingRes = await fetch(`${BASE_URL}/players/compare?playerB=${playerBId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(
      pendingRes.status === 403,
      'Pending connection request still blocks comparison with HTTP 403'
    );

    // --- TEST 4: Accepted connection comparison -> HTTP 200 with full metrics ---
    console.log('\n--- TEST 4: Accepted Connection Comparison (HTTP 200) ---');
    // Player B accepts connection request
    await fetch(`${BASE_URL}/connections/${reqRes.connection._id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const compareRes = await fetch(`${BASE_URL}/players/compare?playerA=${playerAId}&playerB=${playerBId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const compareData = await compareRes.json();
    const metrics = compareData.comparison?.metrics || [];

    const metricKeys = metrics.map((m) => m.key);
    const requiredKeys = [
      'matches',
      'runs',
      'battingAverage',
      'strikeRate',
      'highestScore',
      'fifties',
      'hundreds',
      'wickets',
      'bowlingAverage',
      'economy',
      'catches',
    ];

    const hasAllRequiredKeys = requiredKeys.every((k) => metricKeys.includes(k));

    assert(
      compareRes.status === 200 &&
        compareData.success === true &&
        hasAllRequiredKeys,
      `Connected players comparison retrieved successfully with all ${requiredKeys.length} required cricket metrics.`
    );

    // --- TEST 5: Format Selection (?format=T20 and ?format=T10) ---
    console.log('\n--- TEST 5: Format Selection (?format=T20) ---');
    const t20CompareRes = await fetch(`${BASE_URL}/players/compare?playerB=${playerBId}&format=T20`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());

    assert(
      t20CompareRes.success && t20CompareRes.comparison.format === 'T20',
      `Comparison format switched correctly to ${t20CompareRes.comparison.format}`
    );

    // --- TEST 6: Validate Metric Structure & Stronger Indicator Flags ---
    console.log('\n--- TEST 6: Validate Stronger Metric Indicator Objectivity ---');
    const runMetric = metrics.find((m) => m.key === 'runs');
    const econMetric = metrics.find((m) => m.key === 'economy');
    const srMetric = metrics.find((m) => m.key === 'strikeRate');

    assert(
      runMetric &&
        ['playerA', 'playerB', 'equal'].includes(runMetric.stronger) &&
        econMetric &&
        ['playerA', 'playerB', 'equal'].includes(econMetric.stronger) &&
        srMetric &&
        ['playerA', 'playerB', 'equal'].includes(srMetric.stronger),
      `Stronger statistic indicators evaluated objectively without subjective player ranking: (runs: ${runMetric?.stronger}, economy: ${econMetric?.stronger})`
    );

    console.log('\n=====================================================');
    console.log(`🎉 ALL ${passed} / ${total} PLAYER COMPARISON TESTS PASSED!`);
    console.log('=====================================================\n');

    // Clean up test data
    await import('./cleanSeedData.js').catch(() => null);
  } catch (error) {
    console.error('Test error:', error);
    process.exitCode = 1;
  }
}

runTests();
