import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';
import Innings from '../models/Innings.js';
import Connection from '../models/Connection.js';
import Notification from '../models/Notification.js';

dotenv.config();

async function cleanSeedData() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // 1. Identify all seed/test users
    const seedUsers = await User.find({
      email: { $regex: /@crickpulse\.test$/i },
    });
    const seedUserIds = seedUsers.map((u) => u._id);
    console.log(`Found ${seedUsers.length} seed/test users to remove.`);

    // 2. Identify corresponding seed/test players
    const seedPlayers = await Player.find({
      $or: [
        { userId: { $in: seedUserIds } },
        { displayName: { $regex: /\d{10,}/ } },
      ],
    });
    const seedPlayerIds = seedPlayers.map((p) => p._id);
    console.log(`Found ${seedPlayers.length} seed/test players to remove:`, seedPlayers.map(p => p.displayName));

    // 3. Delete seed players
    const deletedPlayersRes = await Player.deleteMany({
      _id: { $in: seedPlayerIds },
    });
    console.log(`Deleted ${deletedPlayersRes.deletedCount} seed players.`);

    // 4. Delete seed users
    const deletedUsersRes = await User.deleteMany({
      _id: { $in: seedUserIds },
    });
    console.log(`Deleted ${deletedUsersRes.deletedCount} seed users.`);

    // 5. Delete connections involving deleted players
    const deletedConnsRes = await Connection.deleteMany({
      $or: [
        { requester: { $in: seedPlayerIds } },
        { receiver: { $in: seedPlayerIds } },
      ],
    });
    console.log(`Deleted ${deletedConnsRes.deletedCount} connections linked to seed players.`);

    // 6. Delete notifications involving deleted players
    const deletedNotifsRes = await Notification.deleteMany({
      $or: [
        { recipient: { $in: seedPlayerIds } },
        { sender: { $in: seedPlayerIds } },
      ],
    });
    console.log(`Deleted ${deletedNotifsRes.deletedCount} notifications linked to seed players.`);

    // 7. Identify and delete seed teams
    const seedTeamNames = [
      'Royal Challengers',
      'Mumbai Indians',
      'Chennai Super Kings',
      'Gujarat Titans',
      'Delhi Capitals',
      'Kolkata Knight Riders',
      'Bangalore Blasters',
      'Chennai Champions',
      'Karnataka Kings',
    ];
    const deletedTeamsRes = await Team.deleteMany({
      $or: [
        { name: { $in: seedTeamNames } },
        { createdBy: { $in: seedUserIds } },
      ],
    });
    console.log(`Deleted ${deletedTeamsRes.deletedCount} seed teams.`);

    // 8. Identify and delete seed matches
    const seedTournaments = [
      'Indian Premier League 2026',
      'T10 Super League',
      'Legends ODI World Series',
    ];
    const seedMatches = await Match.find({
      $or: [
        { tournament: { $in: seedTournaments } },
        { createdBy: { $in: seedUserIds } },
      ],
    });
    const seedMatchIds = seedMatches.map((m) => m._id);

    // 9. Delete innings belonging to seed matches
    const deletedInningsRes = await Innings.deleteMany({
      match: { $in: seedMatchIds },
    });
    console.log(`Deleted ${deletedInningsRes.deletedCount} innings linked to seed matches.`);

    // 10. Delete seed matches
    const deletedMatchesRes = await Match.deleteMany({
      _id: { $in: seedMatchIds },
    });
    console.log(`Deleted ${deletedMatchesRes.deletedCount} seed matches.`);

    // 11. Print remaining genuine user data summary
    const remainingUsers = await User.find().select('username email role');
    const remainingPlayers = await Player.find().select('displayName city currentTeam');
    const remainingTeams = await Team.find().select('name city');
    const remainingMatches = await Match.find().select('team1 team2 tournament');

    console.log('\n=============================================');
    console.log('REMAINING USER DATA (PRESERVED):');
    console.log('Users:', remainingUsers);
    console.log('Players:', remainingPlayers);
    console.log('Teams:', remainingTeams);
    console.log('Matches:', remainingMatches);
    console.log('=============================================');

    await mongoose.disconnect();
    console.log('\nSeed data cleanup completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning seed data:', error);
    process.exit(1);
  }
}

cleanSeedData();