import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema(
  {
    over: { type: Number, required: true },
    ballInOver: { type: Number, required: true }, // 1 to 6 for legal balls, or relative count
    type: {
      type: String,
      enum: ['normal', 'wicket', 'wide', 'no_ball', 'bye', 'leg_bye'],
      default: 'normal',
    },
    runsScored: { type: Number, default: 0 }, // runs off bat or byes/leg-byes
    extraRuns: { type: Number, default: 0 }, // extras (penalty for wide/no-ball etc.)
    totalDeliveryRuns: { type: Number, default: 0 },
    isLegal: { type: Boolean, default: true }, // false for wide and no_ball
    striker: { type: String, required: true, trim: true },
    strikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    nonStriker: { type: String, required: true, trim: true },
    nonStrikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    bowler: { type: String, required: true, trim: true },
    bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    isWicket: { type: Boolean, default: false },
    wicketType: {
      type: String,
      enum: ['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired', ''],
      default: '',
    },
    dismissedPlayer: { type: String, default: '', trim: true },
    dismissedPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    fielder: { type: String, default: '', trim: true },
    fielderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    newBatsman: { type: String, default: '', trim: true },
    newBatsmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    commentary: { type: String, default: '', trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const batsmanStatsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    isOut: { type: Boolean, default: false },
    dismissal: { type: String, default: 'not out', trim: true },
    battingOrder: { type: Number, default: 1 },
  },
  { _id: false }
);

const bowlerStatsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    legalBalls: { type: Number, default: 0 },
    overs: { type: String, default: '0.0' },
    maidens: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
  },
  { _id: false }
);

const inningsSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
      index: true,
    },
    inningsNumber: {
      type: Number,
      required: true,
      enum: [1, 2],
    },
    battingTeam: {
      type: String,
      required: true,
      trim: true,
    },
    bowlingTeam: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
    },
    totalRuns: {
      type: Number,
      default: 0,
    },
    wickets: {
      type: Number,
      default: 0,
    },
    legalBalls: {
      type: Number,
      default: 0,
    },
    overs: {
      type: String,
      default: '0.0',
    },
    striker: {
      type: String,
      default: '',
      trim: true,
    },
    strikerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    nonStriker: {
      type: String,
      default: '',
      trim: true,
    },
    nonStrikerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    openingStriker: {
      type: String,
      default: '',
      trim: true,
    },
    openingStrikerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    openingNonStriker: {
      type: String,
      default: '',
      trim: true,
    },
    openingNonStrikerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    currentBowler: {
      type: String,
      default: '',
      trim: true,
    },
    currentBowlerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    previousBowler: {
      type: String,
      default: '',
      trim: true,
    },
    target: {
      type: Number,
      default: null,
    },
    extras: {
      wides: { type: Number, default: 0 },
      noBalls: { type: Number, default: 0 },
      byes: { type: Number, default: 0 },
      legByes: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    batsmen: [batsmanStatsSchema],
    bowlers: [bowlerStatsSchema],
    deliveries: [deliverySchema],
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee unique innings per match
inningsSchema.index({ match: 1, inningsNumber: 1 }, { unique: true });

const Innings = mongoose.model('Innings', inningsSchema);

export default Innings;
