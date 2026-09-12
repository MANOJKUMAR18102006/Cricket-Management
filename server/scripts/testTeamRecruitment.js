import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import TeamInvitation from '../models/TeamInvitation.js';
import Notification from '../models/Notification.js';
import Connection from '../models/Connection.js';
import {
  sendTeamInvitation,
  getReceivedInvitations,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
  getTeamInvitations,
} from '../controllers/teamInvitationController.js';
import { createTeam, getMyTeams } from '../controllers/teamController.js';
import { getPlayerForUser } from '../services/privacyService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';

// Helper mock response
const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
  return res;
};

async function runRecruitmentTests() {
  console.log('=== Starting Team Recruitment & Player Invitation Verification Suite ===');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const createdUserIds = [];
  const createdPlayerIds = [];
  const createdTeamIds = [];

  try {
    const timestamp = Date.now();

    // Setup Test Users
    const captainUser = await User.create({
      username: `captain_${timestamp}`,
      email: `captain_${timestamp}@test.com`,
      password: 'password123',
      role: 'player',
      city: 'Coimbatore',
    });
    createdUserIds.push(captainUser._id);

    const playerBUser = await User.create({
      username: `playerB_${timestamp}`,
      email: `playerB_${timestamp}@test.com`,
      password: 'password123',
      role: 'player',
      city: 'Coimbatore',
    });
    createdUserIds.push(playerBUser._id);

    const playerCUser = await User.create({
      username: `playerC_${timestamp}`,
      email: `playerC_${timestamp}@test.com`,
      password: 'password123',
      role: 'player',
      city: 'Chennai',
    });
    createdUserIds.push(playerCUser._id);

    const playerDUser = await User.create({
      username: `playerD_${timestamp}`,
      email: `playerD_${timestamp}@test.com`,
      password: 'password123',
      role: 'player',
      city: 'Bengaluru',
    });
    createdUserIds.push(playerDUser._id);

    // Resolve Player profiles for all users
    const captainPlayer = await getPlayerForUser(captainUser);
    const playerBPlayer = await getPlayerForUser(playerBUser);
    const playerCPlayer = await getPlayerForUser(playerCUser);
    const playerDPlayer = await getPlayerForUser(playerDUser);

    if (captainPlayer) createdPlayerIds.push(captainPlayer._id);
    if (playerBPlayer) createdPlayerIds.push(playerBPlayer._id);
    if (playerCPlayer) createdPlayerIds.push(playerCPlayer._id);
    if (playerDPlayer) createdPlayerIds.push(playerDPlayer._id);

    // TEST 1: Captain creates a team
    console.log('[TEST 1] Captain creates a team and becomes initial member & captain');
    const reqCreateTeam = {
      user: captainUser,
      body: {
        name: `Mundas Warriors ${timestamp}`,
        city: 'Coimbatore',
        description: 'Elite franchise for testing recruitment',
      },
    };
    const resCreateTeam = createMockRes();
    await createTeam(reqCreateTeam, resCreateTeam, (err) => console.error(err));

    if (resCreateTeam.statusCode !== 201 || !resCreateTeam.data?.team) {
      throw new Error(`Team creation failed: ${JSON.stringify(resCreateTeam.data)}`);
    }

    const team = resCreateTeam.data.team;
    createdTeamIds.push(team._id);

    const isCaptainMember = team.members.some((m) => String(m._id || m) === String(captainPlayer._id));
    if (isCaptainMember && String(team.captain._id || team.captain) === String(captainPlayer._id)) {
      console.log('✓ PASS: Captain is initial member and captain.\n');
    } else {
      throw new Error('Captain was not made initial member or captain.');
    }

    // TEST 2: Captain invites Player B
    console.log('[TEST 2] Captain invites Player B (status=pending, Player B not in members)');
    const reqInviteB = {
      user: captainUser,
      params: { teamId: String(team._id) },
      body: {
        playerId: String(playerBPlayer._id),
        message: 'Join our championship squad!',
      },
    };
    const resInviteB = createMockRes();
    await sendTeamInvitation(reqInviteB, resInviteB, (err) => console.error(err));

    if (resInviteB.statusCode === 201 && resInviteB.data?.invitation?.status === 'pending') {
      const freshTeam = await Team.findById(team._id);
      const isMemberYet = freshTeam.members.some((m) => String(m) === String(playerBPlayer._id));
      if (!isMemberYet) {
        console.log('✓ PASS: Invitation created as pending, Player B is NOT yet in members.\n');
      } else {
        throw new Error('Player B was immediately added to members without acceptance!');
      }
    } else {
      throw new Error(`Failed to invite Player B: ${JSON.stringify(resInviteB.data)}`);
    }

    const invitationBId = resInviteB.data.invitation._id;

    // TEST 10: Player receives invitation but has not accepted -> Team does NOT appear in My Teams
    console.log('[TEST 10] Pending invitation check: Team does NOT appear in Player B My Teams');
    const reqMyTeamsB = { user: playerBUser };
    const resMyTeamsB = createMockRes();
    await getMyTeams(reqMyTeamsB, resMyTeamsB, (err) => console.error(err));

    const inMyTeamsBefore = resMyTeamsB.data?.teams?.some((t) => String(t._id) === String(team._id));
    if (!inMyTeamsBefore) {
      console.log('✓ PASS: Team does NOT appear in Player B My Teams while invitation is pending.\n');
    } else {
      throw new Error('Team prematurely appeared in My Teams for pending invitee!');
    }

    // TEST 3: Player B views invitations
    console.log('[TEST 3] Player B queries received invitations');
    const reqReceivedB = { user: playerBUser };
    const resReceivedB = createMockRes();
    await getReceivedInvitations(reqReceivedB, resReceivedB, (err) => console.error(err));

    const foundInvite = resReceivedB.data?.invitations?.find(
      (i) => String(i._id) === String(invitationBId)
    );
    if (resReceivedB.statusCode === 200 && foundInvite && foundInvite.status === 'pending') {
      console.log(`✓ PASS: Player B found pending invitation from ${foundInvite.invitedBy.name} for team ${foundInvite.team.name}.\n`);
    } else {
      throw new Error(`Player B could not find received invitation: ${JSON.stringify(resReceivedB.data)}`);
    }

    // TEST 6: Captain tries to invite Player B again (Duplicate pending invitation)
    console.log('[TEST 6] Duplicate pending invitation prevention');
    const resDuplicateB = createMockRes();
    await sendTeamInvitation(reqInviteB, resDuplicateB, (err) => console.error(err));
    if (resDuplicateB.statusCode === 409) {
      console.log(`✓ PASS: Duplicate invitation prevented with 409 Conflict: "${resDuplicateB.data?.message}"\n`);
    } else {
      throw new Error(`Expected 409 Conflict, got ${resDuplicateB.statusCode}`);
    }

    // TEST 5: Captain invites Player C, then Player C rejects
    console.log('[TEST 5] Player C rejects invitation (status=rejected, Player C NOT added)');
    const reqInviteC = {
      user: captainUser,
      params: { teamId: String(team._id) },
      body: { playerId: String(playerCPlayer._id), message: 'Join us!' },
    };
    const resInviteC = createMockRes();
    await sendTeamInvitation(reqInviteC, resInviteC, (err) => console.error(err));
    const invitationCId = resInviteC.data.invitation._id;

    // Player C rejects
    const reqRejectC = {
      user: playerCUser,
      params: { id: String(invitationCId) },
    };
    const resRejectC = createMockRes();
    await rejectInvitation(reqRejectC, resRejectC, (err) => console.error(err));

    if (resRejectC.statusCode === 200 && resRejectC.data?.invitation?.status === 'rejected') {
      const freshTeam = await Team.findById(team._id);
      const isMemberC = freshTeam.members.some((m) => String(m) === String(playerCPlayer._id));
      if (!isMemberC) {
        console.log('✓ PASS: Player C rejected invitation. Status is rejected and Player C is NOT in members.\n');
      } else {
        throw new Error('Player C was added to team despite rejecting!');
      }
    } else {
      throw new Error(`Reject failed: ${JSON.stringify(resRejectC.data)}`);
    }

    // TEST 8: Normal team member (or non-captain) tries to recruit someone
    console.log('[TEST 8] Non-captain / unauthorized user attempts recruitment');
    const reqUnauthorizedRecruit = {
      user: playerCUser,
      params: { teamId: String(team._id) },
      body: { playerId: String(playerDPlayer._id) },
    };
    const resUnauthorizedRecruit = createMockRes();
    await sendTeamInvitation(reqUnauthorizedRecruit, resUnauthorizedRecruit, (err) => console.error(err));
    if (resUnauthorizedRecruit.statusCode === 403) {
      console.log(`✓ PASS: Non-captain recruitment rejected with 403 Forbidden: "${resUnauthorizedRecruit.data?.message}"\n`);
    } else {
      throw new Error(`Expected 403 Forbidden, got ${resUnauthorizedRecruit.statusCode}`);
    }

    // TEST 9: Player C tries to accept Player B's invitation
    console.log('[TEST 9] Unauthorized player attempts to accept someone else\'s invitation');
    const reqFraudAccept = {
      user: playerCUser,
      params: { id: String(invitationBId) },
    };
    const resFraudAccept = createMockRes();
    await acceptInvitation(reqFraudAccept, resFraudAccept, (err) => console.error(err));
    if (resFraudAccept.statusCode === 403) {
      console.log(`✓ PASS: Unauthorized acceptance blocked with 403 Forbidden: "${resFraudAccept.data?.message}"\n`);
    } else {
      throw new Error(`Expected 403 Forbidden, got ${resFraudAccept.statusCode}`);
    }

    // TEST 4 & 11: Player B accepts invitation
    console.log('[TEST 4 & 11] Player B accepts invitation -> added to members & appears in My Teams');
    const reqAcceptB = {
      user: playerBUser,
      params: { id: String(invitationBId) },
    };
    const resAcceptB = createMockRes();
    await acceptInvitation(reqAcceptB, resAcceptB, (err) => console.error(err));

    if (resAcceptB.statusCode === 200 && resAcceptB.data?.invitation?.status === 'accepted') {
      const freshTeam = await Team.findById(team._id);
      const isMemberB = freshTeam.members.some((m) => String(m) === String(playerBPlayer._id));
      if (!isMemberB) {
        throw new Error('Player B was not added to Team.members upon accepting!');
      }

      // Check My Teams for Player B
      const resMyTeamsAfter = createMockRes();
      await getMyTeams(reqMyTeamsB, resMyTeamsAfter, (err) => console.error(err));
      const inMyTeamsAfter = resMyTeamsAfter.data?.teams?.some((t) => String(t._id) === String(team._id));

      if (inMyTeamsAfter) {
        console.log('✓ PASS: Player B is now in Team.members and team appears in My Teams!\n');
      } else {
        throw new Error('Team still does not appear in Player B My Teams after accepting!');
      }
    } else {
      throw new Error(`Accept failed: ${JSON.stringify(resAcceptB.data)}`);
    }

    // TEST 7: Captain tries to invite an existing team member
    console.log('[TEST 7] Captain invites an existing team member');
    const reqInviteExisting = {
      user: captainUser,
      params: { teamId: String(team._id) },
      body: { playerId: String(playerBPlayer._id) },
    };
    const resInviteExisting = createMockRes();
    await sendTeamInvitation(reqInviteExisting, resInviteExisting, (err) => console.error(err));
    if (resInviteExisting.statusCode === 400 || resInviteExisting.statusCode === 409) {
      console.log(`✓ PASS: Inviting existing member rejected with status ${resInviteExisting.statusCode}: "${resInviteExisting.data?.message}"\n`);
    } else {
      throw new Error(`Expected 400/409, got ${resInviteExisting.statusCode}`);
    }

    // TEST Captain Inviting Themselves
    console.log('[TEST Captain Self-Invite] Captain invites themselves');
    const reqSelfInvite = {
      user: captainUser,
      params: { teamId: String(team._id) },
      body: { playerId: String(captainPlayer._id) },
    };
    const resSelfInvite = createMockRes();
    await sendTeamInvitation(reqSelfInvite, resSelfInvite, (err) => console.error(err));
    if (resSelfInvite.statusCode === 400) {
      console.log(`✓ PASS: Self-invite rejected with 400 Bad Request: "${resSelfInvite.data?.message}"\n`);
    } else {
      throw new Error(`Expected 400 Bad Request, got ${resSelfInvite.statusCode}`);
    }

    // TEST Captain Cancelling a Pending Invitation
    console.log('[TEST Cancel Invitation] Captain invites Player D, then cancels invitation');
    const reqInviteD = {
      user: captainUser,
      params: { teamId: String(team._id) },
      body: { playerId: String(playerDPlayer._id), message: 'Join us D!' },
    };
    const resInviteD = createMockRes();
    await sendTeamInvitation(reqInviteD, resInviteD, (err) => console.error(err));
    const invitationDId = resInviteD.data.invitation._id;

    const reqCancelD = {
      user: captainUser,
      params: { id: String(invitationDId) },
    };
    const resCancelD = createMockRes();
    await cancelInvitation(reqCancelD, resCancelD, (err) => console.error(err));
    if (resCancelD.statusCode === 200 && resCancelD.data?.invitation?.status === 'cancelled') {
      console.log('✓ PASS: Captain successfully cancelled pending invitation. Status=cancelled.\n');
    } else {
      throw new Error(`Cancel failed: ${JSON.stringify(resCancelD.data)}`);
    }

    // TEST 12: Player Connection exists but no team invitation
    console.log('[TEST 12] Player connection exists but no team invitation');
    await Connection.create({
      requester: captainPlayer._id,
      receiver: playerDPlayer._id,
      status: 'accepted',
    });
    const freshTeamFinal = await Team.findById(team._id);
    const isDMember = freshTeamFinal.members.some((m) => String(m) === String(playerDPlayer._id));
    if (!isDMember) {
      console.log('✓ PASS: Connection between Captain and Player D does NOT make Player D a team member.\n');
    } else {
      throw new Error('Connection mistakenly gave team membership!');
    }

    // TEST Captain Viewing Team Invitation History
    console.log('[TEST History] Captain queries team invitation history');
    const reqHistory = {
      user: captainUser,
      params: { teamId: String(team._id) },
    };
    const resHistory = createMockRes();
    await getTeamInvitations(reqHistory, resHistory, (err) => console.error(err));
    if (resHistory.statusCode === 200 && resHistory.data?.invitations?.length >= 3) {
      console.log(`✓ PASS: Team invitation history returns ${resHistory.data.invitations.length} records.`);
      resHistory.data.invitations.forEach((inv) => {
        console.log(`   - Player: ${inv.player?.displayName} | Status: ${inv.status} | Message: ${inv.message}`);
      });
      console.log();
    } else {
      throw new Error(`Team history failed: ${JSON.stringify(resHistory.data)}`);
    }

    // Check Notifications
    console.log('[TEST Notifications] Verify notifications were recorded');
    const notifs = await Notification.find({
      $or: [
        { recipient: playerBPlayer._id },
        { recipient: playerCPlayer._id },
        { recipient: captainPlayer._id },
      ],
    });
    console.log(`✓ Total notifications created: ${notifs.length}`);
    notifs.forEach((n) => {
      console.log(`   - Type: ${n.type} | Message: "${n.message}"`);
    });

    console.log('\n======================================================');
    console.log('ALL 12+ TEAM RECRUITMENT TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================');
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exitCode = 1;
  } finally {
    // Cleanup
    console.log('\n[Cleanup] Cleaning up test records...');
    await TeamInvitation.deleteMany({ team: { $in: createdTeamIds } });
    await Notification.deleteMany({
      $or: [
        { sender: { $in: createdPlayerIds } },
        { recipient: { $in: createdPlayerIds } },
      ],
    });
    await Connection.deleteMany({
      $or: [
        { requester: { $in: createdPlayerIds } },
        { receiver: { $in: createdPlayerIds } },
      ],
    });
    await Team.deleteMany({ _id: { $in: createdTeamIds } });
    await Player.deleteMany({ _id: { $in: createdPlayerIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    console.log('✓ Cleanup completed.');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runRecruitmentTests();
