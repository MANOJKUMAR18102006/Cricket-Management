import mongoose from 'mongoose';
import Match from '../models/Match.js';

/**
 * @route   POST /api/matches
 * @desc    Create a new cricket match
 * @access  Private (Team captain / admin / authenticated user)
 */
export const createMatch = async (req, res, next) => {
  try {
    const {
      team1,
      team2,
      format,
      overs,
      venue,
      city,
      date,
      tournament,
      tossWinner,
      tossDecision,
      status,
      winner,
      result,
    } = req.body;

    // Required fields validation
    if (!team1 || !team1.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Team 1 name is required.',
      });
    }

    if (!team2 || !team2.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Team 2 name is required.',
      });
    }

    if (team1.trim().toLowerCase() === team2.trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Team 1 and Team 2 must be different teams.',
      });
    }

    if (!venue || !venue.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Match venue is required.',
      });
    }

    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Match city is required.',
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Match date and time is required.',
      });
    }

    // Determine overs based on format if not explicitly specified
    let calculatedOvers = overs ? Number(overs) : undefined;
    const matchFormat = format || 'T20';

    if (!calculatedOvers) {
      switch (matchFormat) {
        case 'T10':
          calculatedOvers = 10;
          break;
        case 'T20':
          calculatedOvers = 20;
          break;
        case 'ODI':
          calculatedOvers = 50;
          break;
        default:
          calculatedOvers = 20;
      }
    }

    const match = await Match.create({
      team1: team1.trim(),
      team2: team2.trim(),
      format: matchFormat,
      overs: calculatedOvers,
      venue: venue.trim(),
      city: city.trim(),
      date: new Date(date),
      tournament: tournament ? tournament.trim() : '',
      tossWinner: tossWinner ? tossWinner.trim() : '',
      tossDecision: tossDecision || '',
      status: status || 'scheduled',
      winner: winner ? winner.trim() : '',
      result: result ? result.trim() : '',
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Cricket match created successfully!',
      match,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/matches
 * @desc    Get matches with optional status filter, search, and pagination
 * @access  Public
 */
export const getMatches = async (req, res, next) => {
  try {
    const { status, format, search } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by status if provided and not 'all'
    if (status && status.toLowerCase() !== 'all') {
      query.status = status.toLowerCase();
    }

    // Filter by format
    if (format && format.toLowerCase() !== 'all') {
      query.format = format;
    }

    // Search keyword across team names, venue, city, or tournament
    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitized, 'i');
      query.$or = [
        { team1: searchRegex },
        { team2: searchRegex },
        { venue: searchRegex },
        { city: searchRegex },
        { tournament: searchRegex },
      ];
    }

    // Parallel count queries for status tabs
    const [
      total,
      scheduledCount,
      liveCount,
      completedCount,
      cancelledCount,
      matches,
    ] = await Promise.all([
      Match.countDocuments(query),
      Match.countDocuments({ status: 'scheduled' }),
      Match.countDocuments({ status: 'live' }),
      Match.countDocuments({ status: 'completed' }),
      Match.countDocuments({ status: 'cancelled' }),
      Match.find(query)
        .populate('createdBy', 'username role')
        .sort({ status: 1 === 1 ? -1 : 1, date: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.status(200).json({
      success: true,
      count: matches.length,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      limit,
      counts: {
        all: scheduledCount + liveCount + completedCount + cancelledCount,
        scheduled: scheduledCount,
        live: liveCount,
        completed: completedCount,
        cancelled: cancelledCount,
      },
      matches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/matches/:id
 * @desc    Get match details by ID
 * @access  Public
 */
export const getMatchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid match ID format.',
      });
    }

    const match = await Match.findById(id).populate('createdBy', 'username email role');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found.',
      });
    }

    res.status(200).json({
      success: true,
      match,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/matches/:id
 * @desc    Update match information (Only match creator or admin)
 * @access  Private
 */
export const updateMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid match ID format.',
      });
    }

    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found.',
      });
    }

    // Check authorization: must be match creator or admin
    const isCreator = String(match.createdBy) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this match.',
      });
    }

    const allowedFields = [
      'team1',
      'team2',
      'format',
      'overs',
      'venue',
      'city',
      'date',
      'tournament',
      'tossWinner',
      'tossDecision',
      'status',
      'winner',
      'result',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'date') {
          match.date = new Date(req.body.date);
        } else if (field === 'overs') {
          match.overs = Number(req.body.overs);
        } else {
          match[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
        }
      }
    }

    // Auto-generate result string if completed and winner provided
    if (match.status === 'completed' && match.winner && !match.result) {
      match.result = `${match.winner} won the match`;
    }

    await match.save();

    res.status(200).json({
      success: true,
      message: 'Match updated successfully!',
      match,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/matches/:id
 * @desc    Delete a match (Only match creator or admin)
 * @access  Private
 */
export const deleteMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid match ID format.',
      });
    }

    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found.',
      });
    }

    // Check authorization: must be match creator or admin
    const isCreator = String(match.createdBy) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this match.',
      });
    }

    await Match.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Match deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createMatch,
  getMatches,
  getMatchById,
  updateMatch,
  deleteMatch,
};
