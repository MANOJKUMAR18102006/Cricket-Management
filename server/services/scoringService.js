/**
 * Pure calculation and rule engine for Ball-by-Ball Cricket Scoring
 */

export const formatOvers = (legalBalls) => {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
};

export const getMaxOversPerBowler = (format, matchOvers = 20) => {
  const f = (format || '').toUpperCase();
  if (f === 'T10') return 2;
  if (f === 'T20') return 4;
  if (f === 'ODI') return 10;
  return Math.max(1, Math.ceil(Number(matchOvers || 20) / 5));
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
      const key = b.playerId ? String(b.playerId) : b.name.trim().toLowerCase();
      batsmenMap.set(key, {
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
      const key = b.playerId ? String(b.playerId) : b.name.trim().toLowerCase();
      bowlersMap.set(key, {
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

  const getOrCreateBatsman = (name, playerId = null) => {
    if (!name && !playerId) return null;
    const key = playerId ? String(playerId) : name.trim().toLowerCase();
    if (!batsmenMap.has(key)) {
      // Check if another entry matches by name
      for (const b of batsmenMap.values()) {
        if (name && b.name.trim().toLowerCase() === name.trim().toLowerCase()) {
          if (playerId && !b.playerId) b.playerId = playerId;
          return b;
        }
      }
      batsmenMap.set(key, {
        name: name || 'Batter',
        playerId: playerId || null,
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
    return batsmenMap.get(key);
  };

  const getOrCreateBowler = (name, playerId = null) => {
    if (!name && !playerId) return null;
    const key = playerId ? String(playerId) : name.trim().toLowerCase();
    if (!bowlersMap.has(key)) {
      for (const b of bowlersMap.values()) {
        if (name && b.name.trim().toLowerCase() === name.trim().toLowerCase()) {
          if (playerId && !b.playerId) b.playerId = playerId;
          return b;
        }
      }
      bowlersMap.set(key, {
        name: name || 'Bowler',
        playerId: playerId || null,
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
    return bowlersMap.get(key);
  };

  // Determine immutable opening positions for the replay
  let openingStriker = innings.openingStriker;
  let openingStrikerId = innings.openingStrikerId || null;
  let openingNonStriker = innings.openingNonStriker;
  let openingNonStrikerId = innings.openingNonStrikerId || null;

  const deliveries = innings.deliveries || [];

  if (!openingStriker && deliveries.length > 0 && deliveries[0].striker) {
    openingStriker = deliveries[0].striker;
    openingStrikerId = deliveries[0].strikerId || null;
  }
  if (!openingNonStriker && deliveries.length > 0 && deliveries[0].nonStriker) {
    openingNonStriker = deliveries[0].nonStriker;
    openingNonStrikerId = deliveries[0].nonStrikerId || null;
  }

  // Fallback to batsmen list by batting order
  if (!openingStriker && innings.batsmen && innings.batsmen.length > 0) {
    const b1 = innings.batsmen.find((b) => b.battingOrder === 1) || innings.batsmen[0];
    openingStriker = b1.name;
    openingStrikerId = b1.playerId || null;
  }
  if (!openingNonStriker && innings.batsmen && innings.batsmen.length > 1) {
    const b2 = innings.batsmen.find((b) => b.battingOrder === 2) || innings.batsmen[1];
    openingNonStriker = b2.name;
    openingNonStrikerId = b2.playerId || null;
  }

  // Final fallback to initial pointers
  if (!openingStriker) openingStriker = innings.striker;
  if (!openingStrikerId) openingStrikerId = innings.strikerId || null;
  if (!openingNonStriker) openingNonStriker = innings.nonStriker;
  if (!openingNonStrikerId) openingNonStrikerId = innings.nonStrikerId || null;

  // Initialize active positions for replay from opening pair
  let currentStriker = { name: openingStriker, playerId: openingStrikerId };
  let currentNonStriker = { name: openingNonStriker, playerId: openingNonStrikerId };
  let currentBowler = { name: innings.currentBowler, playerId: innings.currentBowlerId || null };

  // Track over-by-over runs for maiden calculations
  const overTracker = new Map();

  deliveries.forEach((del) => {
    // Current striker on this ball
    const bman = getOrCreateBatsman(del.striker || currentStriker.name, del.strikerId || currentStriker.playerId);
    const nonStr = getOrCreateBatsman(del.nonStriker || currentNonStriker.name, del.nonStrikerId || currentNonStriker.playerId);
    const bowl = getOrCreateBowler(del.bowler || currentBowler.name, del.bowlerId || currentBowler.playerId);

    const overIdx = del.over;
    if (!overTracker.has(overIdx)) {
      overTracker.set(overIdx, { bowler: del.bowler, legalBalls: 0, runsConceded: 0 });
    }
    const currentOverData = overTracker.get(overIdx);

    const runsScored = Number(del.runsScored || 0);
    const extraRuns = Number(del.extraRuns || 0);
    const totalDeliveryRuns = Number(del.totalDeliveryRuns || 0);
    const isLegal = del.isLegal !== false;

    if (del.type === 'normal') {
      legalBalls++;
      totalRuns += runsScored;

      // Normal batting delivery: ONLY the striker receives the runs & faces the ball!
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

      // Strike rotation on odd runs (1, 3, 5)
      if (runsScored % 2 !== 0) {
        const temp = { ...currentStriker };
        currentStriker = { ...currentNonStriker };
        currentNonStriker = temp;
      }
    } else if (del.type === 'wide') {
      const wideCost = totalDeliveryRuns > 0 ? totalDeliveryRuns : 1;
      totalRuns += wideCost;
      extras.wides += wideCost;
      extras.total += wideCost;

      if (bowl) {
        bowl.runsConceded += wideCost;
        bowl.wides++;
      }
      currentOverData.runsConceded += wideCost;

      // Striker does not face legal ball, 0 batter runs added
      if (runsScored % 2 !== 0) {
        const temp = { ...currentStriker };
        currentStriker = { ...currentNonStriker };
        currentNonStriker = temp;
      }
    } else if (del.type === 'no_ball') {
      const penalty = extraRuns > 0 ? extraRuns : 1;
      const nbTotal = penalty + runsScored;
      totalRuns += nbTotal;
      extras.noBalls += penalty;
      extras.total += penalty;

      // Striker faces no ball and receives runs off bat
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
        const temp = { ...currentStriker };
        currentStriker = { ...currentNonStriker };
        currentNonStriker = temp;
      }
    } else if (del.type === 'bye') {
      legalBalls++;
      totalRuns += runsScored;
      extras.byes += runsScored;
      extras.total += runsScored;

      // Striker faced the ball, 0 batter runs added
      if (bman) {
        bman.balls++;
      }
      if (bowl) {
        bowl.legalBalls++;
      }
      currentOverData.legalBalls++;

      if (runsScored % 2 !== 0) {
        const temp = { ...currentStriker };
        currentStriker = { ...currentNonStriker };
        currentNonStriker = temp;
      }
    } else if (del.type === 'leg_bye') {
      legalBalls++;
      totalRuns += runsScored;
      extras.legByes += runsScored;
      extras.total += runsScored;

      // Striker faced the ball, 0 batter runs added
      if (bman) {
        bman.balls++;
      }
      if (bowl) {
        bowl.legalBalls++;
      }
      currentOverData.legalBalls++;

      if (runsScored % 2 !== 0) {
        const temp = { ...currentStriker };
        currentStriker = { ...currentNonStriker };
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
        if (del.wicketType !== 'run_out' && del.wicketType !== 'retired') {
          bowl.wickets++;
        }
      }
      currentOverData.legalBalls++;
      currentOverData.runsConceded += runsScored;

      // Mark dismissed player
      const dismissedPlayerId = del.dismissedPlayerId ? String(del.dismissedPlayerId) : null;
      const dismissedName = (del.dismissedPlayer || del.striker || currentStriker.name || '').trim();

      const dismissedBman = getOrCreateBatsman(dismissedName, dismissedPlayerId);
      if (dismissedBman) {
        dismissedBman.isOut = true;
        let dismissalDetails = `b ${del.bowler}`;
        if (del.wicketType === 'caught') {
          dismissalDetails = del.fielder ? `c ${del.fielder} b ${del.bowler}` : `c & b ${del.bowler}`;
        } else if (del.wicketType === 'bowled') {
          dismissalDetails = `b ${del.bowler}`;
        } else if (del.wicketType === 'lbw') {
          dismissalDetails = `lbw b ${del.bowler}`;
        } else if (del.wicketType === 'run_out') {
          dismissalDetails = del.fielder ? `run out (${del.fielder})` : `run out`;
        } else if (del.wicketType === 'stumped') {
          dismissalDetails = del.fielder ? `st ${del.fielder} b ${del.bowler}` : `st b ${del.bowler}`;
        } else if (del.wicketType === 'hit_wicket') {
          dismissalDetails = `hit wicket b ${del.bowler}`;
        } else if (del.wicketType === 'retired') {
          dismissalDetails = `retired out`;
        } else if (del.wicketType) {
          dismissalDetails = `${del.wicketType} b ${del.bowler}`;
        }
        dismissedBman.dismissal = dismissalDetails;
      }

      // Check if dismissed batter was striker
      const isStrikerDismissed = dismissedPlayerId
        ? (currentStriker.playerId && String(currentStriker.playerId) === dismissedPlayerId)
        : (dismissedName.toLowerCase() === (currentStriker.name || '').toLowerCase());

      if (del.newBatsman) {
        const newBman = getOrCreateBatsman(del.newBatsman, del.newBatsmanId);
        const newBatterObj = {
          name: del.newBatsman,
          playerId: del.newBatsmanId || newBman?.playerId || null,
        };

        if (isStrikerDismissed) {
          currentStriker = newBatterObj;
        } else {
          currentNonStriker = newBatterObj;
        }
      }

      if (runsScored % 2 !== 0) {
        const temp = { ...currentStriker };
        currentStriker = { ...currentNonStriker };
        currentNonStriker = temp;
      }
    }

    // End of over: 6 legal deliveries bowled -> batsmen change ends
    if (isLegal && legalBalls > 0 && legalBalls % 6 === 0) {
      const temp = { ...currentStriker };
      currentStriker = { ...currentNonStriker };
      currentNonStriker = temp;
    }

    currentBowler = { name: del.bowler, playerId: del.bowlerId || null };
  });

  // SAFETY CHECK: Striker and Non-Striker must NEVER be the same player
  const isSameId = currentStriker.playerId && currentNonStriker.playerId && String(currentStriker.playerId) === String(currentNonStriker.playerId);
  const isSameName = currentStriker.name && currentNonStriker.name && currentStriker.name.trim().toLowerCase() === currentNonStriker.name.trim().toLowerCase();

  if (isSameId || isSameName) {
    // Repair: pick next available un-dismissed batter
    let alternate = null;
    for (const b of batsmenMap.values()) {
      if (!b.isOut && b.name.trim().toLowerCase() !== (currentStriker.name || '').trim().toLowerCase()) {
        alternate = b;
        break;
      }
    }
    if (alternate) {
      currentNonStriker = { name: alternate.name, playerId: alternate.playerId };
    }
  }

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
  innings.striker = currentStriker?.name || (typeof currentStriker === 'string' ? currentStriker : innings.striker);
  innings.strikerId = currentStriker?.playerId || innings.strikerId || null;
  innings.nonStriker = currentNonStriker?.name || (typeof currentNonStriker === 'string' ? currentNonStriker : innings.nonStriker);
  innings.nonStrikerId = currentNonStriker?.playerId || innings.nonStrikerId || null;
  innings.currentBowler = currentBowler?.name || (typeof currentBowler === 'string' ? currentBowler : innings.currentBowler);
  innings.currentBowlerId = currentBowler?.playerId || innings.currentBowlerId || null;

  const completedOversCount = Math.floor(legalBalls / 6);
  const previousBowler = completedOversCount > 0 ? (overTracker.get(completedOversCount - 1)?.bowler || '') : '';
  innings.previousBowler = previousBowler;

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
