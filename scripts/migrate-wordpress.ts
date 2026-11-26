/**
 * WordPress → Postgres migration stub for Mahjong Springs.
 *
 * The live site is not contacted. Point WP_DATABASE_URL at a read-only copy of
 * the WordPress database (table prefix usually wp_) and DATABASE_URL at the
 * new Postgres database. This file maps the msl_* tables and does not move money:
 * historical WooCommerce orders become roster rows with legacyOrderId set and
 * paymentStatus PAID, so nobody is charged again.
 *
 * Run: npm run migrate:wordpress
 * Without WP_DATABASE_URL it prints the mapping and exits 0.
 */

const TABLE_MAP = [
  {
    source: "wp_posts (post_type = msl_league) + wp_postmeta (_msl_start, _msl_end, _msl_fee, _msl_cap, _msl_status)",
    target: "League",
    notes: "Attach every imported league to the Mahjong Springs home organization. Draft and private posts stay DRAFT.",
  },
  {
    source: "wp_msl_roster",
    target: "Roster",
    columns: "league_id, user_id, status, source, order_id → legacyOrderId, created_at",
  },
  {
    source: "wp_msl_games",
    target: "Game",
    columns: "league_id, host_id, start_at, venue, address, city, state, zip, tables_count, skill → roundType, notes, part_of_town, status",
  },
  {
    source: "wp_msl_attendees",
    target: "Attendee",
    columns: "game_id, user_id, table_no, source, created_at",
  },
  {
    source: "wp_msl_sheets",
    target: "ScoreSheet",
    columns: "game_id, table_no, status, noshows, confirmed_by, confirmed_at",
  },
  {
    source: "wp_msl_hands",
    target: "OfficialHand",
    columns: "sheet_id, hand_no, winner_id, hand_value, self_picked, jokerless, discarder_id, dead_hands",
  },
  {
    source: "wp_msl_entries",
    target: "ScoreEntry",
    columns: "sheet_id, user_id, hand_no, outcome, hand_value, self_picked, jokerless, threw, dead",
  },
  {
    source: "wp_msl_adjustments",
    target: "Adjustment",
    columns: "league_id, user_id, points, note, created_by, created_at",
  },
  {
    source: "wp_msl_corrections",
    target: "Correction",
    columns: "sheet_id, game_id, user_id, note, status, created_at, resolved_at",
  },
  {
    source: "wp_msl_newsletter",
    target: "NewsletterSubscriber",
    columns: "email, source, ip_hash, created_at",
  },
  {
    source: "wp_msl_maillog",
    target: "MailLog",
    columns: "mail_key, type, user_id, email, status, sent_at",
  },
  {
    source: "wp_users + wp_usermeta (display name, skill, part of town, phone)",
    target: "User",
    notes: "Do not copy password hashes. Imported players get a password-reset required flag by leaving passwordHash as a random unusable value and emailing a reset after cutover.",
  },
] as const;

function main() {
  console.log("Mahjong Springs WordPress migration map");
  for (const row of TABLE_MAP) {
    console.log(`\n- ${row.source}`);
    console.log(`  → ${row.target}`);
    if ("columns" in row && row.columns) console.log(`  columns: ${row.columns}`);
    if ("notes" in row && row.notes) console.log(`  notes: ${row.notes}`);
  }
  if (!process.env.WP_DATABASE_URL) {
    console.log("\nWP_DATABASE_URL is not set. This stub did not read or write a database.");
    return;
  }
  console.log("\nA WordPress URL is set, but the MySQL reader is not implemented in Phase 1.");
  console.log("Use the column map above to load a SQL dump into Postgres after review.");
}

main();
