import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Connection from '../models/Connection.js';
import Match from '../models/Match.js';
import Innings from '../models/Innings.js';
import Team from '../models/Team.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'crickpulse_secret_key_2026', {
    expiresIn: '1h',
  });
};

async function runAnalyticsTestSuite() {
  console.log('=====================================================');
  console.log('📊 CRICKPULSE ANALYTICS & LEADERBOARDS TEST SUITE');
  console.log('=====================================================\n');

  await mongoose.connect(MONGODB_URI);
  const stamp = Date.now();

  let testUserPublic, testPlayerPublic, tokenPublic;
  let testUserPrivateConnected, testPlayerPrivateConnected, tokenPrivateConnected;
  let testUserPrivateUnconnected, testPlayerPrivateUnconnected, tokenPrivateUnconnected;
  let testTeamA, testTeamB, testMatch1, testMatch2, testInnings1, testInnings2;

  try {
    // 1. Create Public Player (Star All-Rounder)
    testUserPublic = await User.create({
      username: `pub_star_${stamp}`,
      email: `pub_star_${stamp}@crickpulse.test`,
      password: 'password123',
      role: 'player',
    });
    testPlayerPublic = await Player.create({
      userId: testUserPublic._id,
      displayName: `Public Star ${stamp}`,
      playingRole: 'All-Rounder',
      profileVisibility: 'public', // PUBLIC
      city: 'Chennai',
      currentTeam: 'Super Stars',
    });
    tokenPublic = generateToken(testUserPublic._id);

    // 2. Create Private Connected Player (Connected to Public Star)
    testUserPrivateConnected = await User.create({
      username: `priv_conn_${stamp}`,
      email: `priv_conn_${stamp}@crickpulse.test`,
      password: 'password123',
      role: 'player',
    });
    testPlayerPrivateConnected = await Player.create({
      userId: testUserPrivateConnected._id,
      displayName: `Private Connected ${stamp}`,
      playingRole: 'Batter',
      profileVisibility: 'private', // PRIVATE
      city: 'Coimbatore',
      currentTeam: 'Super Stars',
    });
    tokenPrivateConnected = generateToken(testUserPrivateConnected._id);

    // 3. Create Private Unconnected Player (Secret Champion)
    testUserPrivateUnconnected = await User.create({
      username: `priv_secret_${stamp}`,
      email: `priv_secret_${stamp}@crickpulse.test`,
      password: 'password123',
      role: 'player',
    });
    testPlayerPrivateUnconnected = await Player.create({
      userId: testUserPrivateUnconnected._id,
      displayName: `Private Secret ${stamp}`,
      playingRole: 'Bowler',
      profileVisibility: 'private', // PRIVATE & NOT CONNECTED
      city: 'Madurai',
      currentTeam: 'Rivals FC',
    });
    tokenPrivateUnconnected = generateToken(testUserPrivateUnconnected._id);

    // Accepted Connection between Public Star and Private Connected
    await Connection.create({
      requester: testPlayerPublic._id,
      receiver: testPlayerPrivateConnected._id,
      status: 'accepted',
    });

    // Teams
    testTeamA = await Team.create({
      name: `Super Stars ${stamp}`,
      city: 'Chennai',
      createdBy: testUserPublic._id,
      members: [testPlayerPublic._id, testPlayerPrivateConnected._id],
    });

    testTeamB = await Team.create({
      name: `Rivals FC ${stamp}`,
      city: 'Madurai',
      createdBy: testUserPrivateUnconnected._id,
      members: [testPlayerPrivateUnconnected._id],
    });

    // Match 1: T20 Tournament: "Tamil Premier Cup"
    testMatch1 = await Match.create({
      team1: testTeamA.name,
      team2: testTeamB.name,
      format: 'T20',
      overs: 20,
      venue: 'Chepauk Stadium',
      city: 'Chennai',
      date: new Date('2026-03-01'),
      tournament: 'Tamil Premier Cup',
      status: 'completed',
      winner: testTeamA.name,
      createdBy: testUserPublic._id,
    });

    testInnings1 = await Innings.create({
      match: testMatch1._id,
      inningsNumber: 1,
      battingTeam: testTeamA.name,
      bowlingTeam: testTeamB.name,
      totalRuns: 160,
      wickets: 2,
      overs: '20.0',
      batsmen: [
        {
          playerId: testPlayerPublic._id,
          name: testPlayerPublic.displayName,
          runs: 80,
          balls: 40,
          fours: 6,
          sixes: 4,
          isOut: true,
          dismissal: `c ${testPlayerPrivateUnconnected.displayName} b ${testPlayerPrivateUnconnected.displayName}`,
        },
        {
          playerId: testPlayerPrivateConnected._id,
          name: testPlayerPrivateConnected.displayName,
          runs: 60,
          balls: 35,
          fours: 5,
          sixes: 2,
          isOut: false,
        },
      ],
      bowlers: [
        {
          playerId: testPlayerPrivateUnconnected._id,
          name: testPlayerPrivateUnconnected.displayName,
          overs: '4.0',
          legalBalls: 24,
          runsConceded: 28,
          wickets: 2,
        },
      ],
      deliveries: [
        {
          over: 12,
          ballInOver: 4,
          striker: testPlayerPublic.displayName,
          nonStriker: testPlayerPrivateConnected.displayName,
          bowler: testPlayerPrivateUnconnected.displayName,
          isWicket: true,
          wicketType: 'caught',
          commentary: `c ${testPlayerPrivateUnconnected.displayName} b ${testPlayerPrivateUnconnected.displayName}`,
        },
      ],
    });

    // Innings 2: Public Star bowls & takes wickets
    testInnings2 = await Innings.create({
      match: testMatch1._id,
      inningsNumber: 2,
      battingTeam: testTeamB.name,
      bowlingTeam: testTeamA.name,
      totalRuns: 120,
      wickets: 5,
      overs: '18.2',
      batsmen: [
        {
          playerId: testPlayerPrivateUnconnected._id,
          name: testPlayerPrivateUnconnected.displayName,
          runs: 30,
          balls: 25,
          fours: 3,
          sixes: 0,
          isOut: true,
        },
      ],
      bowlers: [
        {
          playerId: testPlayerPublic._id,
          name: testPlayerPublic.displayName,
          overs: '3.2',
          legalBalls: 20,
          runsConceded: 18,
          wickets: 3,
        },
      ],
      deliveries: [
        {
          over: 5,
          ballInOver: 2,
          striker: testPlayerPrivateUnconnected.displayName,
          nonStriker: 'Batter Two',
          bowler: testPlayerPublic.displayName,
          isWicket: true,
          wicketType: 'caught',
          commentary: `c ${testPlayerPrivateConnected.displayName} b ${testPlayerPublic.displayName}`,
        },
      ],
    });

    // --- TEST 1: Public Leaderboard Anonymity / Privacy Check ---
    console.log('--- TEST 1: Public Leaderboard Privacy (Anonymous Request) ---');
    const anonResRaw = await fetch(`${API_BASE}/analytics/leaderboards`);
    if (anonResRaw.status !== 200) {
      throw new Error(`Expected HTTP 200 for public leaderboards, got ${anonResRaw.status}`);
    }
    const anonRes = await anonResRaw.json();

    const anonRunScorers = anonRes.data.topRunScorers;
    const anonHasPublic = anonRunScorers.some((p) => String(p.playerId) === String(testPlayerPublic._id));
    const anonHasPrivateUnconnected = anonRunScorers.some((p) => String(p.playerId) === String(testPlayerPrivateUnconnected._id));
    const anonHasPrivateConnected = anonRunScorers.some((p) => String(p.playerId) === String(testPlayerPrivateConnected._id));

    if (!anonHasPublic) {
      throw new Error('Public player should be visible on public leaderboards.');
    }
    if (anonHasPrivateUnconnected || anonHasPrivateConnected) {
      throw new Error('Private players must NEVER be leaked to anonymous viewers on leaderboards!');
    }
    console.log('✅ TEST 1 PASSED: Anonymous request only sees public players; private players are securely hidden.');

    // --- TEST 2: Connected Player Leaderboard Inclusion ---
    console.log('\n--- TEST 2: Connected Viewer Leaderboard Access ---');
    const authResRaw = await fetch(`${API_BASE}/analytics/leaderboards`, {
      headers: { Authorization: `Bearer ${tokenPublic}` },
    });
    const authRes = await authResRaw.json();
    const authRunScorers = authRes.data.topRunScorers;
    const authHasPublic = authRunScorers.some((p) => String(p.playerId) === String(testPlayerPublic._id));
    const authHasPrivateConn = authRunScorers.some((p) => String(p.playerId) === String(testPlayerPrivateConnected._id));
    const authHasPrivateUnconn = authRunScorers.some((p) => String(p.playerId) === String(testPlayerPrivateUnconnected._id));

    if (!authHasPublic || !authHasPrivateConn) {
      throw new Error('Authenticated viewer should see themselves and their accepted connections.');
    }
    if (authHasPrivateUnconn) {
      throw new Error('Private unconnected player must still remain hidden from viewer!');
    }
    console.log('✅ TEST 2 PASSED: Authenticated viewer sees public players + connected friends, but NOT unconnected private players.');

    // --- TEST 3: All 8 Categories Verification ---
    console.log('\n--- TEST 3: Validate All 8 Leaderboard Categories ---');
    const d = authRes.data;
    const requiredCategories = [
      'topRunScorers',
      'topWicketTakers',
      'bestBattingAverage',
      'bestStrikeRate',
      'mostSixes',
      'mostFours',
      'mostCatches',
      'bestEconomy',
    ];

    for (const cat of requiredCategories) {
      if (!Array.isArray(d[cat])) {
        throw new Error(`Missing leaderboard category: ${cat}`);
      }
    }

    console.log(`Top Runs leader: ${d.topRunScorers[0]?.displayName} (${d.topRunScorers[0]?.statValue} runs)`);
    console.log(`Top Wickets leader: ${d.topWicketTakers[0]?.displayName} (${d.topWicketTakers[0]?.statValue} wickets)`);
    console.log(`Most Sixes leader: ${d.mostSixes[0]?.displayName} (${d.mostSixes[0]?.statValue} sixes)`);
    console.log(`Most Fours leader: ${d.mostFours[0]?.displayName} (${d.mostFours[0]?.statValue} fours)`);
    console.log(`Best Strike Rate leader: ${d.bestStrikeRate[0]?.displayName} (SR: ${d.bestStrikeRate[0]?.statValue})`);
    console.log(`Best Economy leader: ${d.bestEconomy[0]?.displayName} (Econ: ${d.bestEconomy[0]?.statValue})`);
    console.log('✅ TEST 3 PASSED: All 8 required leaderboard categories successfully generated and sorted.');

    // --- TEST 4: Filtering by Tournament & Format ---
    console.log('\n--- TEST 4: Filtering by Tournament & Format ---');
    const filteredResRaw = await fetch(`${API_BASE}/analytics/leaderboards?format=T20&tournament=Tamil+Premier`, {
      headers: { Authorization: `Bearer ${tokenPublic}` },
    });
    const filteredRes = await filteredResRaw.json();
    if (filteredRes.data.topRunScorers.length === 0) {
      throw new Error('Filtered search should return matches for format=T20 and tournament=Tamil Premier');
    }

    const emptyFilterResRaw = await fetch(`${API_BASE}/analytics/leaderboards?format=ODI`, {
      headers: { Authorization: `Bearer ${tokenPublic}` },
    });
    const emptyFilterRes = await emptyFilterResRaw.json();
    if (emptyFilterRes.data.topRunScorers.length !== 0) {
      throw new Error('Filter format=ODI should return 0 results since match was T20');
    }
    console.log('✅ TEST 4 PASSED: Leaderboard filtering by format and tournament functions correctly.');

    // --- TEST 5: Player Analytics Privacy Guard (HTTP 403) ---
    console.log('\n--- TEST 5: Player Analytics Privacy Guard (HTTP 403) ---');
    const unauthAnalyticsRes = await fetch(`${API_BASE}/analytics/players/${testPlayerPrivateUnconnected._id}`, {
      headers: { Authorization: `Bearer ${tokenPublic}` },
    });

    if (unauthAnalyticsRes.status !== 403) {
      throw new Error(`Expected HTTP 403 when accessing unconnected private player analytics, got ${unauthAnalyticsRes.status}`);
    }
    const unauthData = await unauthAnalyticsRes.json();
    if (!unauthData.privacyRestricted) {
      throw new Error('Expected privacyRestricted: true in 403 response payload.');
    }
    console.log(`✅ TEST 5 PASSED: Blocked with HTTP 403: "${unauthData.message}"`);

    // --- TEST 6: Player Analytics Authorized Access & Trends Output ---
    console.log('\n--- TEST 6: Player Analytics Authorized Access & Trends ---');
    const analyticsResRaw = await fetch(`${API_BASE}/analytics/players/${testPlayerPublic._id}`, {
      headers: { Authorization: `Bearer ${tokenPublic}` },
    });

    if (analyticsResRaw.status !== 200) {
      throw new Error(`Expected HTTP 200 for player analytics, got ${analyticsResRaw.status}`);
    }

    const analyticsRes = await analyticsResRaw.json();
    const analyticsData = analyticsRes.data;
    if (!analyticsData.recentForm || !Array.isArray(analyticsData.recentForm)) {
      throw new Error('Analytics missing recentForm array.');
    }
    if (!analyticsData.runsPerMatch || !Array.isArray(analyticsData.runsPerMatch)) {
      throw new Error('Analytics missing runsPerMatch array.');
    }
    if (!analyticsData.strikeRateTrend || !Array.isArray(analyticsData.strikeRateTrend)) {
      throw new Error('Analytics missing strikeRateTrend array.');
    }
    if (!analyticsData.wicketsTrend || !Array.isArray(analyticsData.wicketsTrend)) {
      throw new Error('Analytics missing wicketsTrend array.');
    }
    if (!analyticsData.performanceOverTime || !Array.isArray(analyticsData.performanceOverTime)) {
      throw new Error('Analytics missing performanceOverTime array.');
    }

    console.log(`Recent form badge: ${analyticsData.recentForm[0]?.badge}`);
    console.log(`Runs per match items: ${analyticsData.runsPerMatch.length}`);
    console.log(`Strike rate trend items: ${analyticsData.strikeRateTrend.length}`);
    console.log(`Wickets trend items: ${analyticsData.wicketsTrend.length}`);
    console.log(`Performance over time items: ${analyticsData.performanceOverTime.length}`);
    console.log('✅ TEST 6 PASSED: Player analytics returned all required trends and form badges.');

    console.log('\n=====================================================');
    console.log('🎉 ALL 6 / 6 ANALYTICS & LEADERBOARD TESTS PASSED!');
    console.log('=====================================================\n');
  } finally {
    // Clean up seed/test data
    try {
      if (testInnings1) await Innings.findByIdAndDelete(testInnings1._id);
      if (testInnings2) await Innings.findByIdAndDelete(testInnings2._id);
      if (testMatch1) await Match.findByIdAndDelete(testMatch1._id);
      if (testTeamA) await Team.findByIdAndDelete(testTeamA._id);
      if (testTeamB) await Team.findByIdAndDelete(testTeamB._id);
      if (testPlayerPublic) await Player.findByIdAndDelete(testPlayerPublic._id);
      if (testPlayerPrivateConnected) await Player.findByIdAndDelete(testPlayerPrivateConnected._id);
      if (testPlayerPrivateUnconnected) await Player.findByIdAndDelete(testPlayerPrivateUnconnected._id);
      if (testUserPublic) await User.findByIdAndDelete(testUserPublic._id);
      if (testUserPrivateConnected) await User.findByIdAndDelete(testUserPrivateConnected._id);
      if (testUserPrivateUnconnected) await User.findByIdAndDelete(testUserPrivateUnconnected._id);
      await Connection.deleteMany({
        $or: [
          { requester: { $in: [testPlayerPublic?._id, testPlayerPrivateConnected?._id, testPlayerPrivateUnconnected?._id] } },
          { receiver: { $in: [testPlayerPublic?._id, testPlayerPrivateConnected?._id, testPlayerPrivateUnconnected?._id] } },
        ],
      });
      console.log('🧹 Cleaned up temporary test data cleanly.');
    } catch (cleanErr) {
      console.error('Error during cleanup:', cleanErr.message);
    }
    await mongoose.disconnect();
  }
}

runAnalyticsTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
