import mongoose from 'mongoose';
import Team from '../models/Team.js';
import Player from '../models/Player.js';
import TeamInvitation from '../models/TeamInvitation.js';
import { getPlayerForUser } from '../services/privacyService.js';
import {
  notifyTeamInvitation,
  notifyTeamInvitationAccepted,
  notifyTeamInvitationRejected,
} from '../services/notificationService.js';

/**
 * Helper to determine if a player/user can recruit for a team
 */
export const canRecruitForTeam = (team, player, user) => {
  if (!team || !player) return false;
  if (user?.role === 'admin') return true;
  const isCaptain = team.captain && String(team.captain._id || team.captain) === String(player._id);
  const isCreator = team.createdBy && String(team.createdBy._id || team.createdBy) === String(user?._id);
  return isCaptain || isCreator;
};

/**
 * @desc    Send a team recruitment invitation
 * @route   POST /api/teams/:teamId/invitations
 * @access  Private (Captain only)
 */
export const sendTeamInvitation = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { playerId, message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID',
      });
    }

    if (!playerId || !mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid player ID is required to send an invitation',
      });
    }

    // 1. Resolve inviting user's player profile
    const senderPlayer = await getPlayerForUser(req.user);
    if (!senderPlayer) {
      return res.status(403).json({
        success: false,
        message: 'Authenticated player profile not found',
      });
    }

    // 2. Verify team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // 3. Authorization: Only team captain (or creator/admin) can recruit
    if (!canRecruitForTeam(team, senderPlayer, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only the team captain can recruit players and send invitations',
      });
    }

    // 4. Verify target player exists
    const targetPlayer = await Player.findById(playerId);
    if (!targetPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Target player not found',
      });
    }

    // 5. Prevent captain from inviting themselves
    if (String(senderPlayer._id) === String(targetPlayer._id)) {
      return res.status(400).json({
        success: false,
        message: 'Captain cannot invite themselves to the team',
      });
    }

    // 6. Prevent inviting a player who is already a member or captain of the team
    const isMember = team.members && team.members.some((m) => String(m._id || m) === String(targetPlayer._id));
    const isTeamCaptain = team.captain && String(team.captain._id || team.captain) === String(targetPlayer._id);
    if (isMember || isTeamCaptain) {
      return res.status(400).json({
        success: false,
        message: 'This player is already a member of the team',
      });
    }

    // 7. Prevent duplicate pending invitations or inviting an already accepted player
    const existingInvite = await TeamInvitation.findOne({
      team: team._id,
      player: targetPlayer._id,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingInvite) {
      if (existingInvite.status === 'pending') {
        return res.status(409).json({
          success: false,
          message: 'A pending invitation has already been sent to this player',
        });
      }
      if (existingInvite.status === 'accepted') {
        return res.status(409).json({
          success: false,
          message: 'This player has already accepted an invitation to this team',
        });
      }
    }

    // 8. Create TeamInvitation with status = 'pending'
    const invitation = await TeamInvitation.create({
      team: team._id,
      invitedBy: senderPlayer._id,
      player: targetPlayer._id,
      status: 'pending',
      message: message && message.trim() ? message.trim() : 'We would like you to join our team.',
    });

    const populatedInvitation = await TeamInvitation.findById(invitation._id)
      .populate('team', 'name logo city')
      .populate('invitedBy', 'displayName profileImage playingRole')
      .populate('player', 'displayName profileImage playingRole city');

    // 9. Dispatch notification to target player
    try {
      await notifyTeamInvitation({
        recipient: targetPlayer._id,
        sender: senderPlayer,
        team,
        invitationId: invitation._id,
      });
    } catch (notifErr) {
      console.warn('Failed to send invitation notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Invitation sent to ${targetPlayer.displayName || 'player'} successfully`,
      invitation: populatedInvitation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    View pending team invitations received by authenticated player
 * @route   GET /api/team-invitations/received
 * @access  Private
 */
export const getReceivedInvitations = async (req, res, next) => {
  try {
    const player = await getPlayerForUser(req.user);
    if (!player) {
      return res.status(200).json({
        success: true,
        count: 0,
        invitations: [],
      });
    }

    const invitations = await TeamInvitation.find({
      player: player._id,
      status: 'pending',
    })
      .populate('team', 'name logo city description members captain')
      .populate('invitedBy', 'displayName profileImage playingRole city')
      .sort({ createdAt: -1 });

    const formattedInvitations = invitations.map((inv) => ({
      _id: inv._id,
      id: inv._id,
      team: {
        _id: inv.team?._id,
        id: inv.team?._id,
        name: inv.team?.name || 'Unknown Team',
        logo: inv.team?.logo || '',
        city: inv.team?.city || '',
        description: inv.team?.description || '',
      },
      invitedBy: {
        _id: inv.invitedBy?._id,
        id: inv.invitedBy?._id,
        name: inv.invitedBy?.displayName || 'Captain',
        displayName: inv.invitedBy?.displayName || 'Captain',
        profileImage: inv.invitedBy?.profileImage || '',
        playingRole: inv.invitedBy?.playingRole || '',
      },
      message: inv.message || 'We would like you to join our team.',
      status: inv.status,
      createdAt: inv.createdAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedInvitations.length,
      invitations: formattedInvitations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept a team invitation
 * @route   PUT /api/team-invitations/:id/accept
 * @access  Private (Invited player only)
 */
export const acceptInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation ID',
      });
    }

    const player = await getPlayerForUser(req.user);
    if (!player) {
      return res.status(403).json({
        success: false,
        message: 'Authenticated player profile not found',
      });
    }

    const invitation = await TeamInvitation.findById(id).populate('team');
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Team invitation not found',
      });
    }

    // Verify invitation recipient
    if (String(invitation.player) !== String(player._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept this invitation',
      });
    }

    // Check status is pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept an invitation with status "${invitation.status}"`,
      });
    }

    const teamId = invitation.team._id || invitation.team;

    // Add player to Team.members safely (preventing duplicates)
    const updatedTeam = await Team.findByIdAndUpdate(
      teamId,
      { $addToSet: { members: player._id } },
      { new: true }
    );

    if (!updatedTeam) {
      return res.status(404).json({
        success: false,
        message: 'Associated team no longer exists',
      });
    }

    // Update invitation status to accepted
    invitation.status = 'accepted';
    await invitation.save();

    // Notify captain that player accepted
    try {
      await notifyTeamInvitationAccepted({
        recipient: invitation.invitedBy,
        sender: player,
        team: updatedTeam,
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch accept notification:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `You're now a member of ${updatedTeam.name}.`,
      invitation,
      team: updatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a team invitation
 * @route   PUT /api/team-invitations/:id/reject
 * @access  Private (Invited player only)
 */
export const rejectInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation ID',
      });
    }

    const player = await getPlayerForUser(req.user);
    if (!player) {
      return res.status(403).json({
        success: false,
        message: 'Authenticated player profile not found',
      });
    }

    const invitation = await TeamInvitation.findById(id).populate('team');
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Team invitation not found',
      });
    }

    // Verify invitation recipient
    if (String(invitation.player) !== String(player._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reject this invitation',
      });
    }

    // Check status is pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject an invitation with status "${invitation.status}"`,
      });
    }

    // Change status to rejected without modifying team members
    invitation.status = 'rejected';
    await invitation.save();

    // Notify captain that player declined
    try {
      await notifyTeamInvitationRejected({
        recipient: invitation.invitedBy,
        sender: player,
        team: invitation.team,
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch reject notification:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Invitation declined.',
      invitation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a pending team invitation
 * @route   DELETE /api/team-invitations/:id
 * @access  Private (Captain/Inviter only)
 */
export const cancelInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation ID',
      });
    }

    const player = await getPlayerForUser(req.user);
    if (!player) {
      return res.status(403).json({
        success: false,
        message: 'Authenticated player profile not found',
      });
    }

    const invitation = await TeamInvitation.findById(id).populate('team');
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Team invitation not found',
      });
    }

    const team = await Team.findById(invitation.team._id || invitation.team);
    const isInviter = String(invitation.invitedBy) === String(player._id);
    const isCaptain = team?.captain && String(team.captain._id || team.captain) === String(player._id);
    const isCreator = team?.createdBy && String(team.createdBy._id || team.createdBy) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isInviter && !isCaptain && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this invitation',
      });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending invitations can be cancelled',
      });
    }

    // Change status to cancelled
    invitation.status = 'cancelled';
    await invitation.save();

    res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully',
      invitation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get team recruitment invitation history
 * @route   GET /api/teams/:teamId/invitations
 * @access  Private (Team captain only)
 */
export const getTeamInvitations = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID',
      });
    }

    const player = await getPlayerForUser(req.user);
    if (!player) {
      return res.status(403).json({
        success: false,
        message: 'Authenticated player profile not found',
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Verify captain authorization
    if (!canRecruitForTeam(team, player, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only the team captain can view team invitation history',
      });
    }

    const invitations = await TeamInvitation.find({ team: team._id })
      .populate('player', 'displayName profileImage playingRole city')
      .populate('invitedBy', 'displayName profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invitations.length,
      invitations,
    });
  } catch (error) {
    next(error);
  }
};
