import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';

dotenv.config();

const seedTeams = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';
    await mongoose.connect(mongoUri);
    console.log('[SeedTeams] Connected to MongoDB');

    // Get an admin or primary user for createdBy
    let user = await User.findOne();
    if (!user) {
      console.log('[SeedTeams] No user found. Creating seed admin...');
      user = await User.create({
        username: 'team_admin',
        email: 'team_admin@crickpulse.test',
        password: 'Password123!',
        role: 'admin',
      });
    }

    // Find players
    const virat = await Player.findOne({ displayName: /Virat/i });
    const rohit = await Player.findOne({ displayName: /Rohit/i });
    const bumrah = await Player.findOne({ displayName: /Bumrah/i });
    const hardik = await Player.findOne({ displayName: /Hardik/i });
    const kl = await Player.findOne({ displayName: /Rahul/i });
    const shami = await Player.findOne({ displayName: /Shami/i });
    const allPlayers = await Player.find();

    const sampleTeams = [
      {
        name: 'Royal Challengers',
        city: 'Bengaluru',
        description: 'Dynamic Bengaluru franchise powered by bold play, high-energy fans, and an explosive batting lineup.',
        logo: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=400&q=80',
        captain: virat ? virat._id : null,
        viceCaptain: kl ? kl._id : null,
        createdBy: user._id,
        members: [virat, kl].filter(Boolean).map((p) => p._id),
      },
      {
        name: 'Mumbai Indians',
        city: 'Mumbai',
        description: 'Record 5-time championship franchise celebrating tactical brilliance, match-winners, and relentless pride.',
        logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        captain: rohit ? rohit._id : null,
        viceCaptain: bumrah ? bumrah._id : (hardik ? hardik._id : null),
        createdBy: user._id,
        members: [rohit, bumrah, hardik].filter(Boolean).map((p) => p._id),
      },
      {
        name: 'Chennai Super Kings',
        city: 'Chennai',
        description: 'The iconic Whistle Podu brigade known for composure, tactical spin mastery, and championship pedigree.',
        logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        captain: shami ? shami._id : null,
        viceCaptain: null,
        createdBy: user._id,
        members: [shami].filter(Boolean).map((p) => p._id),
      },
      {
        name: 'Gujarat Titans',
        city: 'Ahmedabad',
        description: 'Tenacious, fast-rising powerhouse known for ice-cold run chases and fierce team camaraderie.',
        logo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        captain: hardik ? hardik._id : null,
        viceCaptain: null,
        createdBy: user._id,
        members: [hardik].filter(Boolean).map((p) => p._id),
      },
      {
        name: 'Delhi Capitals',
        city: 'Delhi',
        description: 'Fearless young franchise blending raw fast bowling talent with dynamic middle-order stroke play.',
        logo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
        captain: null,
        viceCaptain: null,
        createdBy: user._id,
        members: [],
      },
    ];

    for (const teamData of sampleTeams) {
      await Team.findOneAndUpdate(
        { name: teamData.name },
        { $set: teamData },
        { upsert: true, new: true }
      );
      console.log(`[SeedTeams] Synced team: ${teamData.name} (${teamData.city})`);
    }

    console.log('[SeedTeams] Successfully seeded 5 teams!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[SeedTeams] Error seeding teams:', error);
    process.exit(1);
  }
};

seedTeams();
