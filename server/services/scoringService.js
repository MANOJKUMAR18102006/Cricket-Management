/**
 * Pure calculation and rule engine for Ball-by-Ball Cricket Scoring
 */

export const formatOvers = (legalBalls) => {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
};

/**
 * Replays all deliveries in sequence to compute 100% accurate batsman, bowler,
 * extras, and total score state. Guaranteed deterministic for record & undo.
 */
export const recalculateInnings = (innings, maxOvers = 20) => {
  let totalRuns = 0;
  let wickets = 0;
  let legalBalls = 0;

  const extras = {
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    total: 0,
  };

  // Map existing batsmen to preserve order and metadata
  const batsmenMap = new Map();
  if (Array.isArray(innings.batsmen)) {
    innings.batsmen.forEach((b, idx) => {
      batsmenMap.set(b.name, {
        name: b.name,
        playerId: b.playerId || null,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        dismissal: 'not out',
        battingOrder: b.battingOrder || idx + 1,
      });
    });
  }

  // Map existing bowlers
  const bowlersMap = new Map();
  if (Array.isArray(innings.bowlers)) {
    innings.bowlers.forEach((b) => {
      bowlersMap.set(b.name, {
        name: b.name,
        playerId: b.playerId || null,
        legalBalls: 0,
        overs: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        wides: 0,
        noBalls: 0,
      });
    });
  }

  const getOrCreateBatsman = (name) => {
    if (!name) return null;
    if (!batsmenMap.has(name)) {
      batsmenMap.set(name, {
        name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        dismissal: 'not out',
        battingOrder: batsmenMap.size + 1,
      });
    }
    return batsmenMap.get(name);
  };

  const getOrCreateBowler = (name) => {
    if (!name) return null;
    if (!bowlersMap.has(name)) {
      bowlersMap.set(name, {
        name,
        legalBalls: 0,
        overs: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        wides: 0,
        noBalls: 0,
      });
    }
    return bowlersMap.get(name);
  };

  // Tracking current positions
  let currentStriker = innings.striker;
  let currentNonStriker = innings.nonStriker;
  let currentBowler = innings.currentBowler;

  // Track over-by-over runs for maiden calculations: overIndex -> { bowler, runsConceded, isMaidenCandidate }
  const overTracker = new Map();

  const deliveries = innings.deliveries || [];

  deliveries.forEach((del) => {
    const bman = getOrCreateBatsman(del.striker);
    const nonStr = getOrCreateBatsman(del.nonStriker);
    const bowl = getOrCreateBowler(del.bowler);

    const overIdx = del.over;
    if (!overTracker.has(overIdx)) {
      overTracker.set(overIdx, { bowler: del.bowler, legalBalls: 0, runsConceded: 0 });
    }
    const currentOverData = overTracker.get(overIdx);

    const runsScored = del.runsScored || 0;
    const extraRuns = del.extraRuns || 0;
    const totalDeliveryRuns = del.totalDeliveryRuns || 0;
    const isLegal = del.isLegal !== false;

    if (del.type === 'normal') {
      legalBalls++;
      totalRuns += runsScored;

      if (bman) {
        bman.runs += runsScored;
        bman.balls++;
        if (runsScored === 4) bman.fours++;
        if (runsScored === 6) bman.sixes++;
      }

      if (bowl) {
        bowl.legalBalls++;
        bowl.runsConceded += runsScored;
      }
      currentOverData.legalBalls++;
      currentOverData.runsConceded += runsScored;

      // Strike rotation on odd runs
      if (runsScored % 2 !== 0) {
        const temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
      }
    } else if (del.type === 'wide') {
      // Wides are illegal deliveries (extra ball must be bowled)
      const wideCost = totalDeliveryRuns > 0 ? totalDeliveryRuns : 1;
      totalRuns += wideCost;
      extras.wides += wideCost;
      extras.total += wideCost;

      if (bowl) {
        bowl.runsConceded += wideCost;
        bowl.wides++;
      }
      currentOverData.runsConceded += wideCost;

      // If additional running was completed on a wide and odd
      if (runsScored % 2 !== 0) {
        const temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
      }
    } else if (del.type === 'no_ball') {
      // No Ball: 1 run penalty + any runs off bat
      const penalty = extraRuns > 0 ? extraRuns : 1;
      const nbTotal = penalty + runsScored;
      totalRuns += nbTotal;
      extras.noBalls += penalty;
      extras.total += penalty;

      if (bman) {
        bman.runs += runsScored;
        bman.balls++;
        if (runsScored === 4) bman.fours++;
        if (runsScored === 6) bman.sixes++;
      }

      if (bowl) {
        bowl.runsConceded += nbTotal;
        bowl.noBalls++;
      }
      currentOverData.runsConceded += nbTotal;

      if (runsScored % 2 !== 0) {
        const temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
      }
    } else if (del.type === 'bye') {
      legalBalls++;
      totalRuns += runsScored;
      extras.byes += runsScored;
      extras.total += runsScored;

      if (bman) {
        bman.balls++;
      }
      if (bowl) {
        bowl.legalBalls++;
        // Byes are NOT credited to bowler runs conceded
      }
      currentOverData.legalBalls++;

      if (runsScored % 2 !== 0) {
        const temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
      }
    } else if (del.type === 'leg_bye') {
      legalBalls++;
      totalRuns += runsScored;
      extras.legByes += runsScored;
      extras.total += runsScored;

      if (bman) {
        bman.balls++;
      }
      if (bowl) {
        bowl.legalBalls++;
        // Leg byes are NOT credited to bowler runs conceded
      }
      currentOverData.legalBalls++;

      if (runsScored % 2 !== 0) {
        const temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
      }
    } else if (del.type === 'wicket') {
      legalBalls++;
      totalRuns += runsScored;
      wickets++;

      if (bman) {
        bman.balls++;
        bman.runs += runsScored;
      }

      if (bowl) {
        bowl.legalBalls++;
        bowl.runsConceded += runsScored;
        // Run out does not credit the bowler with a wicket
        if (del.wicketType !== 'run_out' && del.wicketType !== 'retired') {
          bowl.wickets++;
        }
      }
      currentOverData.legalBalls++;
      currentOverData.runsConceded += runsScored;

      // Mark the dismissed batsman as out
      const dismissedName = del.dismissedPlayer || del.striker;
      const dismissedBman = getOrCreateBatsman(dismissedName);
      if (dismissedBman) {
        dismissedBman.isOut = true;
        const dismissalDetails = del.wicketType
          ? `${del.wicketType} ${del.wicketType !== 'run_out' ? `b ${del.bowler}` : ''}`.trim()
          : `b ${del.bowler}`;
        dismissedBman.dismissal = dismissalDetails;
      }

      // If new batsman came in
      if (del.newBatsman) {
        getOrCreateBatsman(del.newBatsman);
        if (dismissedName === currentStriker) {
          currentStriker = del.newBatsman;
        } else {
          currentNonStriker = del.newBatsman;
        }
      }

      // Rotate strike if odd runs occurred on the delivery
      if (runsScored % 2 !== 0) {
        const temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
      }
    }

    // Check if legal ball concluded an over (6 legal balls in over)
    if (isLegal && legalBalls > 0 && legalBalls % 6 === 0) {
      // Strike change at end of legal over
      const temp = currentStriker;
      currentStriker = currentNonStriker;
      currentNonStriker = temp;
    }

    currentBowler = del.bowler;
  });

  // Calculate maidens from over tracker
  overTracker.forEach((data) => {
    if (data.legalBalls === 6 && data.runsConceded === 0) {
      const bowl = bowlersMap.get(data.bowler);
      if (bowl) bowl.maidens++;
    }
  });

  // Compute final batsman strike rates
  batsmenMap.forEach((b) => {
    b.strikeRate = b.balls > 0 ? Math.round((b.runs / b.balls) * 100 * 10) / 10 : 0;
  });

  // Compute final bowler figures & economies
  bowlersMap.forEach((b) => {
    b.overs = formatOvers(b.legalBalls);
    const oversDecimal = Math.floor(b.legalBalls / 6) + (b.legalBalls % 6) / 6;
    b.economy = oversDecimal > 0 ? Math.round((b.runsConceded / oversDecimal) * 10) / 10 : 0;
  });

  // Update innings document fields
  innings.totalRuns = totalRuns;
  innings.wickets = wickets;
  innings.legalBalls = legalBalls;
  innings.overs = formatOvers(legalBalls);
  innings.extras = extras;
  innings.batsmen = Array.from(batsmenMap.values()).sort((a, b) => a.battingOrder - b.battingOrder);
  innings.bowlers = Array.from(bowlersMap.values());
  innings.striker = currentStriker || innings.striker;
  innings.nonStriker = currentNonStriker || innings.nonStriker;
  innings.currentBowler = currentBowler || innings.currentBowler;

  // Detect Innings completion conditions:
  // 1. All Out (10 wickets)
  // 2. Max overs completed (legalBalls >= maxOvers * 6)
  // 3. Target chased down in 2nd innings
  const isTargetAchieved = innings.target && innings.totalRuns >= innings.target;
  const isAllOut = innings.wickets >= 10;
  const isOversCompleted = innings.legalBalls >= maxOvers * 6;

  if (isTargetAchieved || isAllOut || isOversCompleted) {
    innings.status = 'completed';
  }

  return {
    totalRuns,
    wickets,
    legalBalls,
    overs: innings.overs,
    isCompleted: innings.status === 'completed',
    isTargetAchieved,
    isAllOut,
    isOversCompleted,
  };
};
