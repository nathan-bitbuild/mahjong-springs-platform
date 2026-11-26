import { DEFAULT_SCORING, type ScoringSettings } from "./scoring";

export type SessionFact = {
  userId: string;
  points: number;
  games: number;
  noshow: boolean;
  startAt: string;
  gameId: string;
};

export type PlayerFacts = {
  userId: string;
  name: string;
  played: SessionFact[];
  sessions: number;
  games: number;
  sum: number;
  penalties: number;
  noshows: number;
  adjust: number;
  best: SessionFact | null;
};

export type AwardKey = "spring" | "tile" | "consistency" | "table";

export type AwardRow = PlayerFacts & {
  value: number;
  rank?: number;
  date?: string;
  game?: string;
  need?: number;
  counted?: number;
  dropped?: number;
  top?: number | null;
};

export function buildPlayerFacts(
  rosterIds: string[],
  sessionsByUser: Record<string, SessionFact[]>,
  adjustments: Record<string, number>,
  names: Record<string, string>,
): Record<string, PlayerFacts> {
  const ids = new Set<string>([...rosterIds, ...Object.keys(sessionsByUser), ...Object.keys(adjustments)]);
  const facts: Record<string, PlayerFacts> = {};
  for (const uid of ids) {
    const list = sessionsByUser[uid] ?? [];
    const played = list.filter((s) => !s.noshow);
    const penalties = list.filter((s) => s.noshow).reduce((sum, s) => sum + s.points, 0);
    let best: SessionFact | null = null;
    for (const session of played) {
      if (!best || session.points > best.points || (session.points === best.points && session.startAt < best.startAt)) {
        best = session;
      }
    }
    facts[uid] = {
      userId: uid,
      name: names[uid] || uid,
      played,
      sessions: played.length,
      games: played.reduce((sum, s) => sum + s.games, 0),
      sum: played.reduce((sum, s) => sum + s.points, 0),
      penalties,
      noshows: list.length - played.length,
      adjust: adjustments[uid] ?? 0,
      best,
    };
  }
  return facts;
}

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function rankRows<T extends { value: number }>(
  rows: T[],
  cmp: (a: T, b: T) => number,
  same?: (a: T, b: T) => boolean,
): (T & { rank: number })[] {
  const sorted = [...rows].sort(cmp);
  let rank = 0;
  let prev: T | null = null;
  return sorted.map((row, index) => {
    const tied = prev !== null && (same ? same(prev, row) : prev.value === row.value);
    if (!tied) rank = index + 1;
    prev = row;
    return { ...row, rank };
  });
}

export function awardBoard(
  facts: Record<string, PlayerFacts>,
  award: AwardKey,
  settings: ScoringSettings = DEFAULT_SCORING,
): { rows: AwardRow[]; waiting: AwardRow[]; min: number } {
  const list = Object.values(facts);
  let rows: AwardRow[] = [];
  let waiting: AwardRow[] = [];
  let min = 0;

  if (award === "tile") {
    rows = list
      .filter((f) => f.best)
      .map((f) => ({ ...f, value: f.best!.points, date: f.best!.startAt, game: f.best!.gameId }));
    rows = rankRows(rows, (a, b) => b.value - a.value || a.date!.localeCompare(b.date!) || byName(a, b));
  } else if (award === "consistency") {
    min = settings.consistencyMinSessions;
    for (const f of list) {
      if (!f.sessions && !f.noshows) continue;
      const row: AwardRow = {
        ...f,
        value: f.sessions ? Math.round(((f.sum + f.penalties) / f.sessions) * 10) / 10 : 0,
        need: Math.max(0, min - f.sessions),
      };
      if (f.sessions >= min) rows.push(row);
      else waiting.push(row);
    }
    rows = rankRows(
      rows,
      (a, b) => b.value - a.value || b.sessions - a.sessions || byName(a, b),
      (a, b) => a.value === b.value && a.sessions === b.sessions,
    );
    waiting.sort((a, b) => (a.need ?? 0) - (b.need ?? 0) || b.value - a.value || byName(a, b));
  } else if (award === "table") {
    rows = list.filter((f) => f.games > 0).map((f) => ({ ...f, value: f.games }));
    rows = rankRows(
      rows,
      (a, b) => b.value - a.value || b.sessions - a.sessions || byName(a, b),
      (a, b) => a.value === b.value && a.sessions === b.sessions,
    );
  } else {
    const n = settings.springBestSessions;
    rows = list.map((f) => {
      const pts = f.played.map((s) => s.points).sort((a, b) => b - a);
      const counted = pts.slice(0, n);
      return {
        ...f,
        value: counted.reduce((sum, p) => sum + p, 0) + f.penalties + f.adjust,
        counted: counted.length,
        dropped: pts.length - counted.length,
        top: pts.length ? pts[0] : null,
      };
    });
    rows = rankRows(
      rows,
      (a, b) => {
        const ta = a.top ?? Number.NEGATIVE_INFINITY;
        const tb = b.top ?? Number.NEGATIVE_INFINITY;
        return b.value - a.value || tb - ta || byName(a, b);
      },
      (a, b) => a.value === b.value && a.top === b.top,
    );
  }

  return { rows, waiting, min };
}

export const AWARD_COPY: Record<AwardKey, { label: string; tagline: string; desc: string }> = {
  spring: {
    label: "Spring Queen",
    tagline: "The crown of the season",
    desc: "The most points over the season, counting your best 8 sessions (an official session is 4 games), so one rough night never holds you back. No-show penalties and admin adjustments still count. Fewer than 8 sessions? Everything you’ve played counts. Tie? The higher single session wins.",
  },
  tile: {
    label: "Tile Queen",
    tagline: "One dazzling night",
    desc: "The single highest session score of the season: 4 games at one table, one magical evening. Each player appears once with her best session and the date she played it.",
  },
  consistency: {
    label: "Consistency Queen",
    tagline: "Steady hands, pretty tiles",
    desc: "The best average points per session, once you’ve played at least 8 sessions. No-show penalties count against your average. Tie? The player with more sessions wins.",
  },
  table: {
    label: "Always at the Table",
    tagline: "Always pulling up a chair",
    desc: "The most games played this season: 4 games for every confirmed session. Tie? More sessions wins. Come play, we saved you a seat!",
  },
};
