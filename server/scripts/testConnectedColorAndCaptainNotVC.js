import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('=====================================================');
  console.log('🏏 TEST: CONNECTED BOX COLOR & CAPTAIN NOT VICE CAPTAIN');
  console.log('=====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ TEST ${total} PASSED: ${message}`);
      passed++;
    } else {
      console.error(`❌ TEST ${total} FAILED: ${message}`);
      process.exit(1);
    }
  }

  // 1. Verify PlayerSearchCard has distinct color for connected box only
  const playerSearchCardPath = path.join(__dirname, '..', '..', 'client', 'src', 'components', 'PlayerSearchCard.jsx');
  const playerSearchCardContent = fs.readFileSync(playerSearchCardPath, 'utf8');

  assert(
    playerSearchCardContent.includes("player.connectionStatus === 'connected'") &&
    playerSearchCardContent.includes('text-sky-400') &&
    playerSearchCardContent.includes('bg-sky-500/15') &&
    playerSearchCardContent.includes('border-sky-500/40'),
    'PlayerSearchCard.jsx styles connected box with distinct sky blue color'
  );

  // 2. Verify PlayerDetailPage has distinct color for connected box
  const playerDetailPath = path.join(__dirname, '..', '..', 'client', 'src', 'pages', 'PlayerDetailPage.jsx');
  const playerDetailContent = fs.readFileSync(playerDetailPath, 'utf8');

  assert(
    playerDetailContent.includes("connectionStatus === 'connected'") &&
    playerDetailContent.includes('text-sky-400') &&
    playerDetailContent.includes('bg-sky-500/15'),
    'PlayerDetailPage.jsx styles connected badge with matching distinct color'
  );

  // 3. Register user to test backend team leadership constraint
  const timestamp = Date.now();
  const testUserEmail = `creator_${timestamp}@test.com`;
  const regResp = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `creator_${timestamp}`,
      email: testUserEmail,
      password: 'Password123!',
    }),
  });
  const registerData = await regResp.json();
  const token = registerData.token;

  // Retrieve or create player profile for creator
  const playerResp = await fetch(`${API_BASE}/players/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      displayName: `Creator Player ${timestamp}`,
      playingRole: 'All-Rounder',
    }),
  });
  const playerData = await playerResp.json();
  const creatorPlayerId = playerData.player?._id;

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  assert(token && creatorPlayerId, 'Creator registered with valid player ID');

  // 4. Test POST /api/teams rejecting captain as viceCaptain
  const dualResp = await fetch(`${API_BASE}/teams`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `Dual Team ${timestamp}`,
      city: 'Chennai',
      captain: creatorPlayerId,
      viceCaptain: creatorPlayerId,
    }),
  });
  const dualData = await dualResp.json();
  assert(
    dualResp.status === 400 &&
    dualData.message?.includes('The player selected as Captain cannot also be appointed as Vice Captain'),
    'POST /api/teams rejected assigning same player as both Captain and Vice Captain'
  );

  // 5. Create team successfully with only Captain
  const createResp = await fetch(`${API_BASE}/teams`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `Valid Team ${timestamp}`,
      city: 'Chennai',
      captain: creatorPlayerId,
    }),
  });
  const createData = await createResp.json();
  const teamId = createData.team?._id;
  assert(teamId && createData.team.captain, 'Team created successfully with creator as captain');

  // 6. Test PUT /api/teams/:id rejecting setting viceCaptain to current Captain
  const putResp = await fetch(`${API_BASE}/teams/${teamId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      viceCaptain: creatorPlayerId,
    }),
  });
  const putData = await putResp.json();
  assert(
    putResp.status === 400 &&
    putData.message?.includes('The player selected as Captain cannot also be appointed as Vice Captain'),
    'PUT /api/teams/:id returns 400 when attempting to appoint captain as vice captain'
  );

  // 7. Verify TeamDetailPage frontend code prevents appointing captain as vice captain
  const teamDetailPagePath = path.join(__dirname, '..', '..', 'client', 'src', 'pages', 'TeamDetailPage.jsx');
  const teamDetailPageContent = fs.readFileSync(teamDetailPagePath, 'utf8');

  assert(
    teamDetailPageContent.includes("role === 'viceCaptain'") &&
    teamDetailPageContent.includes('The player selected as Captain cannot also be appointed as Vice Captain'),
    'TeamDetailPage.jsx handleAssignLeadership blocks appointing captain as vice captain with error toast'
  );

  assert(
    teamDetailPageContent.includes('!isMemberViceCaptain && !isMemberCaptain') &&
    teamDetailPageContent.includes('Assign ${player.displayName} as Vice Captain'),
    'TeamDetailPage.jsx hides Make VC button for current captain in squad roster'
  );

  assert(
    teamDetailPageContent.includes('isBlockedForViceCaptain') &&
    teamDetailPageContent.includes('Captain (Cannot be VC)'),
    'TeamDetailPage.jsx disables current captain with "Captain (Cannot be VC)" in Leadership Selection Modal'
  );

  // 8. Verify EditTeamPage frontend code enforces the constraint
  const editTeamPath = path.join(__dirname, '..', '..', 'client', 'src', 'pages', 'EditTeamPage.jsx');
  const editTeamContent = fs.readFileSync(editTeamPath, 'utf8');

  assert(
    editTeamContent.includes("name === 'captain' && next.viceCaptain && String(next.viceCaptain) === String(value)") &&
    editTeamContent.includes("next.viceCaptain = ''"),
    'EditTeamPage.jsx automatically clears viceCaptain if the same player is selected as captain'
  );

  assert(
    editTeamContent.includes('The player selected as Captain cannot also be appointed as Vice Captain'),
    'EditTeamPage.jsx handleSubmit prevents form submission if captain and viceCaptain match'
  );

  console.log('\n=====================================================');
  console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log('=====================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err.message);
  process.exit(1);
});
