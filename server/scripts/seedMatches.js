import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Match from '../models/Match.js';

dotenv.config();

const sampleMatches = [
  {
    team1: 'Royal Challengers',
    team2: 'Mumbai Indians',
    format: 'T20',
    overs: 20,
    venue: 'M. Chinnaswamy Stadium',
    city: 'Bengaluru',
    date: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago -> Live
    tournament: 'Indian Premier League 2026',
    tossWinner: 'Royal Challengers',
    tossDecision: 'bat',
    status: 'live',
    result: 'Match in progress (RCB: 142/3 in 15.2 ov)',
  },
  {
    team1: 'Chennai Super Kings',
    team2: 'Gujarat Titans',
    format: 'T20',
    overs: 20,
    venue: 'MA Chidambaram Stadium',
    city: 'Chennai',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 days from now -> Scheduled
    tournament: 'Indian Premier League 2026',
    tossWinner: '',
    tossDecision: '',
    status: 'scheduled',
    result: 'Match scheduled to start at 7:30 PM IST',
  },
  {
    team1: 'Delhi Capitals',
    team2: 'Sunrisers',
    format: 'T20',
    overs: 20,
    venue: 'Arun Jaitley Stadium',
    city: 'Delhi',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4), // 4 days from now -> Scheduled
    tournament: 'Indian Premier League 2026',
    tossWinner: '',
    tossDecision: '',
    status: 'scheduled',
    result: 'Match scheduled to start at 3:30 PM IST',
  },
  {
    team1: 'Mumbai Indians',
    team2: 'Lucknow Super Giants',
    format: 'T20',
    overs: 20,
    venue: 'Wankhede Stadium',
    city: 'Mumbai',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago -> Completed
    tournament: 'Indian Premier League 2026',
    tossWinner: 'Mumbai Indians',
    tossDecision: 'bowl',
    status: 'completed',
    winner: 'Mumbai Indians',
    result: 'Mumbai Indians won by 6 wickets (with 8 balls remaining)',
  },
  {
    team1: 'Northern Superchargers',
    team2: 'Southern Brave',
    format: 'T10',
    overs: 10,
    venue: 'Headingley Stadium',
    city: 'Leeds',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago -> Completed
    tournament: 'T10 Super League',
    tossWinner: 'Northern Superchargers',
    tossDecision: 'bat',
    status: 'completed',
    winner: 'Northern Superchargers',
    result: 'Northern Superchargers won by 18 runs',
  },
  {
    team1: 'India Masters',
    team2: 'Australia Legends',
    format: 'ODI',
    overs: 50,
    venue: 'Melbourne Cricket Ground',
    city: 'Melbourne',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 1 week from now -> Scheduled
    tournament: 'Legends ODI World Series',
    tossWinner: '',
    tossDecision: '',
    status: 'scheduled',
    result: 'Day/Night ODI fixture scheduled',
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse');
  console.log('Connected to MongoDB for match seeding...');

  // Find or create admin user for createdBy
  let adminUser = await User.findOne();
  if (!adminUser) {
    adminUser = await User.create({
      username: 'match_admin',
      email: 'admin@crickpulse.test',
      password: 'password123',
      role: 'admin',
    });
  }

  // Clear existing sample matches with these titles
  await Match.deleteMany({
    $or: sampleMatches.map((m) => ({ team1: m.team1, team2: m.team2 })),
  });

  for (const m of sampleMatches) {
    await Match.create({
      ...m,
      createdBy: adminUser._id,
    });
    console.log(`Created match: ${m.team1} vs ${m.team2} (${m.status.toUpperCase()})`);
  }

  console.log('\nMatches seeded successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Match seeding error:', err);
  process.exit(1);
});
