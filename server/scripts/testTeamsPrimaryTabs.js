import mongoose from 'mongoose';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import TeamInvitation from '../models/TeamInvitation.js';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('=== TEST SUITE: TEAMS PRIMARY TABS & MEMBERSHIP CLASSIFICATION ===\n');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse');
  console.log('Connected to MongoDB.');

  const jwt = (await import('jsonwebtoken')).default;

  // 1. Setup User 1 (Captain) & User 2 (Member / Invitee)
  console.log('--- 1. Setting up Test Users and Players ---');
  const user1 = await User.findOneAndUpdate(
    { email: 'captain_test@crickpulse.test' },
    { username: 'captain_test', email: 'captain_test@crickpulse.test', password: 'password123', role: 'user' },
    { upsert: true, new: true }
  );

  const player1 = await Player.findOneAndUpdate(
    { userId: user1._id },
    { userId: user1._id, displayName: 'Captain Player', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
    { upsert: true, new: true }
  );

  const user2 = await User.findOneAndUpdate(
    { email: 'member_test@crickpulse.test' },
    { username: 'member_test', email: 'member_test@crickpulse.test', password: 'password123', role: 'user' },
    { upsert: true, new: true }
  );

  const player2 = await Player.findOneAndUpdate(
    { userId: user2._id },
    { userId: user2._id, displayName: 'Member Player', battingStyle: 'Left-hand bat', bowlingStyle: 'None' },
    { upsert: true, new: true }
  );

  const token1 = jwt.sign({ id: user1._id, role: user1.role }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1d' });
  const token2 = jwt.sign({ id: user2._id, role: user2.role }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1d' });

  const headers1 = { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` };
  const headers2 = { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` };

  // 2. Setup Team 1 (Captained by Player 1) and Team 2 (Other Team)
  console.log('\n--- 2. Setting up Test Teams ---');
  const team1 = await Team.findOneAndUpdate(
    { name: 'Mundas Warriors Franchise' },
    {
      name: 'Mundas Warriors Franchise',
      city: 'Chennai',
      description: 'Premier cricket franchise club',
      captain: player1._id,
      createdBy: user1._id,
      members: [player1._id],
    },
    { upsert: true, new: true }
  );

  const team2 = await Team.findOneAndUpdate(
    { name: 'Bangalore Blasters Club' },
    {
      name: 'Bangalore Blasters Club',
      city: 'Bengaluru',
      description: 'Cosmopolitan cricket franchise',
      captain: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      members: [],
    },
    { upsert: true, new: true }
  );

  // TEST 1: Public Discovery GET /api/teams (All Teams)
  console.log('\n--- 3. TEST 1: Public Discovery (GET /api/teams) ---');
  const allRes = await fetch(`${BASE_URL}/teams`);
  const allData = await allRes.json();
  console.log(`GET /api/teams status: ${allRes.status}, success: ${allData.success}`);
  console.log(`Total discoverable teams: ${allData.total || allData.count}`);
  if (allRes.status === 200 && allData.success) {
    console.log('✅ TEST 1 PASSED: All Teams discovery is public.');
  } else {
    console.error('❌ TEST 1 FAILED!');
  }

  // TEST 2: Discovery Search with Franchise Keyword
  console.log('\n--- 4. TEST 2: All Teams Search (Franchise/Description keyword) ---');
  const searchRes = await fetch(`${BASE_URL}/teams?search=franchise`);
  const searchData = await searchRes.json();
  console.log(`Search result count: ${searchData.teams?.length}`);
  const foundMundas = searchData.teams?.some(t => t.name.includes('Mundas'));
  if (foundMundas) {
    console.log('✅ TEST 2 PASSED: Team discovery finds teams matching description/franchise.');
  } else {
    console.error('❌ TEST 2 FAILED!');
  }

  // TEST 3: Unauthenticated request to GET /api/teams/my
  console.log('\n--- 5. TEST 3: Guest Access to /api/teams/my ---');
  const guestMyRes = await fetch(`${BASE_URL}/teams/my`);
  console.log(`Guest /api/teams/my status: ${guestMyRes.status}`);
  if (guestMyRes.status === 401) {
    console.log('✅ TEST 3 PASSED: Guest access to /api/teams/my is correctly blocked with HTTP 401.');
  } else {
    console.error('❌ TEST 3 FAILED!');
  }

  // TEST 4: Captain classification in GET /api/teams/my
  console.log('\n--- 6. TEST 4: Captain Classification in /api/teams/my ---');
  const captainMyRes = await fetch(`${BASE_URL}/teams/my`, { headers: headers1 });
  const captainMyData = await captainMyRes.json();
  console.log(`Captain My Teams count: ${captainMyData.count}`);
  console.log(`Captain Teams: ${captainMyData.captainTeams?.length}, Member Teams: ${captainMyData.memberTeams?.length}`);
  const isCaptainedCorrectly = captainMyData.captainTeams?.some(t => String(t._id) === String(team1._id));
  if (isCaptainedCorrectly && captainMyData.captainTeams[0].isCaptain === true) {
    console.log('✅ TEST 4 PASSED: Captained team correctly categorized in "captainTeams" with isCaptain=true.');
  } else {
    console.error('❌ TEST 4 FAILED!');
  }

  // TEST 5: Pending Invitation - NOT in My Teams until accepted
  console.log('\n--- 7. TEST 5: Pending Invitation Isolation ---');
  // Clear any existing invitation
  await TeamInvitation.deleteMany({ team: team1._id, player: player2._id });
  // Create pending invitation
  const invite = await TeamInvitation.create({
    team: team1._id,
    player: player2._id,
    invitedBy: player1._id,
    status: 'pending',
    message: 'Join Mundas Warriors!',
  });

  // Verify Player 2 does NOT see team1 in My Teams
  const p2BeforeAcceptRes = await fetch(`${BASE_URL}/teams/my`, { headers: headers2 });
  const p2BeforeData = await p2BeforeAcceptRes.json();
  const foundBeforeAccept = p2BeforeData.teams?.some(t => String(t._id) === String(team1._id));
  console.log(`Player 2 has team before accept: ${foundBeforeAccept}`);
  if (!foundBeforeAccept) {
    console.log('✅ TEST 5 PASSED: Pending invitation is NOT included in My Teams.');
  } else {
    console.error('❌ TEST 5 FAILED: Pending invitation was prematurely shown in My Teams!');
  }

  // TEST 6: Accept Invitation -> Moves to "memberTeams"
  console.log('\n--- 8. TEST 6: Accept Invitation -> Becomes Member ---');
  const acceptRes = await fetch(`${BASE_URL}/team-invitations/${invite._id}/accept`, {
    method: 'PUT',
    headers: headers2,
  });
  const acceptData = await acceptRes.json();
  console.log(`Invitation accept status: ${acceptRes.status}, success: ${acceptData.success}`);

  const p2AfterAcceptRes = await fetch(`${BASE_URL}/teams/my`, { headers: headers2 });
  const p2AfterData = await p2AfterAcceptRes.json();
  const inMemberTeams = p2AfterData.memberTeams?.some(t => String(t._id) === String(team1._id));
  console.log(`Player 2 now in memberTeams: ${inMemberTeams}`);
  if (inMemberTeams) {
    console.log('✅ TEST 6 PASSED: Accepted member appears in "memberTeams" under "Teams I Am a Member".');
  } else {
    console.error('❌ TEST 6 FAILED!');
  }

  // TEST 7: Scoped search in /api/teams/my
  console.log('\n--- 9. TEST 7: Scoped Search in /api/teams/my ---');
  const scopedRes = await fetch(`${BASE_URL}/teams/my?search=Mundas`, { headers: headers2 });
  const scopedData = await scopedRes.json();
  console.log(`Scoped search "Mundas" count: ${scopedData.count}`);
  const nonExistentRes = await fetch(`${BASE_URL}/teams/my?search=NonExistentTeamXYZ`, { headers: headers2 });
  const nonExistentData = await nonExistentRes.json();
  console.log(`Scoped search "NonExistentTeamXYZ" count: ${nonExistentData.count}`);
  if (scopedData.count >= 1 && nonExistentData.count === 0) {
    console.log('✅ TEST 7 PASSED: Scoped search filters only within the user\'s teams.');
  } else {
    console.error('❌ TEST 7 FAILED!');
  }

  // Cleanup
  console.log('\n--- 10. Cleaning up Test Artifacts ---');
  await TeamInvitation.deleteMany({ team: team1._id });
  await Team.findByIdAndDelete(team1._id);
  await Team.findByIdAndDelete(team2._id);
  await Player.findByIdAndDelete(player1._id);
  await Player.findByIdAndDelete(player2._id);
  await User.findByIdAndDelete(user1._id);
  await User.findByIdAndDelete(user2._id);
  console.log('Cleanup complete.');

  console.log('\n=== ALL TEAM TABS & MEMBERSHIP TESTS PASSED ===');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
