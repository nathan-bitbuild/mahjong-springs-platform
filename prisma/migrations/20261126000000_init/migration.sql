-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ORGANIZER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('DRAFT', 'UPCOMING', 'OPEN', 'IN_PLAY', 'CLOSED');

-- CreateEnum
CREATE TYPE "RosterStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'WAITLIST', 'REMOVED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RosterSource" AS ENUM ('ORDER', 'COMP', 'MANUAL', 'FREE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'COMP', 'REFUNDED', 'DISPUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SheetStatus" AS ENUM ('OPEN', 'PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('NONE', 'OPEN', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "displayName" TEXT NOT NULL DEFAULT '',
    "skill" TEXT NOT NULL DEFAULT 'social',
    "partOfTown" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "sharePhone" BOOLEAN NOT NULL DEFAULT false,
    "emailReminders" BOOLEAN NOT NULL DEFAULT true,
    "emailHostUpdates" BOOLEAN NOT NULL DEFAULT true,
    "emailScores" BOOLEAN NOT NULL DEFAULT true,
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
    "ownerId" TEXT NOT NULL,
    "stripeAccountId" TEXT,
    "cardPaymentsStatus" TEXT NOT NULL DEFAULT 'inactive',
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "entryFeeCents" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "venueCity" TEXT NOT NULL,
    "venueState" TEXT NOT NULL,
    "venueZip" TEXT NOT NULL DEFAULT '',
    "status" "LeagueStatus" NOT NULL DEFAULT 'DRAFT',
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roster" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RosterStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "source" "RosterSource" NOT NULL DEFAULT 'ORDER',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "entryFeeCents" INTEGER NOT NULL,
    "bookingFeeCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "checkoutIntegrationId" TEXT,
    "checkoutAttempt" INTEGER NOT NULL DEFAULT 0,
    "legacyOrderId" INTEGER,
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeLedgerEntry" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "entryFeeCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "refundedEntryCents" INTEGER NOT NULL DEFAULT 0,
    "disputeStatus" "DisputeStatus" NOT NULL DEFAULT 'NONE',
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Denver',
    "venue" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "zip" TEXT NOT NULL DEFAULT '',
    "partOfTown" TEXT NOT NULL DEFAULT '',
    "roundType" TEXT NOT NULL DEFAULT 'standard',
    "notes" TEXT NOT NULL DEFAULT '',
    "tablesCount" INTEGER NOT NULL DEFAULT 1,
    "status" "GameStatus" NOT NULL DEFAULT 'SCHEDULED',
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendee" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tableNo" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'self',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSheet" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "tableNo" INTEGER NOT NULL,
    "status" "SheetStatus" NOT NULL DEFAULT 'OPEN',
    "noshows" JSONB NOT NULL DEFAULT '{}',
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreEntry" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handNo" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT '',
    "handValue" INTEGER NOT NULL DEFAULT 0,
    "selfPicked" BOOLEAN NOT NULL DEFAULT false,
    "jokerless" BOOLEAN NOT NULL DEFAULT false,
    "threw" BOOLEAN NOT NULL DEFAULT false,
    "dead" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialHand" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "handNo" INTEGER NOT NULL,
    "winnerId" TEXT NOT NULL DEFAULT '',
    "handValue" INTEGER NOT NULL DEFAULT 0,
    "selfPicked" BOOLEAN NOT NULL DEFAULT false,
    "jokerless" BOOLEAN NOT NULL DEFAULT false,
    "discarderId" TEXT NOT NULL DEFAULT '',
    "deadHands" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "OfficialHand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adjustment" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Correction" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Correction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'homepage',
    "ipHash" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailLog" (
    "id" TEXT NOT NULL,
    "mailKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeAccountId_key" ON "Organization"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "League"("slug");

-- CreateIndex
CREATE INDEX "League_organizationId_status_idx" ON "League"("organizationId", "status");

-- CreateIndex
CREATE INDEX "League_venueState_venueCity_idx" ON "League"("venueState", "venueCity");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_stripeCheckoutSessionId_key" ON "Roster"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "Roster_paymentStatus_idx" ON "Roster"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_leagueId_userId_key" ON "Roster"("leagueId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeLedgerEntry_rosterId_key" ON "FeeLedgerEntry"("rosterId");

-- CreateIndex
CREATE INDEX "FeeLedgerEntry_organizationId_idx" ON "FeeLedgerEntry"("organizationId");

-- CreateIndex
CREATE INDEX "Game_leagueId_startAt_idx" ON "Game"("leagueId", "startAt");

-- CreateIndex
CREATE INDEX "Game_city_startAt_idx" ON "Game"("city", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attendee_gameId_userId_key" ON "Attendee"("gameId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreSheet_gameId_tableNo_key" ON "ScoreSheet"("gameId", "tableNo");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreEntry_sheetId_userId_handNo_key" ON "ScoreEntry"("sheetId", "userId", "handNo");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialHand_sheetId_handNo_key" ON "OfficialHand"("sheetId", "handNo");

-- CreateIndex
CREATE INDEX "Adjustment_leagueId_idx" ON "Adjustment"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MailLog_mailKey_key" ON "MailLog"("mailKey");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeLedgerEntry" ADD CONSTRAINT "FeeLedgerEntry_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "Roster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeLedgerEntry" ADD CONSTRAINT "FeeLedgerEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheet" ADD CONSTRAINT "ScoreSheet_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEntry" ADD CONSTRAINT "ScoreEntry_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ScoreSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEntry" ADD CONSTRAINT "ScoreEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialHand" ADD CONSTRAINT "OfficialHand_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ScoreSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ScoreSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

