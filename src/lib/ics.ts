function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildGameIcs(input: {
  uid: string;
  title: string;
  start: Date;
  durationMinutes?: number;
  location: string;
  description: string;
  url: string;
}): string {
  const duration = input.durationMinutes ?? 180;
  const end = new Date(input.start.getTime() + duration * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mahjong Springs//League//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsEscape(input.uid)}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(input.start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(input.title)}`,
    `LOCATION:${icsEscape(input.location)}`,
    `DESCRIPTION:${icsEscape(input.description)}`,
    `URL:${icsEscape(input.url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

export function googleCalendarUrl(input: { title: string; start: Date; location: string; details: string }): string {
  const end = new Date(input.start.getTime() + 3 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${fmt(input.start)}/${fmt(end)}`,
    location: input.location,
    details: input.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
