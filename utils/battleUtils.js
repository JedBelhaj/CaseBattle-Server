const { rooms, getActiveUsersInRoom } = require("./roomsUtils");
const { getCaseById, openCaseServer, getItemValue } = require("./caseData");

const MIN_BATTLE_PLAYERS = 2;
const COUNTDOWN_MS = 3000;

// Countdown-to-opening timers, keyed by roomId. Tracked separately from the
// broadcast `battle` object itself (which is JSON-serialized to clients)
// so a live Timeout handle never ends up in a socket payload.
const countdownTimers = {};

const clearCountdownTimer = (roomId) => {
  if (countdownTimers[roomId]) {
    clearTimeout(countdownTimers[roomId]);
    delete countdownTimers[roomId];
  }
};

const createInitialBattleState = () => ({
  status: "lobby", // 'lobby' | 'countdown' | 'opening' | 'finished'
  caseIds: [], // ordered, duplicates allowed (opening the same case twice)
  countdownEndsAt: null,
  participants: [], // usernames locked in at start_battle
  // { username: [{ caseId, item, value, isRare }] } — one entry per case
  // that player has opened so far. Its length doubles as "how far through
  // their own queue they are", so there's no separate round counter to
  // keep in sync as players progress at different speeds.
  results: {},
  runningTotals: {}, // { username: number }
  winners: [],
});

/** Get (and lazily create) the battle sub-object for a room. */
const getOrCreateBattleState = (roomId) => {
  const room = rooms[roomId];
  if (!room) return null;
  if (!room.battle) room.battle = createInitialBattleState();
  return room.battle;
};

const getBattleState = (roomId) => rooms[roomId]?.battle || null;

/**
 * Push the current battle snapshot to the room. This is the single source
 * of truth: every derived piece of UI state (countdown/each player's
 * progress/final result) is reconstructed from this one object, so a
 * resync at any point in the battle's lifecycle — reconnect, late join, or
 * a normal push — always lands on the correct screen.
 */
const broadcastBattleState = (io, roomId) => {
  const battle = getBattleState(roomId);
  if (battle) io.to(roomId).emit("battle_state", battle);
};

/**
 * Host sets/edits the ordered list of cases for the next battle. Silently
 * drops any id that doesn't resolve to a known case (defends against a
 * stale/tampered client payload) rather than rejecting the whole update.
 * No-ops outside the lobby state — settings can't change mid-battle.
 */
const updateBattleSettings = (roomId, caseIds) => {
  const battle = getOrCreateBattleState(roomId);
  if (!battle || battle.status !== "lobby" || !Array.isArray(caseIds)) {
    return null;
  }

  battle.caseIds = caseIds.filter((id) => Boolean(getCaseById(id)));
  return battle;
};

/**
 * Wrap up a battle once every participant has opened every case: pick the
 * winner(s) by highest total value (ties are plausible with a small value
 * table, so this supports multiple winners rather than an arbitrary
 * tiebreaker).
 */
const finishBattle = (io, roomId) => {
  const battle = getBattleState(roomId);
  if (!battle) return;

  battle.status = "finished";

  const maxTotal = Math.max(0, ...Object.values(battle.runningTotals));
  battle.winners = Object.entries(battle.runningTotals)
    .filter(([, total]) => total === maxTotal)
    .map(([username]) => username);

  io.to(roomId).emit("battle_finished", {
    finalTotals: { ...battle.runningTotals },
    winners: battle.winners,
  });
  broadcastBattleState(io, roomId);
};

/**
 * A participant opens the next case in their own queue. Each player
 * progresses independently and at their own pace — there's no shared round
 * timer — and the roll happens here, server-side, at the moment of
 * opening, never precomputed and handed to the client ahead of time, so a
 * player can't peek at a result before triggering it.
 */
const openCase = (io, roomId, username) => {
  const battle = getBattleState(roomId);
  if (!battle || battle.status !== "opening") {
    return { success: false, reason: "The battle isn't open for opening right now" };
  }
  if (!battle.participants.includes(username)) {
    return { success: false, reason: "You're not part of this battle" };
  }

  const roundIndex = battle.results[username].length;
  if (roundIndex >= battle.caseIds.length) {
    return { success: false, reason: "You've already opened all your cases" };
  }

  const caseId = battle.caseIds[roundIndex];
  const caseData = getCaseById(caseId);
  if (!caseData) return { success: false, reason: "Case data unavailable" };

  const rolled = openCaseServer(caseData);
  const value = getItemValue(rolled);
  battle.results[username].push({ caseId, item: rolled, value, isRare: rolled.rare });
  battle.runningTotals[username] = (battle.runningTotals[username] || 0) + value;

  const allDone = battle.participants.every(
    (name) => battle.results[name].length >= battle.caseIds.length
  );
  if (allDone) {
    finishBattle(io, roomId);
  } else {
    broadcastBattleState(io, roomId);
  }

  return { success: true };
};

/**
 * Host starts the battle: validates preconditions, locks in participants,
 * runs the countdown, then opens the floor for everyone to start opening
 * their own cases. Returns a result object rather than a bare boolean so
 * the caller can relay *why* it was rejected.
 */
const startBattle = (io, roomId) => {
  const battle = getOrCreateBattleState(roomId);
  if (!battle || battle.status !== "lobby") {
    return { success: false, reason: "A battle is already in progress" };
  }
  if (battle.caseIds.length === 0) {
    return { success: false, reason: "Select at least one case first" };
  }

  const activeUsers = getActiveUsersInRoom(roomId);
  if (activeUsers.length < MIN_BATTLE_PLAYERS) {
    return {
      success: false,
      reason: `Need at least ${MIN_BATTLE_PLAYERS} active players to start`,
    };
  }

  battle.participants = activeUsers.map((u) => u.name);
  battle.results = {};
  battle.runningTotals = {};
  battle.winners = [];
  for (const username of battle.participants) {
    battle.results[username] = [];
    battle.runningTotals[username] = 0;
  }

  battle.status = "countdown";
  battle.countdownEndsAt = Date.now() + COUNTDOWN_MS;
  io.to(roomId).emit("battle_starting", { startsAt: battle.countdownEndsAt });
  broadcastBattleState(io, roomId);

  clearCountdownTimer(roomId);
  countdownTimers[roomId] = setTimeout(() => {
    battle.status = "opening";
    broadcastBattleState(io, roomId);
  }, COUNTDOWN_MS);

  return { success: true };
};

/**
 * Host returns the room to a fresh lobby/config state without recreating
 * the room. No-ops while a battle is actively running (countdown/opening)
 * — only valid once a battle has finished.
 */
const resetBattle = (io, roomId) => {
  const battle = getBattleState(roomId);
  if (!battle || battle.status === "countdown" || battle.status === "opening") {
    return { success: false, reason: "Can't reset while a battle is in progress" };
  }

  clearCountdownTimer(roomId);
  rooms[roomId].battle = createInitialBattleState();
  broadcastBattleState(io, roomId);

  return { success: true };
};

module.exports = {
  createInitialBattleState,
  getOrCreateBattleState,
  getBattleState,
  updateBattleSettings,
  openCase,
  startBattle,
  resetBattle,
};
