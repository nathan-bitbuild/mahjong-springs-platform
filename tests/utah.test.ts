import { describe, expect, it } from "vitest";
import { LeagueRuleError, assertLeagueLocationAllowed, isUtahLocation, utahBlockReason } from "@/lib/utah";

const intents = ["create", "edit", "publish"] as const;

describe("Utah exclusivity", () => {
  it("recognizes Utah by state or by an 84xxx ZIP", () => {
    expect(isUtahLocation("UT", "")).toBe(true);
    expect(isUtahLocation("Utah", "84101")).toBe(true);
    expect(isUtahLocation(" ut ", "")).toBe(true);
    expect(isUtahLocation("CO", "84045")).toBe(true);
    expect(isUtahLocation("CO", "84045-1234")).toBe(true);
    expect(isUtahLocation("TX", "78701")).toBe(false);
    expect(isUtahLocation("", "")).toBe(false);
    expect(isUtahLocation("CA", "94045")).toBe(false);
    expect(isUtahLocation("NV", "84")).toBe(false);
  });

  it("blocks every other organization on create, edit, and publish", () => {
    for (const intent of intents) {
      expect(() =>
        assertLeagueLocationAllowed({ intent, isHomeOrg: false, state: "UT", zip: "84101" }),
      ).toThrow(LeagueRuleError);
      expect(() =>
        assertLeagueLocationAllowed({ intent, isHomeOrg: false, state: "CO", zip: "84045" }),
      ).toThrow(/Only Mahjong Springs/);
      expect(() =>
        assertLeagueLocationAllowed({ intent, isHomeOrg: false, state: "Utah", zip: "" }),
      ).toThrow(LeagueRuleError);
    }
  });

  it("blocks moving an existing league into Utah", () => {
    expect(utahBlockReason(false, "UT", "84045")).toMatch(/Only Mahjong Springs/);
    expect(() =>
      assertLeagueLocationAllowed({ intent: "edit", isHomeOrg: false, state: "UT", zip: "84045" }),
    ).toThrow(/edit/);
    expect(() =>
      assertLeagueLocationAllowed({ intent: "publish", isHomeOrg: false, state: "ut", zip: "" }),
    ).toThrow(/publish/);
  });

  it("allows Mahjong Springs in Utah and allows other organizers outside Utah", () => {
    for (const intent of intents) {
      expect(() =>
        assertLeagueLocationAllowed({ intent, isHomeOrg: true, state: "UT", zip: "84045" }),
      ).not.toThrow();
      expect(() =>
        assertLeagueLocationAllowed({ intent, isHomeOrg: false, state: "CO", zip: "80202" }),
      ).not.toThrow();
    }
  });
});
