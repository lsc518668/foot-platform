import { getDb } from './connection';

/**
 * Run all CREATE TABLE statements. Uses IF NOT EXISTS for idempotency.
 * Called on every server start.
 */
export function migrate(): void {
  const db = getDb();

  console.log('[Migrate] Running database migrations...');

  db.exec(`
    -- ============================================================
    -- USERS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS users (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        username        TEXT    NOT NULL UNIQUE,
        email           TEXT    NOT NULL UNIQUE,
        password_hash   TEXT    NOT NULL,
        role            TEXT    NOT NULL DEFAULT 'user'
            CHECK (role IN ('user', 'admin')),
        balance         REAL    NOT NULL DEFAULT 1000.0,
        is_frozen       INTEGER NOT NULL DEFAULT 0,
        total_won       REAL    NOT NULL DEFAULT 0.0,
        total_bet_count INTEGER NOT NULL DEFAULT 0,
        won_bet_count   INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- TEAMS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS teams (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name_zh     TEXT    NOT NULL,
        name_en     TEXT    NOT NULL,
        short_code  TEXT    NOT NULL UNIQUE,
        flag_emoji  TEXT    NOT NULL DEFAULT '',
        elo_rating  INTEGER NOT NULL DEFAULT 1500,
        group_name  TEXT,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- MATCHES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS matches (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        home_team_id  INTEGER NOT NULL REFERENCES teams(id),
        away_team_id  INTEGER NOT NULL REFERENCES teams(id),
        match_date    TEXT    NOT NULL,
        venue         TEXT    NOT NULL DEFAULT '',
        stage         TEXT    NOT NULL DEFAULT 'group'
            CHECK (stage IN (
                'group','round_of_32','round_of_16',
                'quarter_final','semi_final','third_place','final'
            )),
        status        TEXT    NOT NULL DEFAULT 'scheduled'
            CHECK (status IN ('scheduled','live','finished','cancelled')),
        home_score    INTEGER,
        away_score    INTEGER,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- ODDS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS odds (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id            INTEGER NOT NULL REFERENCES matches(id),
        market_type         TEXT    NOT NULL DEFAULT 'full_time'
            CHECK (market_type IN ('full_time','first_half','second_half','correct_score','penalty','corners')),
        home_win_odds       REAL,       -- NULL for markets that don't use home/draw/away
        draw_odds           REAL,
        away_win_odds       REAL,
        odds_data           TEXT,       -- JSON for complex odds (correct_score, corners, etc.)
        is_manual_override  INTEGER NOT NULL DEFAULT 0,
        calculated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE(match_id, market_type)
    );

    -- ============================================================
    -- BETS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS bets (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER NOT NULL REFERENCES users(id),
        match_id        INTEGER NOT NULL REFERENCES matches(id),
        market_type     TEXT    NOT NULL DEFAULT 'full_time',
        bet_type        TEXT    NOT NULL,
        amount          REAL    NOT NULL,
        odds_at_bet     REAL    NOT NULL,
        potential_payout REAL   NOT NULL,
        status          TEXT    NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending','won','lost','cancelled','refunded')),
        settled_at      TEXT,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

  `);

  // Migration: add market_type to existing bets table
  try {
    db.exec("ALTER TABLE bets ADD COLUMN market_type TEXT NOT NULL DEFAULT 'full_time'");
  } catch (_) { /* column already exists */ }

  // Migration: add parlay_id to bets table
  try {
    db.exec('ALTER TABLE bets ADD COLUMN parlay_id INTEGER REFERENCES parlay_tickets(id)');
  } catch (_) { /* column already exists */ }

  // Migration: drop old UNIQUE constraint on odds (match_id only)
  // SQLite can't ALTER constraints, so we handle via INSERT OR REPLACE in code

  db.exec(`

    CREATE INDEX IF NOT EXISTS idx_bets_user_id   ON bets(user_id);
    CREATE INDEX IF NOT EXISTS idx_bets_match_id  ON bets(match_id);
    CREATE INDEX IF NOT EXISTS idx_bets_status    ON bets(status);

    -- ============================================================
    -- PARLAY TICKETS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS parlay_tickets (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER NOT NULL REFERENCES users(id),
        stake           REAL    NOT NULL,
        total_odds      REAL    NOT NULL,
        potential_payout REAL   NOT NULL,
        legs_count      INTEGER NOT NULL DEFAULT 2,
        status          TEXT    NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending','won','lost','refunded')),
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        settled_at      TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_parlay_user ON parlay_tickets(user_id);

-- Add parlay_id to bets (nullable FK)
-- Try ALTER, ignore if column already exists

    -- ============================================================
    -- FORUM
    -- ============================================================
    CREATE TABLE IF NOT EXISTS forum_categories (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name_zh     TEXT    NOT NULL,
        name_en     TEXT    NOT NULL,
        sort_order   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS forum_posts (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        category_id INTEGER NOT NULL REFERENCES forum_categories(id),
        title       TEXT    NOT NULL,
        content     TEXT    NOT NULL,
        is_pinned   INTEGER NOT NULL DEFAULT 0,
        view_count  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_posts_category ON forum_posts(category_id);
    CREATE INDEX IF NOT EXISTS idx_posts_user ON forum_posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON forum_posts(created_at);

    CREATE TABLE IF NOT EXISTS forum_comments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id     INTEGER NOT NULL REFERENCES forum_posts(id),
        user_id     INTEGER NOT NULL REFERENCES users(id),
        content     TEXT    NOT NULL,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_comments_post ON forum_comments(post_id);

    -- ============================================================
    -- NEWS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS news (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title_zh    TEXT    NOT NULL,
        title_en    TEXT    NOT NULL DEFAULT '',
        content_zh  TEXT    NOT NULL,
        content_en  TEXT    NOT NULL DEFAULT '',
        summary_zh  TEXT    NOT NULL DEFAULT '',
        summary_en  TEXT    NOT NULL DEFAULT '',
        source      TEXT    NOT NULL DEFAULT '官方',
        is_pinned   INTEGER NOT NULL DEFAULT 0,
        view_count  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- TRANSACTIONS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS transactions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER NOT NULL REFERENCES users(id),
        type            TEXT    NOT NULL
            CHECK (type IN ('deposit','bet_placed','bet_won','bet_refunded','admin_adjust')),
        amount          REAL    NOT NULL,
        balance_before  REAL    NOT NULL,
        balance_after   REAL    NOT NULL,
        reference_id    INTEGER,
        description     TEXT    NOT NULL DEFAULT '',
        created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

    -- ============================================================
    -- AUDIT LOG
    -- ============================================================
    CREATE TABLE IF NOT EXISTS audit_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id    INTEGER NOT NULL REFERENCES users(id),
        action      TEXT    NOT NULL,
        target      TEXT    NOT NULL,
        target_id   INTEGER,
        details     TEXT,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_log(admin_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

    -- ============================================================
    -- SYSTEM CONFIG
    -- ============================================================
    CREATE TABLE IF NOT EXISTS system_config (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        key         TEXT    NOT NULL UNIQUE,
        value       TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log('[Migrate] All tables created successfully.');
}
