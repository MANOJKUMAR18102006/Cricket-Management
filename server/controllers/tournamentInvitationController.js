import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';
import TournamentInvitation from '../models/TournamentInvitation.js';
import Team from '../models/Team.js';
import { getPlayerForUser } from '../services/privacyService.js';

/**
 * @desc    Get pending tournament invitations received for the player's captained/managed teams
 * @route   GET /api/tournament-invitations/received
 * @access  Private
 */
export const getReceivedTournamentInvitations = async (req, res, next) => {
  try {
    const player = await getPlayerForUser(req.user);
    if (!player) {
      return res.status(200).json({ success: true, count: 0, invitations: [] });
    }

    // Find teams where user/player is captain or creator
    const captainedTeams = await Team.find({
      $or: [{ captain: player._id }, { createdBy: req.user._id }],
    }).select('_id name logo city');

    const teamIds = captainedTeams.map((t) => t._id);
    if (teamIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, invitations: [] });
    }

    const statusQuery = req.query?.status;
    const filter = { team: { $in: teamIds } };
    if (statusQuery && statusQuery !== 'all') {
      filter.status = statusQuery;
    } else if (!statusQuery) {
      filter.status = 'pending';
    }

    const invitations = await TournamentInvitation.find(filter)
      .populate('tournament', 'name city format overs startDate endDate banner logo status location')
      .populate('team', 'name logo city captain')
      .populate('invitedBy', 'username role')
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

/**
 * @desc    Accept a tournament invitation (Team Captain / Manager only)
 * @route   PUT /api/tournament-invitations/:id/accept
 * @access  Private
 */
export const acceptTournamentInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid invitation ID' });
    }

    const player = await getPlayerForUser(req.user);
    const invitation = await TournamentInvitation.findById(id).populate('tournament');
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Tournament invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept an invitation with status "${invitation.status}"`,
      });
    }

    const team = await Team.findById(invitation.team);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Associated team not found' });
    }

    // Verify captain or creator authorization
    const isCaptain = player && team.captain && String(team.captain._id || team.captain) === String(player._id);
    const isCreator = team.createdBy && String(team.createdBy._id || team.createdBy) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isCaptain && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the team captain or creator can accept tournament invitations',
      });
    }

    const tournament = await Tournament.findById(invitation.tournament._id || invitation.tournament);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament no longer exists' });
    }

    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot join a ${tournament.status} tournament`,
      });
    }

    // Check capacity
    if (tournament.teams && tournament.teams.length >= tournament.maxTeams) {
      return res.status(400).json({
        success: false,
        message: 'Tournament has reached maximum capacity of participating teams',
      });
    }

    // Atomically add team to tournament.teams
    const updatedTournament = await Tournament.findByIdAndUpdate(
      tournament._id,
      { $addToSet: { teams: team._id } },
      { new: true }
    );

    invitation.status = 'accepted';
    await invitation.save();

    res.status(200).json({
      success: true,
      message: `${team.name} has officially joined ${tournament.name}!`,
      invitation,
      tournament: updatedTournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a tournament invitation (Team Captain only)
 * @route   PUT /api/tournament-invitations/:id/reject
 * @access  Private
 */
export const rejectTournamentInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid invitation ID' });
    }

    const player = await getPlayerForUser(req.user);
    const invitation = await TournamentInvitation.findById(id);
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Tournament invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot decline an invitation with status "${invitation.status}"`,
      });
    }

    const team = await Team.findById(invitation.team);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Associated team not found' });
    }

    const isCaptain = player && team.captain && String(team.captain._id || team.captain) === String(player._id);
    const isCreator = team.createdBy && String(team.createdBy._id || team.createdBy) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isCaptain && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the team captain or creator can decline tournament invitations',
      });
    }

    invitation.status = 'rejected';
    await invitation.save();

    res.status(200).json({
      success: true,
      message: 'Tournament invitation declined',
      invitation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a tournament invitation (Organizer only)
 * @route   DELETE /api/tournament-invitations/:id
 * @access  Private
 */
export const cancelTournamentInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid invitation ID' });
    }

    const invitation = await TournamentInvitation.findById(id).populate('tournament');
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Tournament invitation not found' });
    }

    const isOrganizer = String(invitation.tournament?.organizer) === String(req.user._id);
    const isInviter = String(invitation.invitedBy) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isOrganizer && !isInviter && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the tournament organizer can cancel this invitation',
      });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending invitations can be cancelled',
      });
    }

    invitation.status = 'cancelled';
    await invitation.save();

    res.status(200).json({
      success: true,
      message: 'Tournament invitation cancelled successfully',
      invitation,
    });
  } catch (error) {
    next(error);
  }
};
