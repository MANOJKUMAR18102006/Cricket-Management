import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Match from '../models/Match.js';
import Innings from '../models/Innings.js';
import Connection from '../models/Connection.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=====================================================');
  console.log('📊  CRICKPULSE AUTOMATIC CAREER STATS TEST SUITE');
  console.log('=====================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';
    await mongoose.connect(mongoUri);

    const jwtSecret = process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026';

    // Clean up previous runs
    await Player.deleteMany({ displayName: 'Klown Rahul' });
    await Player.deleteMany({ displayName: 'Secret Spinner' });
    await Player.deleteMany({ displayName: 'Stranger User' });
    await Player.deleteMany({ displayName: 'Loyal Friend' });
    const oldMatches = await Match.find({ team1: { $in: ['Bangalore Blasters', 'Karnataka Kings'] } });
    const oldMatchIds = oldMatches.map((m) => m._id);
    await Innings.deleteMany({ match: { $in: oldMatchIds } });
    await Match.deleteMany({ _id: { $in: oldMatchIds } });

    // 1. Create Test Star Player (Public Profile)
    const starUser = await User.create({
      username: `star_batsman_${Date.now()}`,
      email: `star_${Date.now()}@crickpulse.test`,
      password: 'Password123!',
      role: 'player',
    });

    const starPlayer = await Player.create({
      userId: starUser._id,
      displayName: 'Klown Rahul',
      playingRole: 'Batter',
      city: 'Bengaluru',
      profileVisibility: 'public',
    });

    // 2. Create Private Player
    const privateUser = await User.create({
      username: `private_bowler_${Date.now()}`,
      email: `private_${Date.now()}@crickpulse.test`,
      password: 'Password123!',
      role: 'player',
    });

    const privatePlayer = await Player.create({
      userId: privateUser._id,
      displayName: 'Secret Spinner',
      playingRole: 'Bowler',
      city: 'Chennai',
      profileVisibility: 'private',
    });

    // 3. Create Unconnected Viewer
    const strangerUser = await User.create({
      username: `stranger_${Date.now()}`,
      email: `stranger_${Date.now()}@crickpulse.test`,
      password: 'Password123!',
      role: 'player',
    });

    const strangerPlayer = await Player.create({
      userId: strangerUser._id,
      displayName: 'Stranger User',
      playingRole: 'All-Rounder',
      city: 'Delhi',
      profileVisibility: 'public',
    });

    // 4. Create Friend User (will connect to Private Player)
    const friendUser = await User.create({
      username: `friend_${Date.now()}`,
      email: `friend_${Date.now()}@crickpulse.test`,
      password: 'Password123!',
      role: 'player',
    });

    const friendPlayer = await Player.create({
      userId: friendUser._id,
      displayName: 'Loyal Friend',
      playingRole: 'Batter',
      city: 'Chennai',
      profileVisibility: 'public',
    });

    await Connection.create({
      requester: friendPlayer._id,
      receiver: privatePlayer._id,
      status: 'accepted',
    });

    const starToken = jwt.sign({ id: starUser._id, role: starUser.role }, jwtSecret, { expiresIn: '1h' });
    const strangerToken = jwt.sign({ id: strangerUser._id, role: strangerUser.role }, jwtSecret, { expiresIn: '1h' });
    const friendToken = jwt.sign({ id: friendUser._id, role: friendUser.role }, jwtSecret, { expiresIn: '1h' });

    // 5. Create Completed Match 1 (T20 Format) with Innings Performance
    const t20Match = await Match.create({
      team1: 'Bangalore Blasters',
      team2: 'Chennai Champions',
      format: 'T20',
      overs: 20,
      venue: 'Chinnaswamy Stadium',
      city: 'Bengaluru',
      date: new Date(),
      status: 'completed',
      winner: 'Bangalore Blasters',
      result: 'Bangalore Blasters won by 45 runs',
      createdBy: starUser._id,
    });

    await Innings.create({
      match: t20Match._id,
      inningsNumber: 1,
      battingTeam: 'Bangalore Blasters',
      bowlingTeam: 'Chennai Champions',
      status: 'completed',
      totalRuns: 185,
      wickets: 3,
      legalBalls: 120,
      overs: '20.0',
      batsmen: [
        {
          name: starPlayer.displayName,
          playerId: starPlayer._id,
          runs: 76,
          balls: 45,
          fours: 8,
          sixes: 3,
          strikeRate: 168.89,
          isOut: true,
          dismissal: 'c Secret Spinner b Malinga',
        },
      ],
      bowlers: [
        {
          name: privatePlayer.displayName,
          playerId: privatePlayer._id,
          legalBalls: 24,
          overs: '4.0',
          maidens: 1,
          runsConceded: 22,
          wickets: 2,
          economy: 5.5,
        },
      ],
      deliveries: [
        {
          over: 12,
          ballInOver: 4,
          type: 'wicket',
          runsScored: 0,
          isWicket: true,
          wicketType: 'caught',
          commentary: `OUT! c ${privatePlayer.displayName} b Malinga`,
          striker: starPlayer.displayName,
          nonStriker: 'Virat',
          bowler: 'Malinga',
        },
      ],
    });

    // 6. Create Completed Match 2 (T10 Format)
    const t10Match = await Match.create({
      team1: 'Bangalore Blasters',
      team2: 'Delhi Dynamos',
      format: 'T10',
      overs: 10,
      venue: 'Sharjah Stadium',
      city: 'Sharjah',
      date: new Date(),
      status: 'completed',
      winner: 'Bangalore Blasters',
      result: 'Bangalore Blasters won by 18 runs',
      createdBy: starUser._id,
    });

    await Innings.create({
      match: t10Match._id,
      inningsNumber: 1,
      battingTeam: 'Bangalore Blasters',
      bowlingTeam: 'Delhi Dynamos',
      status: 'completed',
      totalRuns: 110,
      wickets: 2,
      legalBalls: 60,
      overs: '10.0',
      batsmen: [
        {
          name: starPlayer.displayName,
          playerId: starPlayer._id,
          runs: 54,
          balls: 25,
          fours: 5,
          sixes: 4,
          strikeRate: 216.0,
          isOut: false,
          dismissal: 'not out',
        },
      ],
      bowlers: [],
      deliveries: [],
    });

    // --- TEST 1: Get Overall Career Stats (GET /api/players/:id/stats) ---
    console.log('--- TEST 1: Get Overall Career Stats (GET /api/players/:id/stats) ---');
    const res1 = await fetch(`${BASE_URL}/players/${starPlayer._id}/stats`, {
      headers: { Authorization: `Bearer ${starToken}` },
    });
    const data1 = await res1.json();

    if (!res1.ok || !data1.success) {
      throw new Error(`TEST 1 Failed: ${data1.message}`);
    }

    const batting1 = data1.stats.batting;
    // Expected: 2 matches, 2 innings, runs: 76 + 54 = 130, balls: 45 + 25 = 70, 50s: 2, highestScore: "76"
    if (batting1.runs !== 130 || batting1.matches !== 2 || batting1.fifties !== 2) {
      throw new Error(`TEST 1 Failed: Expected 130 runs, 2 matches, 2 fifties. Got: ${JSON.stringify(batting1)}`);
    }
    console.log(`✅ TEST 1 PASSED: Overall Career Stats calculated. Matches: ${batting1.matches}, Runs: ${batting1.runs}, Balls: ${batting1.balls}, Fifties: ${batting1.fifties}, SR: ${batting1.strikeRate}.\n`);

    // --- TEST 2: Filter by Format (GET /api/players/:id/stats?format=T20) ---
    console.log('--- TEST 2: Filter by Format (GET /api/players/:id/stats?format=T20) ---');
    const res2 = await fetch(`${BASE_URL}/players/${starPlayer._id}/stats?format=T20`, {
      headers: { Authorization: `Bearer ${starToken}` },
    });
    const data2 = await res2.json();

    if (!res2.ok || data2.stats.batting.runs !== 76 || data2.stats.batting.matches !== 1) {
      throw new Error(`TEST 2 Failed: Expected 76 runs in T20 match, got ${data2.stats.batting.runs}`);
    }
    console.log(`✅ TEST 2 PASSED: T20 Format filtered stats: ${data2.stats.batting.runs} runs in ${data2.stats.batting.matches} match.\n`);

    // --- TEST 3: Filter by Format (GET /api/players/:id/stats?format=T10) ---
    console.log('--- TEST 3: Filter by Format (GET /api/players/:id/stats?format=T10) ---');
    const res3 = await fetch(`${BASE_URL}/players/${starPlayer._id}/stats?format=T10`, {
      headers: { Authorization: `Bearer ${starToken}` },
    });
    const data3 = await res3.json();

    if (!res3.ok || data3.stats.batting.runs !== 54 || data3.stats.batting.highestScore !== '54*') {
      throw new Error(`TEST 3 Failed: Expected 54* runs in T10 match, got ${data3.stats.batting.highestScore}`);
    }
    console.log(`✅ TEST 3 PASSED: T10 Format filtered stats: ${data3.stats.batting.runs} runs, Highest: ${data3.stats.batting.highestScore}.\n`);

    // --- TEST 4: Fielding Stats Aggregation ---
    console.log('--- TEST 4: Fielding Stats (Catches) ---');
    const res4 = await fetch(`${BASE_URL}/players/${privatePlayer._id}/stats`, {
      headers: { Authorization: `Bearer ${friendToken}` },
    });
    const data4 = await res4.json();

    if (!res4.ok || data4.stats.fielding.catches !== 1) {
      throw new Error(`TEST 4 Failed: Expected 1 catch recorded for Secret Spinner, got ${data4.stats.fielding.catches}`);
    }
    console.log(`✅ TEST 4 PASSED: Fielding stats verified. Catches: ${data4.stats.fielding.catches}.\n`);

    // --- TEST 5: Bowling Stats Aggregation ---
    console.log('--- TEST 5: Bowling Stats (Wickets, Overs, Economy) ---');
    const bowling = data4.stats.bowling;
    if (bowling.wickets !== 2 || bowling.overs !== '4.0' || bowling.economy !== '5.50') {
      throw new Error(`TEST 5 Failed: Expected 2 wickets in 4.0 ov at 5.50 econ. Got: ${JSON.stringify(bowling)}`);
    }
    console.log(`✅ TEST 5 PASSED: Bowling stats verified. Wickets: ${bowling.wickets}, Overs: ${bowling.overs}, Economy: ${bowling.economy}, Best: ${bowling.bestBowling}.\n`);

    // --- TEST 6: Privacy Guard: Unconnected Viewer Blocked on Private Profile (HTTP 403) ---
    console.log('--- TEST 6: Privacy Guard: Unconnected Viewer (HTTP 403) ---');
    const res6 = await fetch(`${BASE_URL}/players/${privatePlayer._id}/stats`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });

    if (res6.status !== 403) {
      throw new Error(`TEST 6 Failed: Expected HTTP 403 for unconnected viewer on private profile, got ${res6.status}`);
    }
    const data6 = await res6.json();
    if (!data6.privacyRestricted) {
      throw new Error(`TEST 6 Failed: Expected privacyRestricted: true in response`);
    }
    console.log(`✅ TEST 6 PASSED: Unconnected viewer access to private player stats rejected with HTTP 403.\n`);

    // --- TEST 7: Owner Access to Private Profile (HTTP 200) ---
    console.log('--- TEST 7: Privacy Guard: Owner Access (HTTP 200) ---');
    const privateToken = jwt.sign({ id: privateUser._id, role: privateUser.role }, jwtSecret, { expiresIn: '1h' });
    const res7 = await fetch(`${BASE_URL}/players/${privatePlayer._id}/stats`, {
      headers: { Authorization: `Bearer ${privateToken}` },
    });
    const data7 = await res7.json();

    if (!res7.ok || !data7.success) {
      throw new Error(`TEST 7 Failed: Owner could not access their private career stats`);
    }
    console.log(`✅ TEST 7 PASSED: Owner can always view their own private career stats.\n`);

    console.log('=====================================================');
    console.log('🎉 ALL 7 / 7 CAREER STATISTICS TESTS PASSED!');
    console.log('=====================================================');

    // Clean up test documents
    await User.deleteMany({ _id: { $in: [starUser._id, privateUser._id, strangerUser._id, friendUser._id] } });
    await Player.deleteMany({ _id: { $in: [starPlayer._id, privatePlayer._id, strangerPlayer._id, friendPlayer._id] } });
    await Match.deleteMany({ _id: { $in: [t20Match._id, t10Match._id] } });
    await Innings.deleteMany({ match: { $in: [t20Match._id, t10Match._id] } });
    await Connection.deleteMany({ requester: friendPlayer._id, receiver: privatePlayer._id });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runTests();
