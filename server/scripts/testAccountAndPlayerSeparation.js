/**
 * Automated Verification Script: testAccountAndPlayerSeparation.js
 * Validates:
 * 1. Account Profile updates via PUT /api/auth/me (username, email)
 * 2. Uniqueness validation for username and email (rejects duplicates with 400)
 * 3. Change password via PUT /api/auth/change-password with current password validation
 * 4. Verification that new password works for login and old password fails
 * 5. Player Profile updates via PUT /api/players/me (cricket attributes only)
 * 6. Protection of calculated statistics and isolation from privacy settings
 * 7. Backend authorization and ownership enforcement
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=====================================================');
  console.log('🏏 CRICKPULSE ACCOUNT & PLAYER PROFILE SEPARATION TEST');
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

    // -------------------------------------------------------------------------
    // 1. REGISTER USER 1 & USER 2
    // -------------------------------------------------------------------------
    const user1Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `cricketer_${timestamp}`,
        email: `cricketer_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    }).then((r) => r.json());

    const token1 = user1Res.token;
    assert(token1, 'User 1 registered and received JWT token');

    const user2Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `rival_${timestamp}`,
        email: `rival_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    }).then((r) => r.json());

    const token2 = user2Res.token;
    assert(token2, 'User 2 registered and received JWT token');

    // -------------------------------------------------------------------------
    // 2. UPDATE ACCOUNT INFO (PUT /api/auth/me)
    // -------------------------------------------------------------------------
    const updatedUsername = `star_${timestamp}`;
    const updatedEmail = `star_${timestamp}@test.com`;

    const updateAccountRes = await fetch(`${BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        username: updatedUsername,
        email: updatedEmail,
      }),
    });

    const updateAccountData = await updateAccountRes.json();
    assert(
      updateAccountRes.status === 200 &&
      updateAccountData.user.username === updatedUsername &&
      updateAccountData.user.email === updatedEmail,
      'PUT /api/auth/me successfully updates username and email'
    );

    // Verify persistence via GET /api/auth/me
    const getMeRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` },
    }).then((r) => r.json());

    assert(
      getMeRes.user.username === updatedUsername && getMeRes.user.email === updatedEmail,
      'GET /api/auth/me confirms persistence of updated account credentials'
    );

    // -------------------------------------------------------------------------
    // 3. DUPLICATE ACCOUNT VALIDATION (User 2 tries to take User 1's username/email)
    // -------------------------------------------------------------------------
    const duplicateUsernameRes = await fetch(`${BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({
        username: updatedUsername, // User 1's username
      }),
    });
    assert(
      duplicateUsernameRes.status === 400,
      'Duplicate username is rejected with 400 Bad Request'
    );

    const duplicateEmailRes = await fetch(`${BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({
        email: updatedEmail, // User 1's email
      }),
    });
    assert(
      duplicateEmailRes.status === 400,
      'Duplicate email is rejected with 400 Bad Request'
    );

    // -------------------------------------------------------------------------
    // 4. PASSWORD CHANGE (PUT /api/auth/change-password)
    // -------------------------------------------------------------------------
    // A. Incorrect current password
    const wrongPassRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword999!',
        newPassword: 'BrandNewPassword123!',
      }),
    });
    assert(
      wrongPassRes.status === 401,
      'Incorrect current password returns 401 Unauthorized'
    );

    // B. Correct password change
    const validPassRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        currentPassword: 'Password123!',
        newPassword: 'BrandNewPassword123!',
      }),
    });
    assert(
      validPassRes.status === 200,
      'PUT /api/auth/change-password succeeds with valid current password'
    );

    // C. Verify login with NEW password
    const loginNewRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: updatedEmail,
        password: 'BrandNewPassword123!',
      }),
    });
    assert(
      loginNewRes.status === 200,
      'Login succeeds using new changed password'
    );

    // D. Verify login with OLD password fails
    const loginOldRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: updatedEmail,
        password: 'Password123!',
      }),
    });
    assert(
      loginOldRes.status === 401,
      'Login fails (401) using superseded old password'
    );

    // -------------------------------------------------------------------------
    // 5. PLAYER PROFILE UPDATE (PUT /api/players/me)
    // -------------------------------------------------------------------------
    // First create or initialize player profile for user 1
    const createPlayerRes = await fetch(`${BASE_URL}/players/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        displayName: 'Manoj Kumar',
        playingRole: 'All-Rounder',
        battingStyle: 'Left-hand bat',
        bowlingStyle: 'Right-arm medium',
        city: 'Coimbatore',
        jerseyNumber: 18,
        bio: 'Top order batsman and medium pacer.',
        // Attempting to modify calculated statistics or account fields:
        runs: 99999,
        wickets: 500,
        username: 'hacked_username',
        profileVisibility: 'public', // Should NOT be modified by PUT /api/players/me
      }),
    });

    const playerUpdateData = await createPlayerRes.json();
    assert(
      createPlayerRes.status === 200 &&
      playerUpdateData.player.displayName === 'Manoj Kumar' &&
      playerUpdateData.player.playingRole === 'All-Rounder' &&
      playerUpdateData.player.battingStyle === 'Left-hand bat' &&
      playerUpdateData.player.city === 'Coimbatore' &&
      playerUpdateData.player.jerseyNumber === 18,
      'PUT /api/players/me updates cricket-specific attributes'
    );

    // Verify calculated statistics were NOT injected and privacy is unchanged
    assert(
      playerUpdateData.player.runs === undefined &&
      playerUpdateData.player.wickets === undefined,
      'PUT /api/players/me cannot inject or modify calculated match statistics'
    );

    assert(
      playerUpdateData.player.profileVisibility === 'private',
      'PUT /api/players/me cannot modify privacy & visibility settings (remains private)'
    );

    // Verify GET /api/players/me returns cricket profile
    const getPlayerRes = await fetch(`${BASE_URL}/players/me`, {
      headers: { Authorization: `Bearer ${token1}` },
    }).then((r) => r.json());

    assert(
      getPlayerRes.player.displayName === 'Manoj Kumar' &&
      getPlayerRes.player.playingRole === 'All-Rounder',
      'GET /api/players/me verifies persistence of cricket identity'
    );

    // -------------------------------------------------------------------------
    // 6. BACKEND AUTHORIZATION & UNAUTHORIZED REQUESTS
    // -------------------------------------------------------------------------
    const noAuthAccountRes = await fetch(`${BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'should_fail' }),
    });
    assert(
      noAuthAccountRes.status === 401,
      'Unauthenticated PUT /api/auth/me is blocked with 401 Unauthorized'
    );

    const noAuthPlayerRes = await fetch(`${BASE_URL}/players/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'should_fail' }),
    });
    assert(
      noAuthPlayerRes.status === 401,
      'Unauthenticated PUT /api/players/me is blocked with 401 Unauthorized'
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
