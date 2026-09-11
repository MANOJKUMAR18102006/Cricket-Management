import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Requester player is required'],
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Receiver player is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'rejected', 'blocked'],
        message: '{VALUE} is not a valid connection status',
      },
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to accelerate lookup and maintain integrity
connectionSchema.index({ requester: 1, receiver: 1 }, { unique: true });
connectionSchema.index({ receiver: 1, status: 1 });
connectionSchema.index({ requester: 1, status: 1 });

const Connection = mongoose.model('Connection', connectionSchema);

export default Connection;
