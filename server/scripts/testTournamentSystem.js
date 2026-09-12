import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';
import Innings from '../models/Innings.js';
import Tournament from '../models/Tournament.js';
import TournamentInvitation from '../models/TournamentInvitation.js';

import {
  createTournament,
  getTournaments,
  getMyTournaments,
  getTournamentById,
  updateTournament,
  sendTournamentInvitation,
  createTournamentFixture,
  getTournamentMatches,
  getTournamentPointsTable,
  getTournamentLeaderboard,
} from '../controllers/tournamentController.js';

import {
  acceptTournamentInvitation,
  rejectTournamentInvitation,
  getReceivedTournamentInvitations,
} from '../controllers/tournamentInvitationController.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';

function mockReqRes(user = null, body = {}, params = {}, query = {}) {
  let statusCode = 200;
  let jsonResponse = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      jsonResponse = data;
      return res;
    },
  };

  const req = {
    user,
    body,
    params,
    query,
  };

  return {
    req,
    res,
    next: (err) => {
      if (err) {
        console.error('Controller error passed to next():', err);
        statusCode = 500;
        jsonResponse = { success: false, message: err.message };
      }
    },
    getStatus: () => statusCode,
    getData: () => jsonResponse,
  };
}

async function runTournamentTests() {
  console.log('====================================================');
  console.log('--- TOURNAMENT MANAGEMENT SYSTEM INTEGRATION TESTS ---');
  console.log('====================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  const createdUserIds = [];
  const createdPlayerIds = [];
  const createdTeamIds = [];
  const createdTournamentIds = [];
  const createdMatchIds = [];
  const createdInningsIds = [];

  try {
    // ----------------------------------------------------
    // SETUP USERS, PLAYERS & TEAMS
    // ----------------------------------------------------
    console.log('\n[Setup] Creating test users, players, and teams...');

    // 1. Organizer
    const orgUser = await User.create({
      username: `org_${Date.now()}`,
      email: `org_${Date.now()}@test.com`,
      password: 'password123',
      role: 'player',
      city: 'Mumbai',
    });
    createdUserIds.push(orgUser._id);

    // 2. Captain of Team A
    const capAUser = await User.create({
      username: `capA_${Date.now()}`,
      email: `capA_${Date.now()}@test.com`,
      password: 'password123',
      role: 'player',
      city: 'Mumbai',
    });
    createdUserIds.push(capAUser._id);
    const capAPlayer = await Player.create({
      userId: capAUser._id,
      displayName: 'Captain Alpha',
      city: 'Mumbai',
      playingRole: 'Batter',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm medium',
    });
    createdPlayerIds.push(capAPlayer._id);

    const teamA = await Team.create({
      name: `Alpha Warriors ${Date.now()}`,
      city: 'Mumbai',
      captain: capAPlayer._id,
      createdBy: capAUser._id,
      members: [capAPlayer._id],
    });
    createdTeamIds.push(teamA._id);

    // 3. Captain of Team B (will reject invite)
    const capBUser = await User.create({
      username: `capB_${Date.now()}`,
      email: `capB_${Date.now()}@test.com`,
      password: 'password123',
      role: 'player',
      city: 'Pune',
    });
    createdUserIds.push(capBUser._id);
    const capBPlayer = await Player.create({
      userId: capBUser._id,
      displayName: 'Captain Beta',
      city: 'Pune',
      playingRole: 'Bowler',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm fast',
    });
    createdPlayerIds.push(capBPlayer._id);

    const teamB = await Team.create({
      name: `Beta Blasters ${Date.now()}`,
      city: 'Pune',
      captain: capBPlayer._id,
      createdBy: capBUser._id,
      members: [capBPlayer._id],
    });
    createdTeamIds.push(teamB._id);

    // 4. Captain of Team C (will be invited & accept)
    const capCUser = await User.create({
      username: `capC_${Date.now()}`,
      email: `capC_${Date.now()}@test.com`,
      password: 'password123',
      role: 'player',
      city: 'Mumbai',
    });
    createdUserIds.push(capCUser._id);
    const capCPlayer = await Player.create({
      userId: capCUser._id,
      displayName: 'Captain Gamma',
      city: 'Mumbai',
      playingRole: 'All-Rounder',
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Left-arm orthodox',
    });
    createdPlayerIds.push(capCPlayer._id);

    const teamC = await Team.create({
      name: `Gamma Giants ${Date.now()}`,
      city: 'Mumbai',
      captain: capCPlayer._id,
      createdBy: capCUser._id,
      members: [capCPlayer._id],
    });
    createdTeamIds.push(teamC._id);

    console.log('✓ Test fixtures created: Organizer, Team A, Team B, Team C.');

    // ----------------------------------------------------
    // TEST 1: TOURNAMENT CREATION WITH VALIDATION
    // ----------------------------------------------------
    console.log('\n[Test 1] Create Tournament & Validate Dates');
    const startDate = new Date(Date.now() + 86400000); // tomorrow
    const endDate = new Date(Date.now() + 86400000 * 7); // 7 days later

    const createCtx = mockReqRes(orgUser, {
      name: `Premier Cup ${Date.now()}`,
      description: 'The pinnacle tournament of CrickPulse',
      format: 'T20',
      overs: 20,
      city: 'Mumbai',
      venue: 'Wankhede Arena',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      registrationDeadline: new Date().toISOString(),
      maxTeams: 8,
      status: 'upcoming',
      rules: 'Standard T20 rules apply.',
    });

    await createTournament(createCtx.req, createCtx.res, createCtx.next);
    console.log(`Status: ${createCtx.getStatus()}, Tournament: ${createCtx.getData()?.tournament?.name}`);

    if (createCtx.getStatus() !== 201 || !createCtx.getData()?.tournament) {
      throw new Error(`Failed to create tournament: ${JSON.stringify(createCtx.getData())}`);
    }

    const tournamentId = createCtx.getData().tournament._id;
    createdTournamentIds.push(tournamentId);
    console.log('✓ PASS: Tournament created successfully with organizer assignment.');

    // ----------------------------------------------------
    // TEST 2: UNAUTHORIZED EDIT ATTEMPT
    // ----------------------------------------------------
    console.log('\n[Test 2] Unauthorized user attempting to edit tournament');
    const unauthEditCtx = mockReqRes(capAUser, { name: 'Hacked Tournament' }, { id: tournamentId });
    await updateTournament(unauthEditCtx.req, unauthEditCtx.res, unauthEditCtx.next);
    console.log(`Status: ${unauthEditCtx.getStatus()}, message: ${unauthEditCtx.getData()?.message}`);

    if (unauthEditCtx.getStatus() === 403) {
      console.log('✓ PASS: Unauthorized edit properly rejected with 403 Forbidden.');
    } else {
      throw new Error(`Expected 403 Forbidden, got ${unauthEditCtx.getStatus()}`);
    }

    // ----------------------------------------------------
    // TEST 3: ORGANIZER SENDS INVITATIONS (TEAM A, TEAM B, TEAM C)
    // ----------------------------------------------------
    console.log('\n[Test 3] Organizer invites Team A, Team B, and Team C');
    const inviteACtx = mockReqRes(orgUser, { teamId: teamA._id, message: 'Join our championship!' }, { id: tournamentId });
    await sendTournamentInvitation(inviteACtx.req, inviteACtx.res, inviteACtx.next);
    if (inviteACtx.getStatus() !== 201) {
      throw new Error(`Failed to invite Team A: ${JSON.stringify(inviteACtx.getData())}`);
    }
    const inviteAId = inviteACtx.getData().invitation._id;
    console.log('✓ PASS: Team A invited with status pending.');

    // Verify tournament.teams does NOT contain Team A yet
    const tAfterInvite = await Tournament.findById(tournamentId);
    if (tAfterInvite.teams.some((t) => String(t) === String(teamA._id))) {
      throw new Error('Team A should NOT be in tournament.teams before accepting invitation!');
    }
    console.log('✓ PASS: Team A is NOT in tournament teams list yet.');

    // Invite Team B
    const inviteBCtx = mockReqRes(orgUser, { teamId: teamB._id }, { id: tournamentId });
    await sendTournamentInvitation(inviteBCtx.req, inviteBCtx.res, inviteBCtx.next);
    const inviteBId = inviteBCtx.getData().invitation._id;

    // Invite Team C
    const inviteCCtx = mockReqRes(orgUser, { teamId: teamC._id }, { id: tournamentId });
    await sendTournamentInvitation(inviteCCtx.req, inviteCCtx.res, inviteCCtx.next);
    const inviteCId = inviteCCtx.getData().invitation._id;
    console.log('✓ PASS: Team B and Team C invitations created.');

    // ----------------------------------------------------
    // TEST 4: DUPLICATE INVITATION REJECTED
    // ----------------------------------------------------
    console.log('\n[Test 4] Duplicate team invitation prevention');
    const dupInviteCtx = mockReqRes(orgUser, { teamId: teamA._id }, { id: tournamentId });
    await sendTournamentInvitation(dupInviteCtx.req, dupInviteCtx.res, dupInviteCtx.next);
    console.log(`Status: ${dupInviteCtx.getStatus()}, message: ${dupInviteCtx.getData()?.message}`);
    if (dupInviteCtx.getStatus() === 409) {
      console.log('✓ PASS: Duplicate tournament invitation rejected with 409 Conflict.');
    } else {
      throw new Error(`Expected 409, got ${dupInviteCtx.getStatus()}`);
    }

    // ----------------------------------------------------
    // TEST 5: TEAM A CAPTAIN ACCEPTS INVITATION
    // ----------------------------------------------------
    console.log('\n[Test 5] Team A Captain accepts tournament invitation');
    const acceptACtx = mockReqRes(capAUser, {}, { id: inviteAId });
    await acceptTournamentInvitation(acceptACtx.req, acceptACtx.res, acceptACtx.next);
    console.log(`Status: ${acceptACtx.getStatus()}, message: ${acceptACtx.getData()?.message}`);

    if (acceptACtx.getStatus() !== 200) {
      throw new Error(`Accept invitation failed: ${JSON.stringify(acceptACtx.getData())}`);
    }

    // Verify Team A is now inside tournament.teams
    const tAfterAcceptA = await Tournament.findById(tournamentId);
    if (!tAfterAcceptA.teams.some((t) => String(t) === String(teamA._id))) {
      throw new Error('Team A was not added to tournament.teams after acceptance!');
    }
    console.log('✓ PASS: Team A is now officially in tournament.teams.');

    // ----------------------------------------------------
    // TEST 6: TEAM B CAPTAIN REJECTS INVITATION
    // ----------------------------------------------------
    console.log('\n[Test 6] Team B Captain rejects tournament invitation');
    const rejectBCtx = mockReqRes(capBUser, {}, { id: inviteBId });
    await rejectTournamentInvitation(rejectBCtx.req, rejectBCtx.res, rejectBCtx.next);
    console.log(`Status: ${rejectBCtx.getStatus()}, message: ${rejectBCtx.getData()?.message}`);

    const tAfterRejectB = await Tournament.findById(tournamentId);
    if (tAfterRejectB.teams.some((t) => String(t) === String(teamB._id))) {
      throw new Error('Team B should NOT be in tournament.teams after rejecting!');
    }
    console.log('✓ PASS: Team B rejected and is NOT in tournament teams.');

    // Accept Team C
    const acceptCCtx = mockReqRes(capCUser, {}, { id: inviteCId });
    await acceptTournamentInvitation(acceptCCtx.req, acceptCCtx.res, acceptCCtx.next);
    console.log('✓ PASS: Team C accepted and added to tournament.');

    // ----------------------------------------------------
    // TEST 7: ORGANIZER CREATES TOURNAMENT FIXTURE
    // ----------------------------------------------------
    console.log('\n[Test 7] Organizer creates match fixture between Team A and Team C');
    const fixtureCtx = mockReqRes(
      orgUser,
      {
        team1Id: teamA._id,
        team2Id: teamC._id,
        matchDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        venue: 'Wankhede Arena',
        round: 'Group Stage Round 1',
        matchType: 'T20',
        overs: 20,
      },
      { id: tournamentId }
    );
    await createTournamentFixture(fixtureCtx.req, fixtureCtx.res, fixtureCtx.next);
    console.log(`Status: ${fixtureCtx.getStatus()}, Match: ${fixtureCtx.getData()?.match?.name}`);

    if (fixtureCtx.getStatus() !== 201 || !fixtureCtx.getData()?.match) {
      throw new Error(`Fixture creation failed: ${JSON.stringify(fixtureCtx.getData())}`);
    }

    const match = fixtureCtx.getData().match;
    createdMatchIds.push(match._id);

    if (String(match.tournamentId) !== String(tournamentId)) {
      throw new Error(`Match tournamentId mismatch: ${match.tournamentId} vs ${tournamentId}`);
    }
    console.log('✓ PASS: Tournament fixture created with proper tournamentId reference.');

    // ----------------------------------------------------
    // TEST 8: SIMULATE MATCH COMPLETION & VERIFY POINTS TABLE & NRR
    // ----------------------------------------------------
    console.log('\n[Test 8] Complete match and calculate dynamic Points Table & NRR');
    // Team A: 180 runs for 4 wickets in 20.0 overs (overs faced = 20)
    // Team C: 140 runs all out (10 wickets) in 18.0 overs
    // Cricket NRR rule: Team C was all out, so overs faced is counted as full 20.0 overs!
    // Team A NRR: (180/20) - (140/20) = 9.000 - 7.000 = +2.000
    // Team C NRR: (140/20) - (180/20) = 7.000 - 9.000 = -2.000

    await Match.findByIdAndUpdate(match._id, {
      status: 'completed',
      winner: teamA.name,
      tossWinner: teamA.name,
      tossDecision: 'bat',
      currentInningsNumber: 2,
      result: `${teamA.name} won by 40 runs`,
    });

    const inn1 = await Innings.create({
      match: match._id,
      inningsNumber: 1,
      battingTeam: teamA.name,
      bowlingTeam: teamC.name,
      status: 'completed',
      totalRuns: 180,
      wickets: 4,
      overs: '20.0',
      batsmen: [
        {
          name: 'Captain Alpha',
          playerId: capAPlayer._id,
          runs: 85,
          balls: 45,
          fours: 8,
          sixes: 4,
          isOut: false,
          strikeRate: 188.9,
        },
      ],
      bowlers: [
        {
          name: 'Captain Gamma',
          playerId: capCPlayer._id,
          overs: '4.0',
          legalBalls: 24,
          maidens: 0,
          runsConceded: 32,
          wickets: 2,
        },
      ],
    });
    createdInningsIds.push(inn1._id);

    const inn2 = await Innings.create({
      match: match._id,
      inningsNumber: 2,
      battingTeam: teamC.name,
      bowlingTeam: teamA.name,
      status: 'completed',
      totalRuns: 140,
      wickets: 10,
      overs: '18.0',
      batsmen: [
        {
          name: 'Captain Gamma',
          playerId: capCPlayer._id,
          runs: 45,
          balls: 30,
          fours: 4,
          sixes: 1,
          isOut: true,
          strikeRate: 150.0,
        },
      ],
      bowlers: [
        {
          name: 'Captain Alpha',
          playerId: capAPlayer._id,
          overs: '4.0',
          legalBalls: 24,
          maidens: 0,
          runsConceded: 20,
          wickets: 3,
        },
      ],
    });
    createdInningsIds.push(inn2._id);

    const ptCtx = mockReqRes(null, {}, { id: tournamentId });
    await getTournamentPointsTable(ptCtx.req, ptCtx.res);
    const pointsTable = ptCtx.getData()?.pointsTable;

    console.log('Points Table Result:');
    pointsTable.forEach((row, i) => {
      console.log(
        `#${i + 1} ${row.teamName}: P=${row.played} W=${row.won} L=${row.lost} Pts=${row.points} NRR=${row.nrr}`
      );
    });

    const teamARow = pointsTable.find((r) => String(r.teamId) === String(teamA._id));
    const teamCRow = pointsTable.find((r) => String(r.teamId) === String(teamC._id));

    if (!teamARow || !teamCRow) {
      throw new Error('Both Team A and Team C must appear on points table');
    }

    if (teamARow.points !== 2 || teamARow.won !== 1 || teamARow.played !== 1) {
      throw new Error(`Team A points incorrect: expected 2 pts, 1 win. Got: ${JSON.stringify(teamARow)}`);
    }

    if (teamCRow.points !== 0 || teamCRow.lost !== 1 || teamCRow.played !== 1) {
      throw new Error(`Team C points incorrect: expected 0 pts, 1 loss. Got: ${JSON.stringify(teamCRow)}`);
    }

    if (teamARow.nrr !== '+2.000' || teamCRow.nrr !== '-2.000') {
      throw new Error(
        `NRR calculation failed! Expected Team A: +2.000, Team C: -2.000. Got Team A: ${teamARow.nrr}, Team C: ${teamCRow.nrr}`
      );
    }
    console.log('✓ PASS: Dynamic Points Table and exact Net Run Rate (NRR) with all-out quota verified.');

    // ----------------------------------------------------
    // TEST 9: TOURNAMENT LEADERBOARD
    // ----------------------------------------------------
    console.log('\n[Test 9] Tournament Leaderboard Calculation');
    const lbCtx = mockReqRes(null, {}, { id: tournamentId });
    await getTournamentLeaderboard(lbCtx.req, lbCtx.res, lbCtx.next);
    const lbData = lbCtx.getData();

    const topBatsman = lbData.topBatsmen[0];
    const topBowler = lbData.topBowlers[0];

    console.log(`Top Batsman: ${topBatsman?.playerName} - ${topBatsman?.runs} runs (SR: ${topBatsman?.strikeRate})`);
    console.log(`Top Bowler: ${topBowler?.playerName} - ${topBowler?.wickets} wickets (Econ: ${topBowler?.economy})`);

    if (topBatsman?.runs !== 85 || String(topBatsman?.playerId) !== String(capAPlayer._id)) {
      throw new Error(`Expected top batsman to be Captain Alpha with 85 runs, got ${JSON.stringify(topBatsman)}`);
    }

    if (topBowler?.wickets !== 3 || String(topBowler?.playerId) !== String(capAPlayer._id)) {
      throw new Error(`Expected top bowler to be Captain Alpha with 3 wickets, got ${JSON.stringify(topBowler)}`);
    }
    console.log('✓ PASS: Tournament-specific leaderboards accurately aggregated.');

    // ----------------------------------------------------
    // TEST 10: MY TOURNAMENTS LISTING
    // ----------------------------------------------------
    console.log('\n[Test 10] My Tournaments for Organizer and Participating Players');
    const myOrgCtx = mockReqRes(orgUser);
    await getMyTournaments(myOrgCtx.req, myOrgCtx.res, myOrgCtx.next);
    const orgTournaments = myOrgCtx.getData()?.tournaments;
    const orgItem = orgTournaments?.find((t) => String(t._id) === String(tournamentId));

    if (!orgItem || orgItem.userRole !== 'Organizer') {
      throw new Error(`Expected organizer role for orgUser, got: ${orgItem?.userRole}`);
    }
    console.log(`✓ PASS: Organizer sees tournament with userRole='Organizer'`);

    const myCapACtx = mockReqRes(capAUser);
    await getMyTournaments(myCapACtx.req, myCapACtx.res, myCapACtx.next);
    const capATournaments = myCapACtx.getData()?.tournaments;
    const capAItem = capATournaments?.find((t) => String(t._id) === String(tournamentId));

    if (!capAItem || capAItem.userRole !== 'Participant') {
      throw new Error(`Expected participant role for capAUser, got: ${capAItem?.userRole}`);
    }
    console.log(`✓ PASS: Team A Captain sees tournament with userRole='Participant'`);

    // ----------------------------------------------------
    // TEST 11: GET RECEIVED TOURNAMENT INVITATIONS
    // ----------------------------------------------------
    console.log('\n[Test 11] Check Team Captain Received Tournament Invitations');
    const recvCtx = mockReqRes(capAUser, {}, {}, { status: 'all' });
    await getReceivedTournamentInvitations(recvCtx.req, recvCtx.res, recvCtx.next);
    const receivedInvites = recvCtx.getData()?.invitations;
    const foundInvite = receivedInvites?.find((i) => String(i.tournament?._id) === String(tournamentId));

    if (!foundInvite || foundInvite.status !== 'accepted') {
      throw new Error(`Expected accepted invitation for Team A, got: ${foundInvite?.status}`);
    }
    console.log('✓ PASS: Received tournament invitations retrieved successfully.');

    // ----------------------------------------------------
    // TEST 12: PUBLIC TOURNAMENTS DISCOVERY & FILTERING
    // ----------------------------------------------------
    console.log('\n[Test 12] Tournament Discovery with Search & Format Filters');
    const filterCtx = mockReqRes(null, {}, {}, { format: 'T20', search: 'Premier Cup' });
    await getTournaments(filterCtx.req, filterCtx.res, filterCtx.next);
    const foundT = filterCtx.getData()?.tournaments?.find((t) => String(t._id) === String(tournamentId));

    if (!foundT) {
      throw new Error('Tournament discovery failed to find tournament matching filter.');
    }
    console.log(`✓ PASS: Discovery returned tournament matching format=T20 and search query.`);

    console.log('\n====================================================');
    console.log('ALL 12 TOURNAMENT SYSTEM INTEGRATION TESTS PASSED!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    // Cleanup
    console.log('\n[Cleanup] Cleaning up test records...');
    if (createdInningsIds.length > 0) await Innings.deleteMany({ _id: { $in: createdInningsIds } });
    if (createdMatchIds.length > 0) await Match.deleteMany({ _id: { $in: createdMatchIds } });
    if (createdTournamentIds.length > 0) {
      await TournamentInvitation.deleteMany({ tournament: { $in: createdTournamentIds } });
      await Tournament.deleteMany({ _id: { $in: createdTournamentIds } });
    }
    if (createdTeamIds.length > 0) await Team.deleteMany({ _id: { $in: createdTeamIds } });
    if (createdPlayerIds.length > 0) await Player.deleteMany({ _id: { $in: createdPlayerIds } });
    if (createdUserIds.length > 0) await User.deleteMany({ _id: { $in: createdUserIds } });
    console.log('✓ Cleanup complete.');

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB.');
  }
}

runTournamentTests();
