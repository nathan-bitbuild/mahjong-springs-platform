import { describe, expect, it } from "vitest";
import { awardBoard, buildPlayerFacts } from "@/lib/awards";
import { canConfirmSheet, canSeePrivateAddress, computeSheetPoints, reconcileEntries } from "@/lib/scoring";

describe("scoring and awards", () => {
  it("scores a self-picked jokerless hand as card value plus both bonuses", () => {
    const points = computeSheetPoints(
      ["a", "b", "c", "d"],
      {},
      [{ handNo: 1, winnerId: "a", handValue: 30, selfPicked: true, jokerless: true, discarderId: "", deadHands: [] }],
    );
    expect(points.a.points).toBe(50);
    expect(points.a.wins).toBe(1);
    expect(points.b.points).toBe(0);
  });

  it("penalizes the discarder and a no-show, and scores a wall game", () => {
    const points = computeSheetPoints(
      ["a", "b", "c", "d"],
      { d: false },
      [
        { handNo: 1, winnerId: "a", handValue: 25, selfPicked: false, jokerless: false, discarderId: "b", deadHands: [] },
        { handNo: 2, winnerId: "", handValue: 0, selfPicked: false, jokerless: false, discarderId: "", deadHands: ["c"] },
      ],
    );
    expect(points.a.points).toBe(25 + 10);
    expect(points.b.points).toBe(-10 + 10);
    expect(points.c.points).toBe(0);
    expect(points.d.points).toBe(-25);
    expect(points.d.games).toBe(0);
    expect(points.a.games).toBe(2);
  });

  it("requires a consistent table before a sheet can be confirmed", () => {
    const players = ["a", "b"];
    const bad = reconcileEntries(players, {}, [
      { userId: "a", handNo: 1, outcome: "won", handValue: 25, selfPicked: false, jokerless: false, threw: false, dead: false },
      { userId: "b", handNo: 1, outcome: "other", handValue: 0, selfPicked: false, jokerless: false, threw: false, dead: false },
    ]);
    expect(bad.ok).toBe(false);
    expect(bad.conflicts[1]?.[0]).toMatch(/nobody reported throwing/);

    const good = reconcileEntries(players, {}, [
      { userId: "a", handNo: 1, outcome: "won", handValue: 25, selfPicked: false, jokerless: false, threw: false, dead: false },
      { userId: "b", handNo: 1, outcome: "other", handValue: 0, selfPicked: false, jokerless: false, threw: true, dead: false },
      { userId: "a", handNo: 2, outcome: "wall", handValue: 0, selfPicked: false, jokerless: false, threw: false, dead: false },
      { userId: "b", handNo: 2, outcome: "wall", handValue: 0, selfPicked: false, jokerless: false, threw: false, dead: false },
      { userId: "a", handNo: 3, outcome: "other", handValue: 0, selfPicked: false, jokerless: false, threw: false, dead: false },
      { userId: "b", handNo: 3, outcome: "won", handValue: 40, selfPicked: true, jokerless: false, threw: false, dead: false },
      { userId: "a", handNo: 4, outcome: "wall", handValue: 0, selfPicked: false, jokerless: false, threw: false, dead: true },
      { userId: "b", handNo: 4, outcome: "wall", handValue: 0, selfPicked: false, jokerless: false, threw: false, dead: false },
    ]);
    expect(good.ok).toBe(true);
    expect(good.hands).toHaveLength(4);
    expect(good.hands[0].discarderId).toBe("b");
    expect(good.hands[2].selfPicked).toBe(true);
    expect(good.hands[3].deadHands).toEqual(["a"]);
  });

  it("hides the address until a seat is claimed, and lets a tablemate or host confirm", () => {
    expect(canSeePrivateAddress({ userId: null, hostId: "h", attendeeIds: ["a"], isManager: false })).toBe(false);
    expect(canSeePrivateAddress({ userId: "stranger", hostId: "h", attendeeIds: ["a"], isManager: false })).toBe(false);
    expect(canSeePrivateAddress({ userId: "a", hostId: "h", attendeeIds: ["a"], isManager: false })).toBe(true);
    expect(canSeePrivateAddress({ userId: "h", hostId: "h", attendeeIds: [], isManager: false })).toBe(true);
    expect(canConfirmSheet({
      status: "pending", userId: "a", hostId: "h", isManager: false, presentPlayerIds: ["a", "b"], gameCancelled: false,
    })).toBe(true);
    expect(canConfirmSheet({
      status: "open", userId: "h", hostId: "h", isManager: false, presentPlayerIds: ["a"], gameCancelled: false,
    })).toBe(false);
  });

  it("ranks Spring Queen on the best 8 sessions and breaks ties with the higher night", () => {
    const sessions = {
      a: [
        { userId: "a", points: 100, games: 4, noshow: false, startAt: "2027-01-02", gameId: "g1" },
        { userId: "a", points: 10, games: 4, noshow: false, startAt: "2027-01-09", gameId: "g2" },
      ],
      b: [
        { userId: "b", points: 80, games: 4, noshow: false, startAt: "2027-01-02", gameId: "g3" },
        { userId: "b", points: 30, games: 4, noshow: false, startAt: "2027-01-09", gameId: "g4" },
      ],
    };
    const facts = buildPlayerFacts(["a", "b"], sessions, { a: -5 }, { a: "Ada", b: "Bea" });
    const board = awardBoard(facts, "spring");
    expect(board.rows[0].userId).toBe("b");
    expect(board.rows[0].value).toBe(110);
    expect(board.rows[1].userId).toBe("a");
    expect(board.rows[1].value).toBe(105);
    const tile = awardBoard(facts, "tile");
    expect(tile.rows[0].userId).toBe("a");
    expect(tile.rows[0].value).toBe(100);
    const table = awardBoard(facts, "table");
    expect(table.rows[0].value).toBe(8);
    expect(table.rows[0].rank).toBe(1);
    expect(table.rows[1].rank).toBe(1);
  });
});
