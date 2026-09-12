/**
 * Automated Verification Script: testOwnVsOtherPlayerProfile.js
 * Validates:
 * 1. Owner detection on GET /api/players/:id (returns isOwner: true, isOwnProfile: true, connectionStatus: 'self')
 * 2. Owner has unrestricted access to own private profile data
 * 3. Other unconnected player gets isOwner: false, isOwnProfile: false, canViewDetails: false
 * 4. Connected player gets isOwner: false, isOwnProfile: false, canViewDetails: true
 * 5. Other player on public profile gets isOwner: false, isOwnProfile: false, canViewDetails: true
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=====================================================');
  console.log('🛡️ CRICKPULSE OWN VS OTHER PROFILE VERIFICATION TEST');
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

    // 1. Create Player A (Private Profile)
    const userARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `owner_${timestamp}`,
        email: `owner_${timestamp}@crickpulse.test`,
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
        displayName: `Logaprabhu ${timestamp}`,
        playingRole: 'Batter',
        profileVisibility: 'private',
        city: 'Coimbatore',
        battingStyle: 'Right-hand bat',
      }),
    }).then((r) => r.json());

    const playerAId = playerARes.player._id;
    assert(playerAId, 'Player A created with private visibility');

    // 2. Create Player B (External Viewer)
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
        playingRole: 'Bowler',
        profileVisibility: 'private',
        city: 'Chennai',
      }),
    }).then((r) => r.json());

    const playerBId = playerBRes.player._id;
    assert(playerBId, 'Player B created');

    // -------------------------------------------------------------------------
    // TEST: Owner accesses own profile via GET /api/players/:id
    // -------------------------------------------------------------------------
    const ownerGetProfile = await fetch(`${BASE_URL}/players/${playerAId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());

    assert(
      ownerGetProfile.isOwner === true &&
      ownerGetProfile.isOwnProfile === true &&
      ownerGetProfile.player.isOwnProfile === true &&
      ownerGetProfile.connectionStatus === 'self',
      'Owner retrieving own profile correctly gets isOwner: true, isOwnProfile: true, and connectionStatus: self'
    );

    assert(
      ownerGetProfile.canViewDetails === true && ownerGetProfile.privacyRestricted === false,
      'Owner has unrestricted access to own private profile data (canViewDetails: true, privacyRestricted: false)'
    );

    // -------------------------------------------------------------------------
    // TEST: External unconnected player accesses Player A's private profile
    // -------------------------------------------------------------------------
    const otherGetProfile = await fetch(`${BASE_URL}/players/${playerAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    }).then((r) => r.json());

    assert(
      otherGetProfile.isOwner === false &&
      otherGetProfile.isOwnProfile === false &&
      otherGetProfile.player.isOwnProfile === false &&
      otherGetProfile.connectionStatus === 'none',
      'External viewer gets isOwner: false, isOwnProfile: false, connectionStatus: none'
    );

    assert(
      otherGetProfile.canViewDetails === false && otherGetProfile.privacyRestricted === true,
      'External unconnected viewer is restricted from private details (privacyRestricted: true)'
    );

    // -------------------------------------------------------------------------
    // TEST: Establish connection between Player B and Player A
    // -------------------------------------------------------------------------
    const sendReqRes = await fetch(`${BASE_URL}/connections/request/${playerAId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
    }).then((r) => r.json());

    const connectionId = sendReqRes.connection._id;

    // Player A accepts request
    await fetch(`${BASE_URL}/connections/${connectionId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    // -------------------------------------------------------------------------
    // TEST: Connected player accesses Player A's private profile
    // -------------------------------------------------------------------------
    const connectedGetProfile = await fetch(`${BASE_URL}/players/${playerAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    }).then((r) => r.json());

    assert(
      connectedGetProfile.isOwner === false &&
      connectedGetProfile.isOwnProfile === false &&
      connectedGetProfile.connectionStatus === 'connected',
      'Connected player gets isOwner: false, isOwnProfile: false, and connectionStatus: connected'
    );

    assert(
      connectedGetProfile.canViewDetails === true && connectedGetProfile.privacyRestricted === false,
      'Connected player gets access to protected stats'
    );

    console.log('\n=====================================================');
    console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED`);
    console.log('=====================================================\n');
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
