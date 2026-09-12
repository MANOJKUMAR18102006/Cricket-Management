import mongoose from 'mongoose';

const teamInvitationSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team reference is required'],
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Inviting captain reference is required'],
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Invited player reference is required'],
      index: true,
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
      default: 'We would like you to join our team.',
      maxlength: [300, 'Invitation message cannot exceed 300 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient lookup
teamInvitationSchema.index({ team: 1, player: 1, status: 1 });
teamInvitationSchema.index({ player: 1, status: 1 });
teamInvitationSchema.index({ team: 1, createdAt: -1 });

const TeamInvitation = mongoose.model('TeamInvitation', teamInvitationSchema);

export default TeamInvitation;
