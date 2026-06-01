import { getDb } from './connection';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import * as oddsService from '../services/odds.service';

// ============================================================
// 48 Teams for World Cup 2026 (12 groups of 4)
// ============================================================
const TEAMS = [
  // Group A
  { nameZh: '美国',       nameEn: 'United States',    shortCode: 'USA', flagEmoji: '🇺🇸', eloRating: 1740, groupName: 'A' },
  { nameZh: '荷兰',       nameEn: 'Netherlands',      shortCode: 'NED', flagEmoji: '🇳🇱', eloRating: 1865, groupName: 'A' },
  { nameZh: '伊朗',       nameEn: 'Iran',             shortCode: 'IRN', flagEmoji: '🇮🇷', eloRating: 1600, groupName: 'A' },
  { nameZh: '新西兰',     nameEn: 'New Zealand',      shortCode: 'NZL', flagEmoji: '🇳🇿', eloRating: 1350, groupName: 'A' },

  // Group B
  { nameZh: '墨西哥',     nameEn: 'Mexico',           shortCode: 'MEX', flagEmoji: '🇲🇽', eloRating: 1720, groupName: 'B' },
  { nameZh: '葡萄牙',     nameEn: 'Portugal',         shortCode: 'POR', flagEmoji: '🇵🇹', eloRating: 1880, groupName: 'B' },
  { nameZh: '韩国',       nameEn: 'South Korea',      shortCode: 'KOR', flagEmoji: '🇰🇷', eloRating: 1680, groupName: 'B' },
  { nameZh: '喀麦隆',     nameEn: 'Cameroon',         shortCode: 'CMR', flagEmoji: '🇨🇲', eloRating: 1520, groupName: 'B' },

  // Group C
  { nameZh: '加拿大',     nameEn: 'Canada',           shortCode: 'CAN', flagEmoji: '🇨🇦', eloRating: 1620, groupName: 'C' },
  { nameZh: '英格兰',     nameEn: 'England',          shortCode: 'ENG', flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', eloRating: 1920, groupName: 'C' },
  { nameZh: '日本',       nameEn: 'Japan',            shortCode: 'JPN', flagEmoji: '🇯🇵', eloRating: 1750, groupName: 'C' },
  { nameZh: '埃及',       nameEn: 'Egypt',            shortCode: 'EGY', flagEmoji: '🇪🇬', eloRating: 1550, groupName: 'C' },

  // Group D
  { nameZh: '阿根廷',     nameEn: 'Argentina',        shortCode: 'ARG', flagEmoji: '🇦🇷', eloRating: 1980, groupName: 'D' },
  { nameZh: '德国',       nameEn: 'Germany',          shortCode: 'GER', flagEmoji: '🇩🇪', eloRating: 1850, groupName: 'D' },
  { nameZh: '塞内加尔',   nameEn: 'Senegal',          shortCode: 'SEN', flagEmoji: '🇸🇳', eloRating: 1640, groupName: 'D' },
  { nameZh: '阿联酋',     nameEn: 'UAE',              shortCode: 'UAE', flagEmoji: '🇦🇪', eloRating: 1420, groupName: 'D' },

  // Group E
  { nameZh: '巴西',       nameEn: 'Brazil',           shortCode: 'BRA', flagEmoji: '🇧🇷', eloRating: 1960, groupName: 'E' },
  { nameZh: '克罗地亚',   nameEn: 'Croatia',          shortCode: 'CRO', flagEmoji: '🇭🇷', eloRating: 1800, groupName: 'E' },
  { nameZh: '摩洛哥',     nameEn: 'Morocco',          shortCode: 'MAR', flagEmoji: '🇲🇦', eloRating: 1700, groupName: 'E' },
  { nameZh: '澳大利亚',   nameEn: 'Australia',        shortCode: 'AUS', flagEmoji: '🇦🇺', eloRating: 1580, groupName: 'E' },

  // Group F
  { nameZh: '法国',       nameEn: 'France',           shortCode: 'FRA', flagEmoji: '🇫🇷', eloRating: 1950, groupName: 'F' },
  { nameZh: '乌拉圭',     nameEn: 'Uruguay',          shortCode: 'URU', flagEmoji: '🇺🇾', eloRating: 1820, groupName: 'F' },
  { nameZh: '沙特阿拉伯', nameEn: 'Saudi Arabia',     shortCode: 'KSA', flagEmoji: '🇸🇦', eloRating: 1480, groupName: 'F' },
  { nameZh: '牙买加',     nameEn: 'Jamaica',          shortCode: 'JAM', flagEmoji: '🇯🇲', eloRating: 1400, groupName: 'F' },

  // Group G
  { nameZh: '西班牙',     nameEn: 'Spain',            shortCode: 'ESP', flagEmoji: '🇪🇸', eloRating: 1900, groupName: 'G' },
  { nameZh: '瑞士',       nameEn: 'Switzerland',      shortCode: 'SUI', flagEmoji: '🇨🇭', eloRating: 1780, groupName: 'G' },
  { nameZh: '哥伦比亚',   nameEn: 'Colombia',         shortCode: 'COL', flagEmoji: '🇨🇴', eloRating: 1760, groupName: 'G' },
  { nameZh: '中国',       nameEn: 'China',            shortCode: 'CHN', flagEmoji: '🇨🇳', eloRating: 1320, groupName: 'G' },

  // Group H
  { nameZh: '意大利',     nameEn: 'Italy',            shortCode: 'ITA', flagEmoji: '🇮🇹', eloRating: 1870, groupName: 'H' },
  { nameZh: '比利时',     nameEn: 'Belgium',          shortCode: 'BEL', flagEmoji: '🇧🇪', eloRating: 1840, groupName: 'H' },
  { nameZh: '秘鲁',       nameEn: 'Peru',             shortCode: 'PER', flagEmoji: '🇵🇪', eloRating: 1660, groupName: 'H' },
  { nameZh: '卡塔尔',     nameEn: 'Qatar',            shortCode: 'QAT', flagEmoji: '🇶🇦', eloRating: 1380, groupName: 'H' },

  // Group I
  { nameZh: '挪威',       nameEn: 'Norway',           shortCode: 'NOR', flagEmoji: '🇳🇴', eloRating: 1770, groupName: 'I' },
  { nameZh: '塞尔维亚',   nameEn: 'Serbia',           shortCode: 'SRB', flagEmoji: '🇷🇸', eloRating: 1710, groupName: 'I' },
  { nameZh: '尼日利亚',   nameEn: 'Nigeria',          shortCode: 'NGA', flagEmoji: '🇳🇬', eloRating: 1620, groupName: 'I' },
  { nameZh: '哥斯达黎加', nameEn: 'Costa Rica',       shortCode: 'CRC', flagEmoji: '🇨🇷', eloRating: 1460, groupName: 'I' },

  // Group J
  { nameZh: '丹麦',       nameEn: 'Denmark',          shortCode: 'DEN', flagEmoji: '🇩🇰', eloRating: 1810, groupName: 'J' },
  { nameZh: '奥地利',     nameEn: 'Austria',          shortCode: 'AUT', flagEmoji: '🇦🇹', eloRating: 1750, groupName: 'J' },
  { nameZh: '阿尔及利亚', nameEn: 'Algeria',          shortCode: 'ALG', flagEmoji: '🇩🇿', eloRating: 1580, groupName: 'J' },
  { nameZh: '伊拉克',     nameEn: 'Iraq',             shortCode: 'IRQ', flagEmoji: '🇮🇶', eloRating: 1340, groupName: 'J' },

  // Group K
  { nameZh: '厄瓜多尔',   nameEn: 'Ecuador',          shortCode: 'ECU', flagEmoji: '🇪🇨', eloRating: 1680, groupName: 'K' },
  { nameZh: '乌克兰',     nameEn: 'Ukraine',          shortCode: 'UKR', flagEmoji: '🇺🇦', eloRating: 1700, groupName: 'K' },
  { nameZh: '突尼斯',     nameEn: 'Tunisia',          shortCode: 'TUN', flagEmoji: '🇹🇳', eloRating: 1560, groupName: 'K' },
  { nameZh: '巴拿马',     nameEn: 'Panama',           shortCode: 'PAN', flagEmoji: '🇵🇦', eloRating: 1360, groupName: 'K' },

  // Group L
  { nameZh: '智利',       nameEn: 'Chile',            shortCode: 'CHI', flagEmoji: '🇨🇱', eloRating: 1690, groupName: 'L' },
  { nameZh: '瑞典',       nameEn: 'Sweden',           shortCode: 'SWE', flagEmoji: '🇸🇪', eloRating: 1760, groupName: 'L' },
  { nameZh: '加纳',       nameEn: 'Ghana',            shortCode: 'GHA', flagEmoji: '🇬🇭', eloRating: 1540, groupName: 'L' },
  { nameZh: '乌兹别克斯坦', nameEn: 'Uzbekistan',     shortCode: 'UZB', flagEmoji: '🇺🇿', eloRating: 1400, groupName: 'L' },
];

// ============================================================
// Initial system config
// ============================================================
const SYSTEM_CONFIG = [
  { key: 'initial_balance', value: '1000' },
  { key: 'min_bet_amount',  value: '1' },
  { key: 'max_bet_amount',  value: '5000' },
  { key: 'odds_margin',     value: '0.05' },
  { key: 'elo_k_factor',    value: '32' },
  { key: 'elo_home_advantage', value: '100' },
];

// ============================================================
// Initial matches (first round of group stage)
// ============================================================
const INITIAL_MATCHES = [
  { homeCode: 'MEX', awayCode: 'POR', date: '2026-06-11T20:00:00.000Z', venue: '阿兹特克体育场，墨西哥城', stage: 'group' },
  { homeCode: 'USA', awayCode: 'NED', date: '2026-06-12T17:00:00.000Z', venue: '大都会人寿体育场，新泽西', stage: 'group' },
  { homeCode: 'ARG', awayCode: 'GER', date: '2026-06-12T20:00:00.000Z', venue: '硬石体育场，迈阿密', stage: 'group' },
  { homeCode: 'CAN', awayCode: 'ENG', date: '2026-06-13T14:00:00.000Z', venue: 'BMO球场，多伦多', stage: 'group' },
  { homeCode: 'BRA', awayCode: 'CRO', date: '2026-06-13T17:00:00.000Z', venue: '玫瑰碗体育场，洛杉矶', stage: 'group' },
  { homeCode: 'FRA', awayCode: 'URU', date: '2026-06-13T20:00:00.000Z', venue: 'AT&T体育场，达拉斯', stage: 'group' },
  { homeCode: 'ESP', awayCode: 'SUI', date: '2026-06-14T17:00:00.000Z', venue: '李维斯体育场，圣克拉拉', stage: 'group' },
  { homeCode: 'ITA', awayCode: 'BEL', date: '2026-06-14T20:00:00.000Z', venue: '梅赛德斯-奔驰体育场，亚特兰大', stage: 'group' },
  { homeCode: 'JPN', awayCode: 'EGY', date: '2026-06-15T17:00:00.000Z', venue: '吉列体育场，福克斯堡', stage: 'group' },
  { homeCode: 'POR', awayCode: 'KOR', date: '2026-06-16T17:00:00.000Z', venue: '阿兹特克体育场，墨西哥城', stage: 'group' },
];

/**
 * Seed the database with initial data. Checks for existing data first to avoid duplicates.
 */
export function seed(): void {
  const db = getDb();

  // ---- Seed Teams ----
  const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').get() as { count: number };
  if (teamCount.count === 0) {
    console.log('[Seed] Inserting 48 teams...');
    const insertTeam = db.prepare(
      'INSERT INTO teams (name_zh, name_en, short_code, flag_emoji, elo_rating, group_name) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const t of TEAMS) {
      insertTeam.run(t.nameZh, t.nameEn, t.shortCode, t.flagEmoji, t.eloRating, t.groupName);
    }
    console.log(`[Seed] ✅ ${TEAMS.length} teams inserted.`);
  } else {
    console.log(`[Seed] ⏭️ Teams already exist (${teamCount.count} rows). Skipping.`);
  }

  // ---- Seed Admin User ----
  const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
  if (adminCount.count === 0) {
    console.log('[Seed] Creating admin user...');
    const passwordHash = bcrypt.hashSync('admin123456', config.bcryptRounds);
    db.prepare(
      'INSERT INTO users (username, email, password_hash, role, balance) VALUES (?, ?, ?, ?, ?)'
    ).run('admin', 'admin@fifa2026.com', passwordHash, 'admin', 0);
    console.log('[Seed] ✅ Admin user created (admin@fifa2026.com / admin123456)');
  } else {
    console.log('[Seed] ⏭️ Admin user already exists. Skipping.');
  }

  // ---- Seed System Config ----
  const configCount = db.prepare('SELECT COUNT(*) as count FROM system_config').get() as { count: number };
  if (configCount.count === 0) {
    console.log('[Seed] Inserting system config...');
    const insertConfig = db.prepare(
      'INSERT INTO system_config (key, value) VALUES (?, ?)'
    );
    for (const c of SYSTEM_CONFIG) {
      insertConfig.run(c.key, c.value);
    }
    console.log(`[Seed] ✅ ${SYSTEM_CONFIG.length} config entries inserted.`);
  } else {
    console.log('[Seed] ⏭️ System config already exists. Skipping.');
  }

  // ---- Seed Initial Matches ----
  const matchCount = db.prepare('SELECT COUNT(*) as count FROM matches').get() as { count: number };
  if (matchCount.count === 0) {
    console.log('[Seed] Inserting initial matches and calculating odds...');

    // Build a lookup: short_code -> team id
    const teams = db.prepare('SELECT id, short_code, elo_rating FROM teams').all() as Array<{ id: number; short_code: string; elo_rating: number }>;
    const teamMap = new Map(teams.map(t => [t.short_code, t]));

    const insertMatch = db.prepare(
      'INSERT INTO matches (home_team_id, away_team_id, match_date, venue, stage) VALUES (?, ?, ?, ?, ?)'
    );
    for (const m of INITIAL_MATCHES) {
        const homeTeam = teamMap.get(m.homeCode);
        const awayTeam = teamMap.get(m.awayCode);
        if (!homeTeam || !awayTeam) {
          console.warn(`[Seed] ⚠️ Team not found: ${m.homeCode} or ${m.awayCode}. Skipping match.`);
          continue;
        }
        insertMatch.run(homeTeam.id, awayTeam.id, m.date, m.venue, m.stage);
      }
    console.log(`[Seed] ✅ ${INITIAL_MATCHES.length} initial matches inserted.`);

    // Calculate odds for all matches (full set of markets)
    const allMatches = db.prepare('SELECT id FROM matches').all() as Array<{ id: number }>;
    for (const { id } of allMatches) {
      try { oddsService.calculateForMatch(id); } catch (e) {}
    }
    console.log(`[Seed] ✅ Multi-market odds calculated for ${allMatches.length} matches.`);
  } else {
    console.log(`[Seed] ⏭️ Matches already exist (${matchCount.count} rows). Skipping.`);
  }

  // ---- Seed Forum Categories ----
  const catCount = db.prepare('SELECT COUNT(*) as count FROM forum_categories').get() as { count: number };
  if (catCount.count === 0) {
    console.log('[Seed] Inserting forum categories...');
    const cats = [
      { zh: '赛事讨论', en: 'Match Discussion', order: 1 },
      { zh: '投注交流', en: 'Betting Talk', order: 2 },
      { zh: '球队专区', en: 'Team Zone', order: 3 },
      { zh: '新手问答', en: 'Q&A', order: 4 },
      { zh: '水帖专区', en: 'Off-Topic', order: 5 },
    ];
    const insertCat = db.prepare('INSERT INTO forum_categories (name_zh, name_en, sort_order) VALUES (?, ?, ?)');
    for (const c of cats) insertCat.run(c.zh, c.en, c.order);
    console.log(`[Seed] ✅ ${cats.length} forum categories inserted.`);
  }

  // ---- Seed News ----
  const newsCount = db.prepare('SELECT COUNT(*) as c FROM news').get() as { c: number };
  if (newsCount.c === 0) {
    console.log('[Seed] Inserting news...');
    const insertN = db.prepare("INSERT INTO news (title_zh, title_en, content_zh, content_en, summary_zh, summary_en, source, is_pinned) VALUES (?,?,?,?,?,?,?,?)");
    insertN.run('2026世界杯赛制正式确认：48队12组', '2026 World Cup Format Confirmed: 48 Teams, 12 Groups',
      'FIFA正式确认2026年世界杯赛制。48支参赛队分为12个小组，每组4队。小组赛前两名以及8个成绩最好的第三名晋级32强淘汰赛。这是历史上首次有48支球队参加的世界杯。揭幕战将于2026年6月11日在墨西哥城阿兹特克体育场举行，决赛将于7月19日在纽约大都会人寿体育场上演。',
      'FIFA has officially confirmed the 2026 World Cup format. 48 teams divided into 12 groups of 4. Top 2 from each group plus 8 best third-place teams advance to round of 32. Opening match June 11 at Estadio Azteca, Mexico City. Final July 19 at MetLife Stadium, New York.',
      'FIFA正式确认2026世界杯48队12组赛制，揭幕战6月11日墨西哥城，决赛7月19日纽约。',
      'FIFA confirms 2026 World Cup: 48 teams, 12 groups. Opening June 11 Mexico City, Final July 19 New York.',
      'FIFA官网', 1);
    insertN.run('阿根廷领衔战力榜：卫冕冠军成最大热门', 'Argentina Tops Power Rankings: Defending Champions are Favorites',
      '北京时间消息，各大博彩机构公布了2026世界杯最新夺冠赔率。卫冕冠军阿根廷在梅西退役后由阿尔瓦雷斯领衔的新一代阵容表现强劲，以微弱优势力压法国和巴西成为头号热门。三届冠军阿根廷在南美区预选赛中表现稳健，球队攻防两端均衡。',
      'Defending champions Argentina, led by Julian Alvarez, are favorites ahead of France and Brazil according to bookmakers. The three-time champions have been solid in CONMEBOL qualifiers.',
      '阿根廷在梅西退役后依然强势，阿尔瓦雷斯领衔新阵容成最大热门。',
      'Argentina leads favorites list ahead of France and Brazil.',
      'ESPN', 1);
    insertN.run('中国男足力争小组突围', 'China National Team Aims for Group Stage Breakthrough',
      '中国男足在亚洲区预选赛中成功突围，时隔20年重返世界杯决赛圈。球队在伊万科维奇的带领下形成了鲜明的防守反击风格，武磊、张玉宁等球员状态正佳。中国队被分在G组，将与西班牙、瑞士、哥伦比亚争夺出线权。',
      'China returns to World Cup after 20 years. Under coach Ivankovic, the team has developed a strong counter-attacking style. Group G opponents: Spain, Switzerland, Colombia.',
      '中国男足时隔20年重返世界杯，伊万科维奇带队在G组力争出线。',
      'China returns to World Cup after 20 years, placed in Group G.',
      '新华社', 0);
    insertN.run('赔率指南：如何看懂足球博彩赔率', 'Odds Guide: How to Read Football Betting Odds',
      '对于新手玩家来说，理解赔率是参与竞猜的第一步。本文详细介绍三种常见赔率格式（十进制、分数制、美式）的区别和使用方法，并解释Elo评级系统如何转化为比赛赔率。学完本文，你就能像专家一样分析比赛了！',
      'A beginner guide to football betting odds. Learn decimal, fractional, and American formats, and understand how Elo ratings translate to match odds.',
      '新手必读：三种赔率格式详解，Elo评级如何转化为比赛赔率。',
      'Beginner guide to betting odds formats and Elo-based calculations.',
      '本站原创', 0);
    console.log(`[Seed] ✅ 4 news articles inserted.`);
  }
}

// Seed is called from index.ts after database initialization
// To run standalone: npx tsx -e "import('./src/db/connection').then(m=>m.initDb().then(()=>{require('./src/db/migrate').migrate();require('./src/db/seed').seed();}))"
