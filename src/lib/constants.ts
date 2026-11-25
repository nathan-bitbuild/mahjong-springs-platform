export const SITE_NAME = "Mahjong Springs";
export const CONTACT_EMAIL = "hello@mahjongsprings.com";
export const INSTAGRAM_URL = "https://www.instagram.com/mahjongsprings/";
export const INSTAGRAM_HANDLE = "@mahjongsprings";
export const HOME_CITY = "Saratoga Springs";
export const HOME_REGION = "UT";
export const HOME_POSTAL = "84045";
export const LEGAL_NAME = "Mahjong Springs LLC";

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://www.mahjongsprings.com";
  return raw.replace(/\/$/, "");
}

export function gaMeasurementId(): string {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
}

export const PUBLIC_LEAGUE_STATUSES = ["UPCOMING", "OPEN", "IN_PLAY", "CLOSED"] as const;
export const SIGNUP_STATUSES = ["OPEN", "IN_PLAY"] as const;

export function displayName(user: { name: string; displayName?: string | null }): string {
  const preferred = user.displayName?.trim();
  return preferred || user.name;
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "league";
}

export const SKILLS = [
  { value: "beginner", label: "Beginner" },
  { value: "comfortable", label: "Comfortable" },
  { value: "experienced", label: "Experienced" },
  { value: "social", label: "Social" },
] as const;

export const ROUND_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "beginner", label: "Beginner-friendly" },
  { value: "mindful", label: "Mindful-quiet" },
  { value: "social", label: "Social" },
] as const;

export function roundLabel(value: string): string {
  return ROUND_TYPES.find((item) => item.value === value)?.label ?? value;
}

export function skillLabel(value: string): string {
  return SKILLS.find((item) => item.value === value)?.label ?? value;
}

export const LEAGUE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  UPCOMING: "Upcoming",
  OPEN: "Open",
  IN_PLAY: "In play",
  CLOSED: "Closed",
};

/** Ported copy that described a single $80 charge is updated where it states the refund. */
export function withCurrentFeePolicy(text: string): string {
  const refund =
    "The organizer’s entry fee is refunded in full if you cancel before the league starts. The $5 booking fee added at checkout is non-refundable. Once the season has begun, the entry fee is non-refundable.";
  return text
    .replaceAll(
      "We offer a full refund before a league starts. Once the season has begun, registrations are non-refundable.",
      refund,
    )
    .replaceAll(
      "We offer a full refund before a league starts; once the season begins, registrations are non-refundable.",
      refund,
    )
    .replaceAll(
      "We offer a full refund if you cancel before a league starts; once the season begins, registrations are non-refundable.",
      refund,
    )
    .replaceAll(
      "We issue a full refund if you cancel before the league start date. Once a season has begun, league registrations are non-refundable.",
      refund,
    )
    .replaceAll("Your $80 registration covers", "Your $80 entry fee covers");
}
