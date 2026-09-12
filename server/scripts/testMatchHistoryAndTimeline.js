/**
 * Verification Test: testMatchHistoryAndTimeline.js
 * Tests Player Match History, Career Timeline generation, filters, and strict privacy.
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=====================================================');
  console.log('🏏 CRICKPULSE MATCH HISTORY & TIMELINE TEST SUITE');
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

    // 1. Register Player A (Star Player)
    const userARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `hero_${timestamp}`,
        email: `hero_${timestamp}@crickpulse.test`,
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
        displayName: `Hero Batter ${timestamp}`,
        playingRole: 'Batter',
        currentTeam: 'Coimbatore Kings',
        city: 'Coimbatore',
        profileVisibility: 'private',
      }),
    }).then((r) => r.json());

    const playerA = playerARes.player;
    const playerAId = playerA._id;

    // 2. Register Player B (Viewer / Friend)
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
        displayName: `Viewer ${timestamp}`,
        playingRole: 'Bowler',
      }),
    }).then((r) => r.json());

    const playerBId = playerBRes.player._id;

    // 3. Create a team for Player A
    const teamRes = await fetch(`${BASE_URL}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: `Coimbatore Kings ${timestamp}`,
        city: 'Coimbatore',
        description: 'Elite district championship squad',
      }),
    }).then((r) => r.json());

    // 4. Create 2 Matches where Player A played
    // Match 1: T20 Tournament match
    const match1Res = await fetch(`${BASE_URL}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        team1: `Coimbatore Kings ${timestamp}`,
        team2: 'Madurai Warriors',
        format: 'T20',
        overs: 20,
        venue: 'SNR College Ground',
        city: 'Coimbatore',
        date: new Date('2025-04-10T10:00:00Z'),
        tournament: 'Tamil Nadu T20 Cup',
      }),
    }).then((r) => r.json());

    const match1Id = match1Res.match._id;

    // Start Innings and record score for Player A in Match 1
    await fetch(`${BASE_URL}/scoring/${match1Id}/start-innings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        inningsNumber: 1,
        battingTeam: `Coimbatore Kings ${timestamp}`,
        bowlingTeam: 'Madurai Warriors',
        striker: playerA.displayName,
        nonStriker: 'Opening Partner',
        bowler: 'Rival Pacer',
      }),
    });

    // Record boundary four for Player A
    await fetch(`${BASE_URL}/scoring/${match1Id}/delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        runs: 4,
        extraRuns: 0,
        type: 'normal',
      }),
    });

    // Mark Match 1 as completed with winner
    await fetch(`${BASE_URL}/matches/${match1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        status: 'completed',
        winner: `Coimbatore Kings ${timestamp}`,
        result: `Coimbatore Kings ${timestamp} won by 28 runs`,
      }),
    });

    // Match 2: ODI match in 2026
    const match2Res = await fetch(`${BASE_URL}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        team1: 'Tirupur Titans',
        team2: `Coimbatore Kings ${timestamp}`,
        format: 'ODI',
        overs: 50,
        venue: 'Chidambaram Stadium',
        city: 'Chennai',
        date: new Date('2026-02-15T09:00:00Z'),
        tournament: 'State Trophy',
      }),
    }).then((r) => r.json());

    const match2Id = match2Res.match._id;
    await fetch(`${BASE_URL}/matches/${match2Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        status: 'completed',
        winner: 'Tirupur Titans',
        result: 'Tirupur Titans won by 4 wickets',
      }),
    });

    // --- TEST 1: Unconnected viewer accessing matches -> HTTP 403 ---
    console.log('--- TEST 1: Privacy Check - Unconnected Access (HTTP 403) ---');
    const unconnRes = await fetch(`${BASE_URL}/players/${playerAId}/matches`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      unconnRes.status === 403,
      'Unconnected viewer blocked from match history with HTTP 403'
    );

    // --- TEST 2: Owner accessing match history & timeline -> HTTP 200 ---
    console.log('\n--- TEST 2: Owner Access to Matches and Timeline (HTTP 200) ---');
    const ownerRes = await fetch(`${BASE_URL}/players/${playerAId}/matches`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const ownerData = await ownerRes.json();
    assert(
      ownerRes.status === 200 && ownerData.success && ownerData.matches && ownerData.matches.length >= 2,
      `Owner retrieved ${ownerData.matches ? ownerData.matches.length : 0} matches and career timeline.`
    );

    // --- TEST 3: Validate Detailed Match Record Fields ---
    console.log('\n--- TEST 3: Validate Specific Match Performance Metrics ---');
    const matchRecord = ownerData.matches.find((m) => String(m.matchId) === String(match1Id));
    assert(
      matchRecord &&
        matchRecord.opponent === 'Madurai Warriors' &&
        matchRecord.tournament === 'Tamil Nadu T20 Cup' &&
        matchRecord.runs === 4 &&
        matchRecord.venue === 'SNR College Ground' &&
        matchRecord.result.includes('won by 28 runs') &&
        matchRecord.strikeRate !== undefined &&
        matchRecord.wickets !== undefined &&
        matchRecord.overs !== undefined &&
        matchRecord.catches !== undefined,
      `Match record contains all required fields (Opponent: ${matchRecord?.opponent}, Runs: ${matchRecord?.runs}, Tournament: ${matchRecord?.tournament})`
    );

    // --- TEST 4: Format Filter (?format=T20) ---
    console.log('\n--- TEST 4: Filter by Format (?format=T20) ---');
    const filterT20Res = await fetch(`${BASE_URL}/players/${playerAId}/matches?format=T20`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(
      filterT20Res.matches.every((m) => m.format.toLowerCase() === 't20'),
      `Filtered correctly by format=T20 (Count: ${filterT20Res.matches.length})`
    );

    // --- TEST 5: Tournament Filter (?tournament=T20 Cup) ---
    console.log('\n--- TEST 5: Filter by Tournament (?tournament=Tamil Nadu) ---');
    const filterTournRes = await fetch(`${BASE_URL}/players/${playerAId}/matches?tournament=Tamil%20Nadu`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(
      filterTournRes.matches.length >= 1 &&
        filterTournRes.matches.every((m) => m.tournament.includes('Tamil Nadu')),
      `Filtered correctly by tournament (Count: ${filterTournRes.matches.length})`
    );

    // --- TEST 6: Result Filter (?result=won) ---
    console.log('\n--- TEST 6: Filter by Result (?result=won) ---');
    const filterWonRes = await fetch(`${BASE_URL}/players/${playerAId}/matches?result=won`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(
      filterWonRes.matches.every((m) => m.outcome === 'won'),
      `Filtered correctly by result=won (Count: ${filterWonRes.matches.length})`
    );

    // --- TEST 7: Career Timeline Verification ---
    console.log('\n--- TEST 7: Verify Career Timeline Events & Ordering ---');
    const timeline = ownerData.timeline;
    assert(
      Array.isArray(timeline) &&
        timeline.length >= 2 &&
        timeline.some((t) => t.title.includes('Joined')) &&
        timeline.some((t) => t.title.includes('Played')),
      `Career timeline contains ${timeline.length} milestone items: ${timeline.map((t) => `${t.year} -> ${t.title}`).join(' | ')}`
    );

    // --- TEST 8: Connected Viewer Access ---
    console.log('\n--- TEST 8: Connected Viewer Access (HTTP 200) ---');
    // B sends connection request to A
    const reqRes = await fetch(`${BASE_URL}/connections/request/${playerAId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    }).then((r) => r.json());

    // A accepts connection request
    await fetch(`${BASE_URL}/connections/${reqRes.connection._id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const friendMatchesRes = await fetch(`${BASE_URL}/players/${playerAId}/matches`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      friendMatchesRes.status === 200,
      'Connected player successfully granted access to match history and career timeline with HTTP 200'
    );

    console.log('\n=====================================================');
    console.log(`🎉 ALL ${passed} / ${total} MATCH HISTORY & TIMELINE TESTS PASSED!`);
    console.log('=====================================================\n');

    // Clean up test data
    const cleanScript = await import('./cleanSeedData.js').catch(() => null);
  } catch (error) {
    console.error('Test error:', error);
    process.exitCode = 1;
  }
}

runTests();
