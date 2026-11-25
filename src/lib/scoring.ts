/** House scoring ported from mahjong-springs-league v1.4.0. */

export type ScoringSettings = {
  ptsSelfPicked: number;
  ptsJokerless: number;
  ptsWall: number;
  ptsDiscardPenalty: number;
  ptsNoshowPenalty: number;
  gamesPerSession: number;
  seatsPerTable: number;
  springBestSessions: number;
  consistencyMinSessions: number;
};

export const DEFAULT_SCORING: ScoringSettings = {
  ptsSelfPicked: 10,
  ptsJokerless: 10,
  ptsWall: 10,
  ptsDiscardPenalty: 10,
  ptsNoshowPenalty: 25,
  gamesPerSession: 4,
  seatsPerTable: 4,
  springBestSessions: 8,
  consistencyMinSessions: 8,
};

export type HandInput = {
  handNo: number;
  winnerId: string;
  handValue: number;
  selfPicked: boolean;
  jokerless: boolean;
  discarderId: string;
  deadHands: string[];
};

export type PlayerPoints = {
  points: number;
  games: number;
  wins: number;
  detail: string[];
};

export type ScoreOutcome = "won" | "other" | "wall" | "";

export type PlayerEntry = {
  userId: string;
  handNo: number;
  outcome: ScoreOutcome;
  handValue: number;
  selfPicked: boolean;
  jokerless: boolean;
  threw: boolean;
  dead: boolean;
};

export function computeSheetPoints(
  players: string[],
  noshows: Record<string, boolean>,
  hands: HandInput[],
  settings: ScoringSettings = DEFAULT_SCORING,
): Record<string, PlayerPoints> {
  const out: Record<string, PlayerPoints> = {};
  const ids = new Set<string>([...players, ...Object.keys(noshows)]);
  for (const uid of ids) {
    out[uid] = { points: 0, games: 0, wins: 0, detail: [] };
  }
  const present = Object.keys(out).filter((uid) => !(uid in noshows));

  for (const [uid, subArranged] of Object.entries(noshows)) {
    if (!subArranged && out[uid]) {
      out[uid].points -= settings.ptsNoshowPenalty;
      out[uid].detail.push(`No-show, no sub: -${settings.ptsNoshowPenalty}`);
    }
  }

  for (const hand of hands) {
    for (const uid of present) out[uid].games += 1;
    if (hand.winnerId && out[hand.winnerId]) {
      let pts = hand.handValue;
      let note = `G${hand.handNo} win ${hand.handValue}`;
      if (hand.selfPicked) {
        pts += settings.ptsSelfPicked;
        note += ` +${settings.ptsSelfPicked} self-picked`;
      }
      if (hand.jokerless) {
        pts += settings.ptsJokerless;
        note += ` +${settings.ptsJokerless} jokerless`;
      }
      out[hand.winnerId].points += pts;
      out[hand.winnerId].wins += 1;
      out[hand.winnerId].detail.push(note);
      if (!hand.selfPicked && hand.discarderId && hand.discarderId !== hand.winnerId && out[hand.discarderId]) {
        out[hand.discarderId].points -= settings.ptsDiscardPenalty;
        out[hand.discarderId].detail.push(`G${hand.handNo} threw winning tile -${settings.ptsDiscardPenalty}`);
      }
    } else if (!hand.winnerId) {
      const dead = new Set(hand.deadHands);
      for (const uid of present) {
        if (dead.has(uid)) {
          out[uid].detail.push(`G${hand.handNo} wall game, dead hand 0`);
          continue;
        }
        out[uid].points += settings.ptsWall;
        out[uid].detail.push(`G${hand.handNo} wall game +${settings.ptsWall}`);
      }
    }
  }
  return out;
}

export type ReconcileResult = {
  hands: HandInput[];
  missing: Record<number, string[]>;
  conflicts: Record<number, string[]>;
  complete: boolean;
  ok: boolean;
};

