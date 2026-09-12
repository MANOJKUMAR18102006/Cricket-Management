import mongoose from 'mongoose';

const tournamentInvitationSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament reference is required'],
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team reference is required'],
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviting user reference is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    message: {
      type: String,
      trim: true,
      default: 'You are invited to participate in this tournament.',
      maxlength: [300, 'Invitation message cannot exceed 300 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
tournamentInvitationSchema.index({ tournament: 1, team: 1, status: 1 });
tournamentInvitationSchema.index({ team: 1, status: 1 });
tournamentInvitationSchema.index({ tournament: 1, createdAt: -1 });

const TournamentInvitation = mongoose.model('TournamentInvitation', tournamentInvitationSchema);

export default TournamentInvitation;
