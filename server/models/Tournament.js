import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tournament name is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Tournament name must be at least 3 characters'],
      maxlength: [100, 'Tournament name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    logo: {
      type: String,
      trim: true,
      default: '',
    },
    banner: {
      type: String,
      trim: true,
      default: '',
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer user reference is required'],
      index: true,
    },
    location: {
      type: String,
      required: [true, 'Location / ground venue is required'],
      trim: true,
      maxlength: [120, 'Location cannot exceed 120 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [60, 'City cannot exceed 60 characters'],
      index: true,
    },
    format: {
      type: String,
      required: [true, 'Tournament format is required'],
      enum: {
        values: ['T10', 'T20', 'ODI', 'Custom'],
        message: '{VALUE} is not a valid format',
      },
      default: 'T20',
      index: true,
    },
    overs: {
      type: Number,
      required: [true, 'Number of overs is required'],
      min: [1, 'Overs must be at least 1'],
      max: [100, 'Overs cannot exceed 100'],
      default: 20,
    },
    startDate: {
      type: Date,
      required: [true, 'Tournament start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'Tournament end date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['upcoming', 'registration_open', 'ongoing', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid tournament status',
      },
      default: 'upcoming',
      index: true,
    },
    maxTeams: {
      type: Number,
      required: [true, 'Maximum number of teams is required'],
      min: [2, 'A tournament must have at least 2 teams'],
      max: [64, 'Maximum teams cannot exceed 64'],
      default: 8,
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance searching and filtering
tournamentSchema.index({ status: 1, startDate: 1 });
tournamentSchema.index({ city: 1, status: 1 });
tournamentSchema.index({ format: 1, status: 1 });
tournamentSchema.index({ teams: 1 });

const Tournament = mongoose.model('Tournament', tournamentSchema);

export default Tournament;
