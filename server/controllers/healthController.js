import mongoose from 'mongoose';

/**
 * Health check controller
 * @route   GET /api/health
 * @desc    Returns API service status, uptime, and database state
 * @access  Public
 */
export const getHealthStatus = (req, res) => {
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = dbStates[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'CrickPulse API is operational',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbState,
      name: mongoose.connection.name || 'crickpulse',
    },
  });
};
