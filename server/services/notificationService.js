import Notification from '../models/Notification.js';
import Team from '../models/Team.js';
import Player from '../models/Player.js';

/**
 * Core notification creation function with Socket.IO real-time emission readiness
 * 
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.recipient Player ID receiving the notification
 * @param {string|mongoose.Types.ObjectId|null} params.sender Player ID who triggered the action
 * @param {string} params.type Notification type
 * @param {string} params.message Notification message
 * @param {string|mongoose.Types.ObjectId|null} params.relatedId Related Entity ID (Match, Team, Connection)
 * @returns {Promise<Notification>}
 */
export const createNotification = async ({
  recipient,
  sender = null,
  type,
  message,
  relatedId = null,
}) => {
  if (!recipient) return null;

  // Prevent sending notification to self
  if (sender && String(recipient) === String(sender)) {
    return null;
  }

  const notification = await Notification.create({
    recipient,
    sender,
    type,
    message,
    relatedId,
    read: false,
  });

  const populated = await Notification.findById(notification._id).populate({
    path: 'sender',
    select: 'displayName profileImage playingRole currentTeam city',
  });

  // Socket.IO real-time hook: ready for future real-time socket server integration
  if (typeof global !== 'undefined' && global.io) {
    try {
      global.io.to(`player_${recipient}`).emit('new_notification', populated);
    } catch (socketErr) {
      console.warn('Socket emission failed:', socketErr.message);
    }
  }

  return populated;
};

/**
 * Dispatch connection request notification
 */
export const notifyConnectionRequest = async ({ requester, receiver, connectionId }) => {
  return createNotification({
    recipient: receiver._id || receiver,
    sender: requester._id || requester,
    type: 'connection_request',
    message: `${requester.displayName || 'A player'} sent you a connection request.`,
    relatedId: connectionId,
  });
};

/**
 * Dispatch connection accepted notification
 */
export const notifyConnectionAccepted = async ({ requester, receiver, connectionId }) => {
  return createNotification({
    recipient: requester._id || requester,
    sender: receiver._id || receiver,
    type: 'connection_accepted',
    message: `${receiver.displayName || 'A player'} accepted your connection request. You can now view each other's statistics.`,
    relatedId: connectionId,
  });
};

/**
 * Dispatch connection rejected notification
 */
export const notifyConnectionRejected = async ({ requester, receiver, connectionId }) => {
  return createNotification({
    recipient: requester._id || requester,
    sender: receiver._id || receiver,
    type: 'connection_rejected',
    message: `${receiver.displayName || 'A player'} declined your connection request.`,
    relatedId: connectionId,
  });
};

/**
 * Dispatch team added notification
 */
export const notifyTeamAdded = async ({ player, team, senderPlayer }) => {
  const pId = player._id || player;
  const tName = team.name || 'a team';
  return createNotification({
    recipient: pId,
    sender: senderPlayer?._id || senderPlayer || null,
    type: 'team_added',
    message: `You have been added to the ${tName} squad.`,
    relatedId: team._id || team,
  });
};

/**
 * Dispatch team removed notification
 */
export const notifyTeamRemoved = async ({ player, team, senderPlayer }) => {
  const pId = player._id || player;
  const tName = team.name || 'the team';
  return createNotification({
    recipient: pId,
    sender: senderPlayer?._id || senderPlayer || null,
    type: 'team_removed',
    message: `You have been removed from the ${tName} squad.`,
    relatedId: team._id || team,
  });
};

/**
 * Dispatch match invitation notification to opponent team captain & members
 */
export const notifyMatchInvitation = async ({ match, invitedTeamName, creatorPlayer }) => {
  try {
    const oppTeam = await Team.findOne({
      name: { $regex: new RegExp(`^${invitedTeamName.trim()}$`, 'i') },
    });

    if (!oppTeam) return;

    const recipients = new Set();
    if (oppTeam.captain) recipients.add(String(oppTeam.captain));
    if (Array.isArray(oppTeam.members)) {
      oppTeam.members.forEach((m) => recipients.add(String(m)));
    }

    const matchDateStr = match.date
      ? new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'upcoming';

    for (const recId of recipients) {
      await createNotification({
        recipient: recId,
        sender: creatorPlayer?._id || null,
        type: 'match_invitation',
        message: `Match scheduled: ${match.team1} vs ${match.team2} on ${matchDateStr} at ${match.venue}.`,
        relatedId: match._id,
      });
    }
  } catch (err) {
    console.error('Error dispatching match invitation notifications:', err.message);
  }
};

/**
 * Dispatch match completed notification to members and captains of both teams
 */
export const notifyMatchCompleted = async ({ match, creatorPlayer = null }) => {
  try {
    const teams = await Team.find({
      name: {
        $in: [
          new RegExp(`^${match.team1.trim()}$`, 'i'),
          new RegExp(`^${match.team2.trim()}$`, 'i'),
        ],
      },
    });

    const recipients = new Set();
    teams.forEach((t) => {
      if (t.captain) recipients.add(String(t.captain));
      if (Array.isArray(t.members)) {
        t.members.forEach((m) => recipients.add(String(m)));
      }
    });

    const outcomeText = match.result || (match.winner ? `${match.winner} won the match` : 'Match finished');
    const msg = `Match completed: ${match.team1} vs ${match.team2}. ${outcomeText}.`;

    for (const recId of recipients) {
      await createNotification({
        recipient: recId,
        sender: creatorPlayer?._id || null,
        type: 'match_completed',
        message: msg,
        relatedId: match._id,
      });
    }
  } catch (err) {
    console.error('Error dispatching match completed notifications:', err.message);
  }
};

/**
 * Dispatch team invitation notification to target player
 */
export const notifyTeamInvitation = async ({ recipient, sender, team, invitationId }) => {
  const senderName = sender?.displayName || sender?.username || 'The captain';
  const teamName = team?.name || 'the team';
  return createNotification({
    recipient: recipient._id || recipient,
    sender: sender?._id || sender || null,
    type: 'TEAM_INVITATION',
    message: `${senderName} invited you to join ${teamName}.`,
    relatedId: team?._id || team || invitationId,
  });
};

/**
 * Dispatch team invitation accepted notification to captain
 */
export const notifyTeamInvitationAccepted = async ({ recipient, sender, team }) => {
  const senderName = sender?.displayName || sender?.username || 'A player';
  const teamName = team?.name || 'the team';
  return createNotification({
    recipient: recipient._id || recipient,
    sender: sender?._id || sender || null,
    type: 'TEAM_INVITATION_ACCEPTED',
    message: `${senderName} accepted your invitation to join ${teamName}.`,
    relatedId: team?._id || team,
  });
};

/**
 * Dispatch team invitation rejected notification to captain
 */
export const notifyTeamInvitationRejected = async ({ recipient, sender, team }) => {
  const senderName = sender?.displayName || sender?.username || 'A player';
  const teamName = team?.name || 'the team';
  return createNotification({
    recipient: recipient._id || recipient,
    sender: sender?._id || sender || null,
    type: 'TEAM_INVITATION_REJECTED',
    message: `${senderName} declined your invitation to join ${teamName}.`,
    relatedId: team?._id || team,
  });
};

export default {
  createNotification,
  notifyConnectionRequest,
  notifyConnectionAccepted,
  notifyConnectionRejected,
  notifyTeamAdded,
  notifyTeamRemoved,
  notifyMatchInvitation,
  notifyMatchCompleted,
  notifyTeamInvitation,
  notifyTeamInvitationAccepted,
  notifyTeamInvitationRejected,
};

