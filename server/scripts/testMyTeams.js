import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';
import { getMyTeams, createTeam } from '../controllers/teamController.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';

async function runTests() {
  console.log('--- Starting My Teams Integration & Verification Tests ---');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  try {
    // 1. Test unauthenticated request to getMyTeams
    console.log('\n[Test 1] Unauthenticated request to getMyTeams');
    const mockReqUnauth = { user: null };
    let statusUnauth = null;
    let jsonUnauth = null;
    const mockResUnauth = {
      status: (s) => {
        statusUnauth = s;
        return {
          json: (j) => {
            jsonUnauth = j;
          },
        };
      },
    };
    await getMyTeams(mockReqUnauth, mockResUnauth, (err) => console.error(err));
    console.log(`Response status: ${statusUnauth}, message: ${jsonUnauth?.message}`);
    if (statusUnauth === 401) {
      console.log('✓ PASS: Unauthenticated access rejected with 401');
    } else {
      throw new Error(`Expected 401, got ${statusUnauth}`);
    }

    // 2. Create a test user & player
    console.log('\n[Test 2] Authenticated user with no teams');
    const testUsername = `testuser_myteams_${Date.now()}`;
    const testEmail = `${testUsername}@example.com`;

    const user1 = await User.create({
      username: testUsername,
      email: testEmail,
      password: 'password123',
      role: 'player',
      city: 'Chennai',
    });

    const mockReqUser1 = { user: user1 };
    let statusUser1 = null;
    let jsonUser1 = null;
    const mockResUser1 = {
      status: (s) => {
        statusUser1 = s;
        return {
          json: (j) => {
            jsonUser1 = j;
          },
        };
      },
    };

    await getMyTeams(mockReqUser1, mockResUser1, (err) => console.error(err));
    console.log(`User1 teams count: ${jsonUser1?.teams?.length}`);
    if (statusUser1 === 200 && jsonUser1?.teams?.length === 0) {
      console.log('✓ PASS: Authenticated user with no teams returns 0 teams');
    } else {
      throw new Error(`Expected 0 teams, got ${jsonUser1?.teams?.length}`);
    }

    // 3. User1 creates a team
    console.log('\n[Test 3] Create a new team and check membership & captaincy');
    const teamName = `Chennai Super Sparks ${Date.now()}`;
    const mockReqCreate = {
      user: user1,
      body: {
        name: teamName,
        city: 'Chennai',
        description: 'Elite franchise for CrickPulse',
        logo: '',
      },
    };
    let statusCreate = null;
    let jsonCreate = null;
    const mockResCreate = {
      status: (s) => {
        statusCreate = s;
        return {
          json: (j) => {
            jsonCreate = j;
          },
        };
      },
    };

    await createTeam(mockReqCreate, mockResCreate, (err) => console.error(err));
    console.log(`Create Team status: ${statusCreate}, team name: ${jsonCreate?.team?.name}`);
    if (statusCreate === 201 && jsonCreate?.team) {
      console.log('✓ PASS: Team created successfully');
    } else {
      throw new Error(`Team creation failed: ${JSON.stringify(jsonCreate)}`);
    }

    const createdTeamId = jsonCreate.team._id;

    // 4. Test getMyTeams for User1
    console.log('\n[Test 4] getMyTeams for Creator/Captain');
    let statusMyTeams = null;
    let jsonMyTeams = null;
    const mockResMyTeams = {
      status: (s) => {
        statusMyTeams = s;
        return {
          json: (j) => {
            jsonMyTeams = j;
          },
        };
      },
    };
    await getMyTeams(mockReqUser1, mockResMyTeams, (err) => console.error(err));
    const foundTeam = jsonMyTeams?.teams?.find((t) => String(t._id) === String(createdTeamId));
    console.log(`Found team in My Teams: ${foundTeam?.name}`);
    console.log(`Player Role: ${foundTeam?.playerRole}`);
    console.log(`Matches Count: ${foundTeam?.stats?.matchesCount}`);
    console.log(`Members Count: ${foundTeam?.membersCount}`);

    if (foundTeam && foundTeam.playerRole === 'Captain' && foundTeam.membersCount >= 1) {
      console.log('✓ PASS: My Teams includes newly created team with Role=Captain');
    } else {
      throw new Error(`Expected role 'Captain' and memberCount >= 1, got ${foundTeam?.playerRole}`);
    }

    // 5. Test adding a second player as a member
    console.log('\n[Test 5] Member role in getMyTeams for joined player');
    const user2 = await User.create({
      username: `member_${Date.now()}`,
      email: `member_${Date.now()}@example.com`,
      password: 'password123',
      role: 'player',
      city: 'Chennai',
    });
    const player2 = await Player.create({
      userId: user2._id,
      displayName: 'Second Member',
      city: 'Chennai',
      profileVisibility: 'public',
    });

    // Add player2 to team members
    await Team.findByIdAndUpdate(createdTeamId, {
      $addToSet: { members: player2._id },
    });

    const mockReqUser2 = { user: user2 };
    let jsonUser2 = null;
    const mockResUser2 = {
      status: () => ({
        json: (j) => {
          jsonUser2 = j;
        },
      }),
    };
    await getMyTeams(mockReqUser2, mockResUser2, (err) => console.error(err));
    const foundMemberTeam = jsonUser2?.teams?.find((t) => String(t._id) === String(createdTeamId));
    console.log(`User2 found team: ${foundMemberTeam?.name}`);
    console.log(`User2 Role: ${foundMemberTeam?.playerRole}`);

    if (foundMemberTeam && foundMemberTeam.playerRole === 'Member') {
      console.log('✓ PASS: My Teams correctly identifies non-captain as Role=Member');
    } else {
      throw new Error(`Expected role 'Member', got ${foundMemberTeam?.playerRole}`);
    }

    // Cleanup test data
    console.log('\n[Cleanup] Cleaning up test records...');
    await Team.findByIdAndDelete(createdTeamId);
    await Player.deleteMany({ userId: { $in: [user1._id, user2._id] } });
    await User.deleteMany({ _id: { $in: [user1._id, user2._id] } });
    console.log('✓ Test records cleaned up successfully.');

    console.log('\n========================================');
    console.log('ALL MY TEAMS TESTS COMPLETED SUCCESSFULLY!');
    console.log('========================================');
  } catch (err) {
    console.error('Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTests();
