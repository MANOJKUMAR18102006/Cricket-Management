import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000/api';

console.log('=====================================================');
console.log('👑 CRICKPULSE TEAM CREATOR LEADERSHIP ACCESS TEST');
console.log('=====================================================\n');

let total = 0;
let passed = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`✅ TEST ${total} PASSED: ${message}`);
    passed++;
  } else {
    console.error(`❌ TEST ${total} FAILED: ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  try {
    const timestamp = Date.now();

    // 1. Register Team Creator
    const creatorRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `teamcreator_${timestamp}`,
        email: `creator_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    }).then((r) => r.json());

    const creatorToken = creatorRes.token;
    assert(creatorToken, 'Team creator registered successfully');

    // Create player profile for Creator
    await fetch(`${BASE_URL}/players/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creatorToken}`,
      },
      body: JSON.stringify({
        displayName: `Creator Player ${timestamp}`,
        playingRole: 'All-Rounder',
      }),
    });

    // 2. Register Player 2 (Squad Member)
    const member1Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `member1_${timestamp}`,
        email: `member1_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    }).then((r) => r.json());

    const member1Token = member1Res.token;
    const member1PlayerRes = await fetch(`${BASE_URL}/players/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${member1Token}`,
      },
      body: JSON.stringify({
        displayName: `Member 1 ${timestamp}`,
        playingRole: 'Batter',
      }),
    }).then((r) => r.json());

    const member1PlayerId = member1PlayerRes.player._id;

    // 3. Register Player 3 (Squad Member)
    const member2Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `member2_${timestamp}`,
        email: `member2_${timestamp}@test.com`,
        password: 'Password123!',
      }),
    }).then((r) => r.json());

    const member2Token = member2Res.token;
    const member2PlayerRes = await fetch(`${BASE_URL}/players/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${member2Token}`,
      },
      body: JSON.stringify({
        displayName: `Member 2 ${timestamp}`,
        playingRole: 'Bowler',
      }),
    }).then((r) => r.json());

    const member2PlayerId = member2PlayerRes.player._id;

    // 4. Creator creates a Team
    const teamRes = await fetch(`${BASE_URL}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creatorToken}`,
      },
      body: JSON.stringify({
        name: `Lions XI ${timestamp}`,
        city: 'Coimbatore',
        description: 'Elite squad',
      }),
    }).then((r) => r.json());

    const teamId = teamRes.team._id;
    assert(teamId, 'Creator successfully created team');

    // 5. Add members to squad
    await fetch(`${BASE_URL}/teams/${teamId}/members/${member1PlayerId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}` },
    });

    await fetch(`${BASE_URL}/teams/${teamId}/members/${member2PlayerId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creatorToken}` },
    });

    // 6. Creator chooses Member 1 as Captain and Member 2 as Vice Captain
    const updateLeadershipRes = await fetch(`${BASE_URL}/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creatorToken}`,
      },
      body: JSON.stringify({
        captain: member1PlayerId,
        viceCaptain: member2PlayerId,
      }),
    }).then((r) => r.json());

    assert(
      updateLeadershipRes.success &&
      String(updateLeadershipRes.team.captain._id || updateLeadershipRes.team.captain) === String(member1PlayerId) &&
      String(updateLeadershipRes.team.viceCaptain._id || updateLeadershipRes.team.viceCaptain) === String(member2PlayerId),
      'Team creator successfully chose Captain and Vice Captain via PUT /api/teams/:id'
    );

    // 7. Verify unassigned/random user cannot choose leadership
    const unauthUpdateRes = await fetch(`${BASE_URL}/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${member2Token}`,
      },
      body: JSON.stringify({
        captain: member2PlayerId,
      }),
    });

    assert(
      unauthUpdateRes.status === 403,
      'Non-creator / unauthorized member is denied (403 Forbidden) from modifying team leadership'
    );

    // 8. Verify frontend components contain leadership access for creator
    const clientDir = path.resolve(__dirname, '../../client/src');
    const teamDetailContent = fs.readFileSync(path.join(clientDir, 'pages/TeamDetailPage.jsx'), 'utf-8');

    assert(
      teamDetailContent.includes('const canManageLeadership = Boolean(isCreator || isAdmin);') &&
      teamDetailContent.includes('handleAssignLeadership'),
      'TeamDetailPage grants leadership assignment privileges specifically to team creator'
    );

    assert(
      teamDetailContent.includes('setLeadershipModal({ role: \'captain\', title: \'Choose Team Captain\' })') &&
      teamDetailContent.includes('setLeadershipModal({ role: \'viceCaptain\', title: \'Choose Team Vice Captain\' })'),
      'TeamDetailPage provides dedicated Choose/Change Captain and Vice Captain controls on leadership cards'
    );

    assert(
      teamDetailContent.includes('Make Captain') &&
      teamDetailContent.includes('Make VC'),
      'TeamDetailPage provides quick single-click leadership assignment buttons in squad roster'
    );

    assert(
      teamDetailContent.includes('leadershipModal') &&
      teamDetailContent.includes('Unassign Current'),
      'TeamDetailPage includes full interactive leadership selection modal with unassign capability'
    );

    console.log('\n=====================================================');
    console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED`);
    console.log('=====================================================\n');

    if (passed !== total) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runTests();
