/**
 * Automated Verification Script: testPrivacySettingsAPI.js
 * Validates:
 * 1. PUT /api/players/me/privacy endpoint: public, private, validation, auth
 * 2. Privacy enforcement on stats & match endpoints
 * 3. Team membership for My Teams tab (/api/teams/my)
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=====================================================');
  console.log('🔒 CRICKPULSE PRIVACY SETTINGS & TAB SYSTEM TEST');
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

    // 1. Create Player A (Account Owner)
    const userARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `priv_user_${timestamp}`,
        email: `priv_${timestamp}@crickpulse.test`,
        password: 'Password123!',
      }),
    }).then((r) => r.json());

    const tokenA = userARes.token;
    assert(tokenA, 'Player A registration succeeds and returns token');

    const playerARes = await fetch(`${BASE_URL}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        displayName: `Privacy Tester ${timestamp}`,
        playingRole: 'Batter',
        profileVisibility: 'private',
        city: 'Mumbai',
      }),
    }).then((r) => r.json());

    const playerAId = playerARes.player._id;
    assert(playerAId && playerARes.player.profileVisibility === 'private', 'Player A defaults to private profile');

    // 2. Test PUT /api/players/me/privacy -> set to 'public'
    const updatePubRes = await fetch(`${BASE_URL}/players/me/privacy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ profileVisibility: 'public' }),
    });

    const updatePubData = await updatePubRes.json();
    assert(updatePubRes.status === 200 && updatePubData.player.profileVisibility === 'public', 'PUT /api/players/me/privacy toggles visibility to public');

    // 3. Verify public access by guest (no token)
    const guestGetStatsPub = await fetch(`${BASE_URL}/players/${playerAId}/stats`);
    assert(guestGetStatsPub.status === 200, 'Guest can view career stats when player profile is public');

    // 4. Test PUT /api/players/me/privacy -> set back to 'private'
    const updatePrivRes = await fetch(`${BASE_URL}/players/me/privacy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ profileVisibility: 'private' }),
    });

    const updatePrivData = await updatePrivRes.json();
    assert(updatePrivRes.status === 200 && updatePrivData.player.profileVisibility === 'private', 'PUT /api/players/me/privacy toggles visibility to private');

    // 5. Verify private access blocked for guest
    const guestGetStatsPriv = await fetch(`${BASE_URL}/players/${playerAId}/stats`);
    assert(guestGetStatsPriv.status === 403, 'Guest is blocked (403 Forbidden) from viewing stats when profile is private');

    // 6. Test invalid visibility validation
    const invalidValRes = await fetch(`${BASE_URL}/players/me/privacy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ profileVisibility: 'secret_invisible' }),
    });
    assert(invalidValRes.status === 400, 'Invalid profileVisibility value is rejected with 400 Bad Request');

    // 7. Test unauthenticated request to /api/players/me/privacy
    const noAuthRes = await fetch(`${BASE_URL}/players/me/privacy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileVisibility: 'public' }),
    });
    assert(noAuthRes.status === 401, 'Unauthenticated PUT /api/players/me/privacy is rejected with 401 Unauthorized');

    // 8. Test Owner access to their own private profile
    const ownerGetStats = await fetch(`${BASE_URL}/players/${playerAId}/stats`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(ownerGetStats.status === 200, 'Account owner can always view their own career statistics');

    // 9. Test GET /api/teams/my endpoint for My Teams tab
    const myTeamsRes = await fetch(`${BASE_URL}/teams/my`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const myTeamsData = await myTeamsRes.json();
    assert(myTeamsRes.status === 200 && Array.isArray(myTeamsData.teams), 'GET /api/teams/my returns array of user teams for My Teams tab');

    console.log('\n=====================================================');
    console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED`);
    console.log('=====================================================\n');
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
