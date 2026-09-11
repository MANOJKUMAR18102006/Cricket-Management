import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Notification recipient player is required'],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Notification sender player is required'],
    },
    type: {
      type: String,
      enum: ['connection_request', 'connection_accepted', 'connection_rejected'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Connection',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
