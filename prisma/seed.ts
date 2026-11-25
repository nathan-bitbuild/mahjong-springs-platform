import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const passwordHash = bcrypt.hashSync("Mahjong-Test-1", 10);

async function main() {
  await prisma.officialHand.deleteMany();
  await prisma.scoreEntry.deleteMany();
  await prisma.correction.deleteMany();
  await prisma.scoreSheet.deleteMany();
  await prisma.attendee.deleteMany();
  await prisma.game.deleteMany();
  await prisma.feeLedgerEntry.deleteMany();
  await prisma.adjustment.deleteMany();
  await prisma.roster.deleteMany();
  await prisma.mailLog.deleteMany();
  await prisma.stripeEvent.deleteMany();
  await prisma.league.deleteMany();
  await prisma.user.updateMany({ data: { organizationId: null } });
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();

  const lyndsey = await prisma.user.create({
    data: { email: "lyndsey@mahjongsprings.test", name: "Lyndsey", passwordHash, role: "ADMIN", isTestData: true },
  });
  const denise = await prisma.user.create({
    data: { email: "denise@mahjongsprings.test", name: "Denise", passwordHash, role: "ADMIN", isTestData: true },
  });
  const home = await prisma.organization.create({
    data: {
      name: "Mahjong Springs",
      slug: "mahjong-springs",
      isHome: true,
      status: "APPROVED",
      ownerId: lyndsey.id,
      cardPaymentsStatus: "inactive",
      isTestData: true,
    },
  });
  await prisma.user.update({ where: { id: lyndsey.id }, data: { organizationId: home.id } });
  await prisma.user.update({ where: { id: denise.id }, data: { organizationId: home.id } });

  const organizer = await prisma.user.create({
    data: { email: "test.organizer@example.test", name: "Test Organizer", passwordHash, role: "ORGANIZER", isTestData: true },
  });
  const denver = await prisma.organization.create({
    data: { name: "TEST Denver Organizer", slug: "test-denver", status: "APPROVED", ownerId: organizer.id, isTestData: true },
  });
  await prisma.user.update({ where: { id: organizer.id }, data: { organizationId: denver.id } });

  const pendingUser = await prisma.user.create({
    data: { email: "test.pending@example.test", name: "Test Pending", passwordHash, role: "ORGANIZER", isTestData: true },
  });
  const austin = await prisma.organization.create({
    data: { name: "TEST Pending Organizer", slug: "test-pending", status: "PENDING", ownerId: pendingUser.id, isTestData: true },
  });
  await prisma.user.update({ where: { id: pendingUser.id }, data: { organizationId: austin.id } });

  const host = await prisma.user.create({ data: { email: "test.host@example.test", name: "Test Host", passwordHash, partOfTown: "North shore", isTestData: true } });
  const seat = await prisma.user.create({ data: { email: "test.seat@example.test", name: "Test Seat", passwordHash, sharePhone: true, phone: "555-0100", isTestData: true } });
  const two = await prisma.user.create({ data: { email: "test.two@example.test", name: "Test Two", passwordHash, isTestData: true } });
  const three = await prisma.user.create({ data: { email: "test.three@example.test", name: "Test Three", passwordHash, isTestData: true } });
  await prisma.user.create({ data: { email: "test.player@example.test", name: "Test Player", passwordHash, isTestData: true } });

  const utah = await prisma.league.create({
    data: {
      organizationId: home.id,
      title: "TEST Spring Season",
      slug: "test-spring-season",
      description: "Local sample season for development. Not a live Mahjong Springs registration.",
      startDate: new Date("2026-11-01T00:00:00.000Z"),
      endDate: new Date("2026-12-26T00:00:00.000Z"),
      entryFeeCents: 8000,
      capacity: 16,
      venueCity: "Saratoga Springs",
      venueState: "UT",
      venueZip: "84045",
      status: "IN_PLAY",
      isTestData: true,
    },
  });
  await prisma.league.create({
    data: {
      organizationId: denver.id,
      title: "TEST Denver Season",
      slug: "test-denver-season",
      description: "Sample league outside Utah. Checkout stays closed until this test organizer connects Stripe.",
      startDate: new Date("2027-02-01T00:00:00.000Z"),
      endDate: new Date("2027-03-28T00:00:00.000Z"),
      entryFeeCents: 7500,
      capacity: 12,
      venueCity: "Denver",
      venueState: "CO",
      venueZip: "80202",
      status: "OPEN",
      isTestData: true,
    },
  });
  await prisma.league.create({
    data: {
      organizationId: austin.id,
      title: "TEST Austin Draft",
      slug: "test-austin-draft",
      description: "Must stay private while the organizer is pending.",
      startDate: new Date("2027-04-01T00:00:00.000Z"),
      endDate: new Date("2027-05-26T00:00:00.000Z"),
      entryFeeCents: 6000,
      capacity: 8,
      venueCity: "Austin",
      venueState: "TX",
      venueZip: "78701",
      status: "DRAFT",
      isTestData: true,
    },
  });

  const players = [host, seat, two, three];
  for (const player of players) {
    const roster = await prisma.roster.create({
      data: {
        leagueId: utah.id,
        userId: player.id,
        status: "ACTIVE",
        source: player.id === host.id ? "MANUAL" : "COMP",
        paymentStatus: player.id === host.id ? "PAID" : "COMP",
        entryFeeCents: 8000,
        bookingFeeCents: player.id === host.id ? 500 : 0,
        totalCents: player.id === host.id ? 8500 : 0,
        isTestData: true,
      },
    });
    if (player.id === host.id) {
      await prisma.feeLedgerEntry.create({
        data: {
          rosterId: roster.id,
          organizationId: home.id,
          grossCents: 8500,
          entryFeeCents: 8000,
          platformFeeCents: 500,
          isTestData: true,
        },
      });
    }
  }

  const past = await prisma.game.create({
    data: {
      leagueId: utah.id,
      hostId: host.id,
      startAt: new Date("2026-11-08T18:00:00.000Z"),
      timeZone: "America/Denver",
      address: "123 Test Court",
      city: "Saratoga Springs",
      state: "UT",
      zip: "84045",
      partOfTown: "North shore",
      roundType: "standard",
      tablesCount: 1,
      isTestData: true,
      status: "SCHEDULED",
    },
  });
  for (const [index, player] of players.entries()) {
    await prisma.attendee.create({ data: { gameId: past.id, userId: player.id, tableNo: 1, source: index === 0 ? "host" : "self" } });
  }
  const sheet = await prisma.scoreSheet.create({
    data: { gameId: past.id, tableNo: 1, status: "CONFIRMED", confirmedById: seat.id, confirmedAt: new Date("2026-11-08T22:00:00.000Z") },
  });
  await prisma.officialHand.createMany({
    data: [
      { sheetId: sheet.id, handNo: 1, winnerId: host.id, handValue: 30, selfPicked: true, jokerless: true },
      { sheetId: sheet.id, handNo: 2, winnerId: seat.id, handValue: 25, discarderId: two.id },
      { sheetId: sheet.id, handNo: 3, winnerId: "", deadHands: three.id },
      { sheetId: sheet.id, handNo: 4, winnerId: two.id, handValue: 40 },
    ],
  });

  const upcoming = await prisma.game.create({
    data: {
      leagueId: utah.id,
      hostId: host.id,
      startAt: new Date("2026-12-05T18:00:00.000Z"),
      timeZone: "America/Denver",
      venue: "Test living room",
      address: "123 Test Court",
      city: "Saratoga Springs",
      state: "UT",
      zip: "84045",
      partOfTown: "North shore",
      roundType: "beginner",
      tablesCount: 1,
      isTestData: true,
    },
  });
  await prisma.attendee.create({ data: { gameId: upcoming.id, userId: host.id, tableNo: 1, source: "host" } });
  await prisma.attendee.create({ data: { gameId: upcoming.id, userId: seat.id, tableNo: 1, source: "self" } });

  console.log("Seeded TEST data. Password for every test account: Mahjong-Test-1");
}

main().then(() => prisma.$disconnect()).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
