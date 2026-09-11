import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Player from '../models/Player.js';

dotenv.config();

const samplePlayersData = [
  {
    username: 'virat_runmachine',
    email: 'virat@crickpulse.test',
    displayName: 'Virat Kohli',
    playingRole: 'Batter',
    currentTeam: 'Royal Challengers',
    city: 'Bengaluru',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    jerseyNumber: 18,
    bio: 'Passionate batter known for chase mastery, fitness, and modern batting consistency.',
    profileImage: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'rohit_hitman',
    email: 'rohit@crickpulse.test',
    displayName: 'Rohit Sharma',
    playingRole: 'Batter',
    currentTeam: 'Mumbai Indians',
    city: 'Mumbai',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm offbreak',
    jerseyNumber: 45,
    bio: 'Opening batter with elegant timing and world-record double centuries.',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'bumrah_yorker',
    email: 'jasprit@crickpulse.test',
    displayName: 'Jasprit Bumrah',
    playingRole: 'Bowler',
    currentTeam: 'Mumbai Indians',
    city: 'Ahmedabad',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm fast',
    jerseyNumber: 93,
    bio: 'Specialist fast bowler mastering lethal toe-crushing yorkers and variations.',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'hardik_kungfu',
    email: 'hardik@crickpulse.test',
    displayName: 'Hardik Pandya',
    playingRole: 'All-Rounder',
    currentTeam: 'Mumbai Indians',
    city: 'Baroda',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm fast-medium',
    jerseyNumber: 33,
    bio: 'High-impact power hitter in the death overs and reliable seam-bowling all-rounder.',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'rishabh_spidey',
    email: 'pant@crickpulse.test',
    displayName: 'Rishabh Pant',
    playingRole: 'Wicketkeeper',
    currentTeam: 'Delhi Capitals',
    city: 'Delhi',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'None',
    jerseyNumber: 17,
    bio: 'Fearless wicketkeeper-batter who thrives under pressure and counter-attacks.',
    profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'rashid_magician',
    email: 'rashid@crickpulse.test',
    displayName: 'Rashid Khan',
    playingRole: 'Bowler',
    currentTeam: 'Gujarat Titans',
    city: 'Kabul',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm legbreak',
    jerseyNumber: 19,
    bio: 'Spin wizard bowling rapid googlies and handy lower-order pinch hitting.',
    profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'ben_clutch',
    email: 'stokes@crickpulse.test',
    displayName: 'Ben Stokes',
    playingRole: 'All-Rounder',
    currentTeam: 'Northern Superchargers',
    city: 'London',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Right-arm fast-medium',
    jerseyNumber: 55,
    bio: 'Clutch performer who rises to the biggest occasions with bat and ball.',
    profileImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'pat_silencer',
    email: 'cummins@crickpulse.test',
    displayName: 'Pat Cummins',
    playingRole: 'Bowler',
    currentTeam: 'Sunrisers',
    city: 'Sydney',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm fast',
    jerseyNumber: 30,
    bio: 'World-class fast bowling leader with lethal pace, bounce, and composure.',
    profileImage: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'kl_class',
    email: 'rahul@crickpulse.test',
    displayName: 'KL Rahul',
    playingRole: 'Wicketkeeper',
    currentTeam: 'Lucknow Super Giants',
    city: 'Bengaluru',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'None',
    jerseyNumber: 1,
    bio: 'Technically sound stroke-maker capable of opening or anchoring the middle order.',
    profileImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'ravindra_sir',
    email: 'jadeja@crickpulse.test',
    displayName: 'Ravindra Jadeja',
    playingRole: 'All-Rounder',
    currentTeam: 'Chennai Super Kings',
    city: 'Rajkot',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Slow left-arm orthodox',
    jerseyNumber: 8,
    bio: 'Electric 3D all-rounder: bullet throwing arm, pinpoint spin, and left-handed batting punch.',
    profileImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'shubman_prince',
    email: 'gill@crickpulse.test',
    displayName: 'Shubman Gill',
    playingRole: 'Batter',
    currentTeam: 'Gujarat Titans',
    city: 'Chandigarh',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm offbreak',
    jerseyNumber: 77,
    bio: 'Next-gen batting star with sublime short-arm jabs and textbook cover drives.',
    profileImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'travis_headstrike',
    email: 'travis@crickpulse.test',
    displayName: 'Travis Head',
    playingRole: 'Batter',
    currentTeam: 'Sunrisers',
    city: 'Adelaide',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Right-arm offbreak',
    jerseyNumber: 62,
    bio: 'Ultra-aggressive opener who dismantles powerplay bowling with ruthless intent.',
    profileImage: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=400&q=80',
  },
];

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB for seeding...');

  for (const item of samplePlayersData) {
    let user = await User.findOne({
      $or: [{ username: item.username }, { email: item.email }],
    });
    if (!user) {
      user = await User.create({
        username: item.username,
        email: item.email,
        password: 'password123',
        profileImage: item.profileImage,
        city: item.city,
        bio: item.bio,
      });
      console.log(`Created user: ${user.username}`);
    } else {
      user.profileImage = item.profileImage;
      user.city = item.city;
      user.bio = item.bio;
      await user.save();
    }

    let player = await Player.findOne({ userId: user._id });
    if (!player) {
      player = await Player.create({
        userId: user._id,
        displayName: item.displayName,
        profileImage: item.profileImage,
        playingRole: item.playingRole,
        currentTeam: item.currentTeam,
        city: item.city,
        battingStyle: item.battingStyle,
        bowlingStyle: item.bowlingStyle,
        jerseyNumber: item.jerseyNumber,
        bio: item.bio,
      });
      console.log(`Created player profile for: ${item.displayName}`);
    } else {
      player.displayName = item.displayName;
      player.profileImage = item.profileImage;
      player.playingRole = item.playingRole;
      player.currentTeam = item.currentTeam;
      player.city = item.city;
      player.battingStyle = item.battingStyle;
      player.bowlingStyle = item.bowlingStyle;
      player.jerseyNumber = item.jerseyNumber;
      player.bio = item.bio;
      await player.save();
      console.log(`Updated player profile for: ${item.displayName}`);
    }
  }

  console.log('Seeding completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
