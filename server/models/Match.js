import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    team1: {
      type: String,
      required: [true, 'Team 1 name is required'],
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters'],
      maxlength: [60, 'Team name cannot exceed 60 characters'],
    },
    team2: {
      type: String,
      required: [true, 'Team 2 name is required'],
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters'],
      maxlength: [60, 'Team name cannot exceed 60 characters'],
    },
    format: {
      type: String,
      required: [true, 'Match format is required'],
      enum: {
        values: ['T10', 'T20', 'ODI', 'Custom'],
        message: '{VALUE} is not a valid cricket format',
      },
      default: 'T20',
    },
    overs: {
      type: Number,
      required: [true, 'Number of overs is required'],
      min: [1, 'Overs must be at least 1'],
      max: [100, 'Overs cannot exceed 100'],
      default: 20,
    },
    venue: {
      type: String,
      required: [true, 'Match venue is required'],
      trim: true,
      maxlength: [100, 'Venue cannot exceed 100 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [60, 'City cannot exceed 60 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Match date and time is required'],
    },
    tournament: {
      type: String,
      default: '',
      trim: true,
      maxlength: [80, 'Tournament name cannot exceed 80 characters'],
    },
    tossWinner: {
      type: String,
      default: '',
      trim: true,
    },
    tossDecision: {
      type: String,
      enum: ['bat', 'bowl', ''],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'live', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid match status',
      },
      default: 'scheduled',
    },
    winner: {
      type: String,
      default: '',
      trim: true,
    },
    result: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Result message cannot exceed 200 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to optimize status-based fixture queries and chronologic sorting
matchSchema.index({ status: 1, date: 1 });
matchSchema.index({ date: -1 });
matchSchema.index({ createdBy: 1 });

const Match = mongoose.model('Match', matchSchema);

export default Match;
