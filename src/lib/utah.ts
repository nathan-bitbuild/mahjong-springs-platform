/**
 * Utah exclusivity. Only the Mahjong Springs home organization may create,
 * edit, or publish a league whose state is Utah or whose ZIP is 84xxx.
 */

export type LeagueWriteIntent = "create" | "edit" | "publish";

const UTAH_ZIP = /^84\d{3}(?:-\d{4})?$/;

export class LeagueRuleError extends Error {
  readonly intent: LeagueWriteIntent;

  constructor(message: string, intent: LeagueWriteIntent) {
    super(message);
    this.name = "LeagueRuleError";
    this.intent = intent;
  }
}

export function normalizeState(state: string): string {
  return state.trim().toLowerCase().replace(/\./g, "");
}

export function normalizeZip(zip: string): string {
  return zip.trim();
}

/** True when the venue is in Utah by state name or by a 84xxx ZIP. */
export function isUtahLocation(state: string, zip: string): boolean {
  const st = normalizeState(state);
  if (st === "ut" || st === "utah") return true;
  return UTAH_ZIP.test(normalizeZip(zip));
}

export function utahBlockReason(isHomeOrg: boolean, state: string, zip: string): string | null {
  if (isHomeOrg) return null;
  if (!isUtahLocation(state, zip)) return null;
  return "Only Mahjong Springs may host leagues in Utah.";
}

/**
 * Server-side gate used by league create, edit, and publish.
 * Pass the location being saved (including a move into Utah).
 */
export function assertLeagueLocationAllowed(input: {
  intent: LeagueWriteIntent;
  isHomeOrg: boolean;
  state: string;
  zip: string;
}): void {
  const reason = utahBlockReason(input.isHomeOrg, input.state, input.zip);
  if (reason) {
    throw new LeagueRuleError(`${reason} This was blocked on ${input.intent}.`, input.intent);
  }
}

export const US_STATES: { code: string; name: string }[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
].map(([code, name]) => ({ code, name }));