export function reconcileEntries(
  players: string[],
  noshows: Record<string, boolean>,
  entries: PlayerEntry[],
  names: Record<string, string> = {},
  settings: ScoringSettings = DEFAULT_SCORING,
): ReconcileResult {
  const nameOf = (id: string) => names[id] || id;
  const present = players.filter((id) => !(id in noshows));
  const byHand = new Map<string, PlayerEntry>();
  for (const entry of entries) byHand.set(`${entry.userId}:${entry.handNo}`, entry);

  const res: ReconcileResult = { hands: [], missing: {}, conflicts: {}, complete: false, ok: false };
  for (let i = 1; i <= settings.gamesPerSession; i += 1) {
    const won: PlayerEntry[] = [];
    const walls: string[] = [];
    const others: string[] = [];
    const threw: string[] = [];
    const dead: string[] = [];
    const missing: string[] = [];
    for (const player of present) {
      const entry = byHand.get(`${player}:${i}`);
      if (!entry || (entry.outcome !== "won" && entry.outcome !== "other" && entry.outcome !== "wall")) {
        missing.push(player);
        continue;
      }
      if (entry.outcome === "won") won.push(entry);
      else if (entry.outcome === "wall") walls.push(player);
      else {
        others.push(player);
        if (entry.threw) threw.push(player);
      }
      if (entry.dead && entry.outcome !== "won") dead.push(player);
    }
    const conflicts: string[] = [];
    if (won.length > 1) {
      conflicts.push(`More than one player reported winning (${won.map((e) => nameOf(e.userId)).join(", ")}).`);
    }
    if (won.length && walls.length) {
      conflicts.push(`${nameOf(won[0].userId)} reported a win but ${walls.map(nameOf).join(", ")} reported a wall game.`);
    }
    if (won.length === 1) {
      const winner = won[0];
      if (winner.selfPicked && threw.length) {
        conflicts.push(`${nameOf(winner.userId)} reported a self-picked win, but ${threw.map(nameOf).join(", ")} reported throwing the winning tile.`);
      } else if (threw.length > 1) {
        conflicts.push(`More than one player reported throwing the winning tile (${threw.map(nameOf).join(", ")}).`);
      } else if (!winner.selfPicked && !threw.length && !missing.length) {
        conflicts.push(`${nameOf(winner.userId)} won off a discard, but nobody reported throwing the winning tile.`);
      }
    }
    if (!won.length && others.length && !missing.length) {
      conflicts.push("Players reported that someone else won, but nobody reported the win.");
    }
    if (missing.length) res.missing[i] = missing;
    if (conflicts.length) res.conflicts[i] = conflicts;
    if (missing.length || conflicts.length) continue;
    if (won.length) {
      const winner = won[0];
      res.hands.push({
        handNo: i,
        winnerId: winner.userId,
        handValue: winner.handValue,
        selfPicked: winner.selfPicked,
        jokerless: winner.jokerless,
        discarderId: winner.selfPicked ? "" : threw[0],
        deadHands: dead,
      });
    } else {
      res.hands.push({
        handNo: i,
        winnerId: "",
        handValue: 0,
        selfPicked: false,
        jokerless: false,
        discarderId: "",
        deadHands: dead,
      });
    }
  }
  res.complete = Object.keys(res.missing).length === 0;
  res.ok = res.complete && Object.keys(res.conflicts).length === 0 && present.length >= 2;
  return res;
}

export function canConfirmSheet(input: {
  status: string;
  userId: string;
  hostId: string;
  isManager: boolean;
  presentPlayerIds: string[];
  gameCancelled: boolean;
}): boolean {
  if (input.status !== "pending" || !input.userId) return false;
  if (input.isManager) return true;
  if (input.gameCancelled) return false;
  if (input.userId === input.hostId) return true;
  return input.presentPlayerIds.includes(input.userId);
}

export function canSeePrivateAddress(input: {
  userId: string | null;
  hostId: string;
  attendeeIds: string[];
  isManager: boolean;
}): boolean {
  if (!input.userId) return false;
  return input.userId === input.hostId || input.isManager || input.attendeeIds.includes(input.userId);
}
