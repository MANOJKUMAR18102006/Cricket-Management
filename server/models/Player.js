import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: [2, 'Display name must be at least 2 characters'],
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
    profileImage: {
      type: String,
      default: '',
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male',
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    playingRole: {
      type: String,
      required: [true, 'Playing role is required'],
      enum: {
        values: ['Batter', 'Bowler', 'All-Rounder', 'Wicketkeeper'],
        message: '{VALUE} is not a valid playing role',
      },
      default: 'Batter',
    },
    battingStyle: {
      type: String,
      enum: ['Right-hand bat', 'Left-hand bat'],
      default: 'Right-hand bat',
    },
    bowlingStyle: {
      type: String,
      default: 'None',
      trim: true,
    },
    jerseyNumber: {
      type: Number,
      min: [0, 'Jersey number cannot be negative'],
      max: [999, 'Jersey number cannot exceed 999'],
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    currentTeam: {
      type: String,
      default: '',
      trim: true,
    },
    profileVisibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
    },
  },
  {
    timestamps: true,
  }
);

const Player = mongoose.model('Player', playerSchema);

export default Player;
