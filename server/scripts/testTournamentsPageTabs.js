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
  console.log('🏆 CRICKPULSE TOURNAMENT TABS & INVOLVEMENT TEST');
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

  const timestamp = Date.now();

  // 1. Verify TournamentsPage.jsx file implementation
  const pagePath = path.join(__dirname, '..', '..', 'client', 'src', 'pages', 'TournamentsPage.jsx');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  assert(
    pageContent.includes("activeTab === 'all'") &&
    pageContent.includes("activeTab === 'my'") &&
    pageContent.includes("All Tournaments") &&
    pageContent.includes("My Tournaments"),
    'TournamentsPage.jsx implements primary tabs: All Tournaments and My Tournaments'
  );

  assert(
    pageContent.includes("searchParams.get('tab') === 'my' ? 'my' : 'all'") &&
    pageContent.includes("next.set('tab', 'my')") &&
    pageContent.includes("next.delete('tab')"),
    'TournamentsPage.jsx supports tab=my and tab=all in URL query params'
  );

  assert(
    pageContent.includes("Upcoming Tournaments") &&
    pageContent.includes("Registration Open") &&
    pageContent.includes("Ongoing Tournaments") &&
    pageContent.includes("Completed Tournaments"),
    'All Tournaments tab organizes results into Upcoming, Registration Open, Ongoing, and Completed'
  );

  assert(
    pageContent.includes("Organized by Me") &&
    pageContent.includes("Participating with My Team") &&
    pageContent.includes("Pending Tournament Invitations"),
    'My Tournaments tab organizes into Organized by Me, Participating with My Team, and Pending Invitations'
  );

  assert(
    pageContent.includes("Sign In Required") &&
    pageContent.includes("/login"),
    'My Tournaments tab renders dedicated sign-in prompt for guest users'
  );

  // 2. Register Organizer User
  const orgEmail = `org_${timestamp}@test.com`;
  const orgReg = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `org_${timestamp}`,
      email: orgEmail,
      password: 'Password123!',
    }),
  }).then((r) => r.json());
  const orgToken = orgReg.token;
  const orgHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${orgToken}` };

  await fetch(`${API_BASE}/players/me`, {
    method: 'PUT',
    headers: orgHeaders,
    body: JSON.stringify({ displayName: `Organizer ${timestamp}`, playingRole: 'Batter' }),
  });

  // 3. Register Team Captain User
  const capEmail = `cap_${timestamp}@test.com`;
  const capReg = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `cap_${timestamp}`,
      email: capEmail,
      password: 'Password123!',
    }),
  }).then((r) => r.json());
  const capToken = capReg.token;
  const capHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${capToken}` };

  const capPlayer = await fetch(`${API_BASE}/players/me`, {
    method: 'PUT',
    headers: capHeaders,
    body: JSON.stringify({ displayName: `Captain ${timestamp}`, playingRole: 'All-Rounder' }),
  }).then((r) => r.json());

  // 4. Create Captain's Team
  const teamRes = await fetch(`${API_BASE}/teams`, {
    method: 'POST',
    headers: capHeaders,
    body: JSON.stringify({
      name: `Squad ${timestamp}`,
      city: 'Coimbatore',
      captain: capPlayer.player._id,
    }),
  }).then((r) => r.json());
  const teamId = teamRes.team._id;
  assert(teamId, 'Captain successfully created team');

  // 5. Organizer creates tournament
  const tourneyRes = await fetch(`${API_BASE}/tournaments`, {
    method: 'POST',
    headers: orgHeaders,
    body: JSON.stringify({
      name: `Cup ${timestamp}`,
      city: 'Coimbatore',
      format: 'T20',
      overs: 20,
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      maxTeams: 8,
      location: 'SNR Grounds',
      status: 'registration_open',
    }),
  }).then((r) => r.json());
  const tourneyId = tourneyRes.tournament._id;
  assert(tourneyId, 'Organizer created tournament successfully');

  // 6. Test GET /api/tournaments (Public / Guest Discovery)
  const publicList = await fetch(`${API_BASE}/tournaments`).then((r) => r.json());
  assert(
    publicList.success && publicList.tournaments.some((t) => t._id === tourneyId),
    'Public /tournaments returns discoverable tournaments without authentication'
  );

  // 7. Test Organizer's GET /api/tournaments/my
  const orgMy = await fetch(`${API_BASE}/tournaments/my`, { headers: orgHeaders }).then((r) => r.json());
  assert(
    orgMy.success &&
    orgMy.tournaments.some((t) => t._id === tourneyId && t.isOrganizer === true),
    'Tournament appears under My Tournaments for organizer with isOrganizer=true'
  );

  // 8. Test Captain's GET /api/tournaments/my BEFORE invitation (should NOT appear)
  const capMyBefore = await fetch(`${API_BASE}/tournaments/my`, { headers: capHeaders }).then((r) => r.json());
  assert(
    !capMyBefore.tournaments.some((t) => t._id === tourneyId),
    'Tournament does not appear in captain My Tournaments prior to invitation/acceptance'
  );

  // 9. Send invitation to Captain's team
  const inviteRes = await fetch(`${API_BASE}/tournaments/${tourneyId}/invitations`, {
    method: 'POST',
    headers: orgHeaders,
    body: JSON.stringify({ teamId, message: 'Please join our cup!' }),
  }).then((r) => r.json());
  const inviteId = inviteRes.invitation?._id;
  assert(inviteId, 'Tournament invitation sent successfully');

  // 10. Check Captain's received invitations & verify STILL not in My Tournaments
  const capInvites = await fetch(`${API_BASE}/tournament-invitations/received`, { headers: capHeaders }).then((r) => r.json());
  const pendingMatch = capInvites.invitations?.find((i) => i._id === inviteId && i.status === 'pending');
  assert(pendingMatch, 'Pending tournament invitation received by team captain');

  const capMyPending = await fetch(`${API_BASE}/tournaments/my`, { headers: capHeaders }).then((r) => r.json());
  assert(
    !capMyPending.tournaments.some((t) => t._id === tourneyId),
    'Pending invitation does NOT classify tournament as accepted participating tournament'
  );

  // 11. Captain Accepts Tournament Invitation
  const acceptRes = await fetch(`${API_BASE}/tournament-invitations/${inviteId}/accept`, {
    method: 'PUT',
    headers: capHeaders,
  }).then((r) => r.json());
  assert(acceptRes.success, 'Captain accepted tournament invitation');

  // 12. Test Captain's GET /api/tournaments/my AFTER acceptance
  const capMyAfter = await fetch(`${API_BASE}/tournaments/my`, { headers: capHeaders }).then((r) => r.json());
  const capTourneyMatch = capMyAfter.tournaments?.find((t) => t._id === tourneyId);
  assert(
    capTourneyMatch &&
    capTourneyMatch.isParticipating === true &&
    capTourneyMatch.participatingTeamName === `Squad ${timestamp}`,
    'Accepted tournament appears under Participating with My Team with correct participating team name'
  );

  // 13. Test filters inside My Tournaments (status, format, city)
  const cityFiltered = await fetch(`${API_BASE}/tournaments/my?city=Coimbatore`, { headers: capHeaders }).then((r) => r.json());
  assert(
    cityFiltered.success && cityFiltered.tournaments.some((t) => t._id === tourneyId),
    'Filter by city works inside My Tournaments'
  );

  const wrongCityFiltered = await fetch(`${API_BASE}/tournaments/my?city=Kolkata`, { headers: capHeaders }).then((r) => r.json());
  assert(
    wrongCityFiltered.success && !wrongCityFiltered.tournaments.some((t) => t._id === tourneyId),
    'Non-matching city filter returns 0 tournaments inside My Tournaments'
  );

  // 14. Verify TournamentCard displays team name
  const cardPath = path.join(__dirname, '..', '..', 'client', 'src', 'components', 'TournamentCard.jsx');
  const cardContent = fs.readFileSync(cardPath, 'utf8');
  assert(
    cardContent.includes("teamName") &&
    cardContent.includes("tournament.participatingTeamName") &&
    cardContent.includes("Team:"),
    'TournamentCard.jsx renders participating team name for My Tournaments squad participants'
  );

  console.log('\n=====================================================');
  console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log('=====================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal error running tournament tests:', err);
  process.exit(1);
});
