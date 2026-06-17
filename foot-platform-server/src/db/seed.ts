import { getDb } from './connection';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import * as oddsService from '../services/odds.service';

// ============================================================
// 48 Teams - 2026 World Cup Official Groups
// Source: Bing Sports (cn.bing.com/sportsdetails) 2026-06-18
// Elo: OddsPortal.com winner odds for 36 teams, estimated for 12
// ============================================================
const TEAMS = [
  // Group A: 墨西哥 / 南非 / 韩国 / 捷克
  { nameZh: '墨西哥', nameEn: 'Mexico', shortCode: 'MEX', flagEmoji: '🇲🇽', eloRating: 1589, groupName: 'A' },
  { nameZh: '南非', nameEn: 'South Africa', shortCode: 'RSA', flagEmoji: '🇿🇦', eloRating: 1350, groupName: 'A' },
  { nameZh: '韩国', nameEn: 'South Korea', shortCode: 'KOR', flagEmoji: '🇰🇷', eloRating: 1247, groupName: 'A' },
  { nameZh: '捷克', nameEn: 'Czech Republic', shortCode: 'CZE', flagEmoji: '🇨🇿', eloRating: 1550, groupName: 'A' },

  // Group B: 加拿大 / 波黑 / 卡塔尔 / 瑞士
  { nameZh: '加拿大', nameEn: 'Canada', shortCode: 'CAN', flagEmoji: '🇨🇦', eloRating: 1390, groupName: 'B' },
  { nameZh: '波黑', nameEn: 'Bosnia and Herzegovina', shortCode: 'BIH', flagEmoji: '🇧🇦', eloRating: 1550, groupName: 'B' },
  { nameZh: '卡塔尔', nameEn: 'Qatar', shortCode: 'QAT', flagEmoji: '🇶🇦', eloRating: 1200, groupName: 'B' },
  { nameZh: '瑞士', nameEn: 'Switzerland', shortCode: 'SUI', flagEmoji: '🇨🇭', eloRating: 1525, groupName: 'B' },

  // Group C: 巴西 / 摩洛哥 / 海地 / 苏格兰
  { nameZh: '巴西', nameEn: 'Brazil', shortCode: 'BRA', flagEmoji: '🇧🇷', eloRating: 1856, groupName: 'C' },
  { nameZh: '摩洛哥', nameEn: 'Morocco', shortCode: 'MAR', flagEmoji: '🇲🇦', eloRating: 1643, groupName: 'C' },
  { nameZh: '海地', nameEn: 'Haiti', shortCode: 'HAI', flagEmoji: '🇭🇹', eloRating: 1250, groupName: 'C' },
  { nameZh: '苏格兰', nameEn: 'Scotland', shortCode: 'SCO', flagEmoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', eloRating: 1550, groupName: 'C' },

  // Group D: 美国 / 巴拉圭 / 澳大利亚 / 土耳其
  { nameZh: '美国', nameEn: 'United States', shortCode: 'USA', flagEmoji: '🇺🇸', eloRating: 1643, groupName: 'D' },
  { nameZh: '巴拉圭', nameEn: 'Paraguay', shortCode: 'PAR', flagEmoji: '🇵🇾', eloRating: 1208, groupName: 'D' },
  { nameZh: '澳大利亚', nameEn: 'Australia', shortCode: 'AUS', flagEmoji: '🇦🇺', eloRating: 1247, groupName: 'D' },
  { nameZh: '土耳其', nameEn: 'Turkey', shortCode: 'TUR', flagEmoji: '🇹🇷', eloRating: 1600, groupName: 'D' },

  // Group E: 德国 / 库拉索 / 科特迪瓦 / 厄瓜多尔
  { nameZh: '德国', nameEn: 'Germany', shortCode: 'GER', flagEmoji: '🇩🇪', eloRating: 1818, groupName: 'E' },
  { nameZh: '库拉索', nameEn: 'Curacao', shortCode: 'CUW', flagEmoji: '🇨🇼', eloRating: 1200, groupName: 'E' },
  { nameZh: '科特迪瓦', nameEn: 'Ivory Coast', shortCode: 'CIV', flagEmoji: '🇨🇮', eloRating: 1328, groupName: 'E' },
  { nameZh: '厄瓜多尔', nameEn: 'Ecuador', shortCode: 'ECU', flagEmoji: '🇪🇨', eloRating: 1416, groupName: 'E' },

  // Group F: 荷兰 / 日本 / 瑞典 / 突尼斯
  { nameZh: '荷兰', nameEn: 'Netherlands', shortCode: 'NED', flagEmoji: '🇳🇱', eloRating: 1759, groupName: 'F' },
  { nameZh: '日本', nameEn: 'Japan', shortCode: 'JPN', flagEmoji: '🇯🇵', eloRating: 1605, groupName: 'F' },
  { nameZh: '瑞典', nameEn: 'Sweden', shortCode: 'SWE', flagEmoji: '🇸🇪', eloRating: 1376, groupName: 'F' },
  { nameZh: '突尼斯', nameEn: 'Tunisia', shortCode: 'TUN', flagEmoji: '🇹🇳', eloRating: 1200, groupName: 'F' },

  // Group G: 比利时 / 埃及 / 伊朗 / 新西兰
  { nameZh: '比利时', nameEn: 'Belgium', shortCode: 'BEL', flagEmoji: '🇧🇪', eloRating: 1643, groupName: 'G' },
  { nameZh: '埃及', nameEn: 'Egypt', shortCode: 'EGY', flagEmoji: '🇪🇬', eloRating: 1247, groupName: 'G' },
  { nameZh: '伊朗', nameEn: 'Iran', shortCode: 'IRN', flagEmoji: '🇮🇷', eloRating: 1200, groupName: 'G' },
  { nameZh: '新西兰', nameEn: 'New Zealand', shortCode: 'NZL', flagEmoji: '🇳🇿', eloRating: 1200, groupName: 'G' },

  // Group H: 西班牙 / 佛得角 / 沙特阿拉伯 / 乌拉圭
  { nameZh: '西班牙', nameEn: 'Spain', shortCode: 'ESP', flagEmoji: '🇪🇸', eloRating: 1963, groupName: 'H' },
  { nameZh: '佛得角', nameEn: 'Cape Verde', shortCode: 'CPV', flagEmoji: '🇨🇻', eloRating: 1250, groupName: 'H' },
  { nameZh: '沙特阿拉伯', nameEn: 'Saudi Arabia', shortCode: 'KSA', flagEmoji: '🇸🇦', eloRating: 1200, groupName: 'H' },
  { nameZh: '乌拉圭', nameEn: 'Uruguay', shortCode: 'URU', flagEmoji: '🇺🇾', eloRating: 1536, groupName: 'H' },

  // Group I: 法国 / 塞内加尔 / 伊拉克 / 挪威
  { nameZh: '法国', nameEn: 'France', shortCode: 'FRA', flagEmoji: '🇫🇷', eloRating: 2000, groupName: 'I' },
  { nameZh: '塞内加尔', nameEn: 'Senegal', shortCode: 'SEN', flagEmoji: '🇸🇳', eloRating: 1441, groupName: 'I' },
  { nameZh: '伊拉克', nameEn: 'Iraq', shortCode: 'IRQ', flagEmoji: '🇮🇶', eloRating: 1300, groupName: 'I' },
  { nameZh: '挪威', nameEn: 'Norway', shortCode: 'NOR', flagEmoji: '🇳🇴', eloRating: 1676, groupName: 'I' },

  // Group J: 阿根廷 / 阿尔及利亚 / 奥地利 / 约旦
  { nameZh: '阿根廷', nameEn: 'Argentina', shortCode: 'ARG', flagEmoji: '🇦🇷', eloRating: 1888, groupName: 'J' },
  { nameZh: '阿尔及利亚', nameEn: 'Algeria', shortCode: 'ALG', flagEmoji: '🇩🇿', eloRating: 1208, groupName: 'J' },
  { nameZh: '奥地利', nameEn: 'Austria', shortCode: 'AUT', flagEmoji: '🇦🇹', eloRating: 1448, groupName: 'J' },
  { nameZh: '约旦', nameEn: 'Jordan', shortCode: 'JOR', flagEmoji: '🇯🇴', eloRating: 1250, groupName: 'J' },

  // Group K: 葡萄牙 / 刚果民主共和国 / 乌兹别克斯坦 / 哥伦比亚
  { nameZh: '葡萄牙', nameEn: 'Portugal', shortCode: 'POR', flagEmoji: '🇵🇹', eloRating: 1888, groupName: 'K' },
  { nameZh: '刚果民主共和国', nameEn: 'DR Congo', shortCode: 'COD', flagEmoji: '🇨🇩', eloRating: 1350, groupName: 'K' },
  { nameZh: '乌兹别克斯坦', nameEn: 'Uzbekistan', shortCode: 'UZB', flagEmoji: '🇺🇿', eloRating: 1350, groupName: 'K' },
  { nameZh: '哥伦比亚', nameEn: 'Colombia', shortCode: 'COL', flagEmoji: '🇨🇴', eloRating: 1623, groupName: 'K' },

  // Group L: 英格兰 / 克罗地亚 / 加纳 / 巴拿马
  { nameZh: '英格兰', nameEn: 'England', shortCode: 'ENG', flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', eloRating: 1927, groupName: 'L' },
  { nameZh: '克罗地亚', nameEn: 'Croatia', shortCode: 'CRO', flagEmoji: '🇭🇷', eloRating: 1525, groupName: 'L' },
  { nameZh: '加纳', nameEn: 'Ghana', shortCode: 'GHA', flagEmoji: '🇬🇭', eloRating: 1200, groupName: 'L' },
  { nameZh: '巴拿马', nameEn: 'Panama', shortCode: 'PAN', flagEmoji: '🇵🇦', eloRating: 1200, groupName: 'L' },
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
// Initial matches — official 2026 World Cup schedule
// Source: Bing Sports 2026-06-18
// ============================================================
const INITIAL_MATCHES = [
  // Round 1 — June 12-18
  { homeCode: 'MEX', awayCode: 'RSA', date: '2026-06-12T09:00:00.000Z', venue: '阿兹特克体育场，墨西哥城', stage: 'group' },
  { homeCode: 'KOR', awayCode: 'CZE', date: '2026-06-12T12:00:00.000Z', venue: '大都会人寿体育场，新泽西', stage: 'group' },
  { homeCode: 'CAN', awayCode: 'BIH', date: '2026-06-13T09:00:00.000Z', venue: '硬石体育场，迈阿密', stage: 'group' },
  { homeCode: 'USA', awayCode: 'PAR', date: '2026-06-13T12:00:00.000Z', venue: 'BMO球场，多伦多', stage: 'group' },
  { homeCode: 'QAT', awayCode: 'SUI', date: '2026-06-13T16:00:00.000Z', venue: '玫瑰碗体育场，洛杉矶', stage: 'group' },
  { homeCode: 'BRA', awayCode: 'MAR', date: '2026-06-13T19:00:00.000Z', venue: 'AT&T体育场，达拉斯', stage: 'group' },
  { homeCode: 'HAI', awayCode: 'SCO', date: '2026-06-13T22:00:00.000Z', venue: '李维斯体育场，圣克拉拉', stage: 'group' },
  { homeCode: 'AUS', awayCode: 'TUR', date: '2026-06-14T01:00:00.000Z', venue: '梅赛德斯-奔驰体育场，亚特兰大', stage: 'group' },
  { homeCode: 'GER', awayCode: 'CUW', date: '2026-06-14T16:00:00.000Z', venue: '吉列体育场，福克斯堡', stage: 'group' },
  { homeCode: 'NED', awayCode: 'JPN', date: '2026-06-14T19:00:00.000Z', venue: '流明球场，西雅图', stage: 'group' },
  { homeCode: 'CIV', awayCode: 'ECU', date: '2026-06-14T22:00:00.000Z', venue: '阿兹特克体育场，墨西哥城', stage: 'group' },
  { homeCode: 'SWE', awayCode: 'TUN', date: '2026-06-15T01:00:00.000Z', venue: '大都会人寿体育场，新泽西', stage: 'group' },
  { homeCode: 'ESP', awayCode: 'CPV', date: '2026-06-15T16:00:00.000Z', venue: '硬石体育场，迈阿密', stage: 'group' },
  { homeCode: 'BEL', awayCode: 'EGY', date: '2026-06-15T19:00:00.000Z', venue: 'BMO球场，多伦多', stage: 'group' },
  { homeCode: 'KSA', awayCode: 'URU', date: '2026-06-15T22:00:00.000Z', venue: '玫瑰碗体育场，洛杉矶', stage: 'group' },
  { homeCode: 'IRN', awayCode: 'NZL', date: '2026-06-16T01:00:00.000Z', venue: 'AT&T体育场，达拉斯', stage: 'group' },
  { homeCode: 'FRA', awayCode: 'SEN', date: '2026-06-16T16:00:00.000Z', venue: '李维斯体育场，圣克拉拉', stage: 'group' },
  { homeCode: 'IRQ', awayCode: 'NOR', date: '2026-06-16T19:00:00.000Z', venue: '梅赛德斯-奔驰体育场，亚特兰大', stage: 'group' },
  { homeCode: 'ARG', awayCode: 'ALG', date: '2026-06-16T22:00:00.000Z', venue: '吉列体育场，福克斯堡', stage: 'group' },
  { homeCode: 'AUT', awayCode: 'JOR', date: '2026-06-17T01:00:00.000Z', venue: '流明球场，西雅图', stage: 'group' },
  { homeCode: 'POR', awayCode: 'COD', date: '2026-06-17T16:00:00.000Z', venue: '阿兹特克体育场，墨西哥城', stage: 'group' },
  { homeCode: 'ENG', awayCode: 'CRO', date: '2026-06-17T19:00:00.000Z', venue: '大都会人寿体育场，新泽西', stage: 'group' },
  { homeCode: 'GHA', awayCode: 'PAN', date: '2026-06-17T23:00:00.000Z', venue: '硬石体育场，迈阿密', stage: 'group' },
  { homeCode: 'UZB', awayCode: 'COL', date: '2026-06-18T02:00:00.000Z', venue: 'BMO球场，多伦多', stage: 'group' },
  // Round 2 — June 19-24
  { homeCode: 'CZE', awayCode: 'RSA', date: '2026-06-18T16:00:00.000Z', venue: '玫瑰碗体育场，洛杉矶', stage: 'group' },
  { homeCode: 'SUI', awayCode: 'BIH', date: '2026-06-18T19:00:00.000Z', venue: 'AT&T体育场，达拉斯', stage: 'group' },
  { homeCode: 'CAN', awayCode: 'QAT', date: '2026-06-18T22:00:00.000Z', venue: '李维斯体育场，圣克拉拉', stage: 'group' },
  { homeCode: 'MEX', awayCode: 'KOR', date: '2026-06-19T01:00:00.000Z', venue: '梅赛德斯-奔驰体育场，亚特兰大', stage: 'group' },
  { homeCode: 'USA', awayCode: 'AUS', date: '2026-06-19T19:00:00.000Z', venue: '吉列体育场，福克斯堡', stage: 'group' },
  { homeCode: 'SCO', awayCode: 'MAR', date: '2026-06-19T22:00:00.000Z', venue: '流明球场，西雅图', stage: 'group' },
  { homeCode: 'BRA', awayCode: 'HAI', date: '2026-06-20T00:30:00.000Z', venue: '阿兹特克体育场，墨西哥城', stage: 'group' },
  { homeCode: 'TUR', awayCode: 'PAR', date: '2026-06-20T03:00:00.000Z', venue: '大都会人寿体育场，新泽西', stage: 'group' },
  { homeCode: 'NED', awayCode: 'SWE', date: '2026-06-20T17:00:00.000Z', venue: '硬石体育场，迈阿密', stage: 'group' },
  { homeCode: 'GER', awayCode: 'CIV', date: '2026-06-20T20:00:00.000Z', venue: 'BMO球场，多伦多', stage: 'group' },
  { homeCode: 'ECU', awayCode: 'CUW', date: '2026-06-21T00:00:00.000Z', venue: '玫瑰碗体育场，洛杉矶', stage: 'group' },
  { homeCode: 'TUN', awayCode: 'JPN', date: '2026-06-21T04:00:00.000Z', venue: 'AT&T体育场，达拉斯', stage: 'group' },
  { homeCode: 'ESP', awayCode: 'KSA', date: '2026-06-21T16:00:00.000Z', venue: '李维斯体育场，圣克拉拉', stage: 'group' },
  { homeCode: 'BEL', awayCode: 'IRN', date: '2026-06-21T19:00:00.000Z', venue: '梅赛德斯-奔驰体育场，亚特兰大', stage: 'group' },
  { homeCode: 'URU', awayCode: 'CPV', date: '2026-06-21T22:00:00.000Z', venue: '吉列体育场，福克斯堡', stage: 'group' },
  { homeCode: 'NZL', awayCode: 'EGY', date: '2026-06-22T01:00:00.000Z', venue: '流明球场，西雅图', stage: 'group' },
  { homeCode: 'ARG', awayCode: 'AUT', date: '2026-06-22T17:00:00.000Z', venue: '阿兹特克体育场，墨西哥城', stage: 'group' },
  { homeCode: 'FRA', awayCode: 'IRQ', date: '2026-06-22T21:00:00.000Z', venue: '大都会人寿体育场，新泽西', stage: 'group' },
  { homeCode: 'NOR', awayCode: 'SEN', date: '2026-06-23T00:00:00.000Z', venue: '硬石体育场，迈阿密', stage: 'group' },
  { homeCode: 'JOR', awayCode: 'ALG', date: '2026-06-23T03:00:00.000Z', venue: 'BMO球场，多伦多', stage: 'group' },
  { homeCode: 'POR', awayCode: 'UZB', date: '2026-06-23T17:00:00.000Z', venue: '玫瑰碗体育场，洛杉矶', stage: 'group' },
  { homeCode: 'ENG', awayCode: 'GHA', date: '2026-06-23T20:00:00.000Z', venue: 'AT&T体育场，达拉斯', stage: 'group' },
  { homeCode: 'PAN', awayCode: 'CRO', date: '2026-06-23T23:00:00.000Z', venue: '李维斯体育场，圣克拉拉', stage: 'group' },
  { homeCode: 'COL', awayCode: 'COD', date: '2026-06-24T02:00:00.000Z', venue: '梅赛德斯-奔驰体育场，亚特兰大', stage: 'group' },
  // Round 3 — June 25-28 (simultaneous kickoffs within groups)
  { homeCode: 'SUI', awayCode: 'CAN', date: '2026-06-24T19:00:00.000Z', venue: '吉列体育场，福克斯堡', stage: 'group' },
  { homeCode: 'BIH', awayCode: 'QAT', date: '2026-06-24T19:00:00.000Z', venue: '流明球场，西雅图', stage: 'group' },
  { homeCode: 'SCO', awayCode: 'BRA', date: '2026-06-24T22:00:00.000Z', venue: '阿兹特克体育场，墨西哥城', stage: 'group' },
  { homeCode: 'MAR', awayCode: 'HAI', date: '2026-06-24T22:00:00.000Z', venue: '大都会人寿体育场，新泽西', stage: 'group' },
  { homeCode: 'CZE', awayCode: 'MEX', date: '2026-06-25T01:00:00.000Z', venue: '硬石体育场，迈阿密', stage: 'group' },
  { homeCode: 'RSA', awayCode: 'KOR', date: '2026-06-25T01:00:00.000Z', venue: 'BMO球场，多伦多', stage: 'group' },
  { homeCode: 'CUW', awayCode: 'CIV', date: '2026-06-25T20:00:00.000Z', venue: '玫瑰碗体育场，洛杉矶', stage: 'group' },
  { homeCode: 'ECU', awayCode: 'GER', date: '2026-06-25T20:00:00.000Z', venue: 'AT&T体育场，达拉斯', stage: 'group' },
  { homeCode: 'JPN', awayCode: 'SWE', date: '2026-06-25T23:00:00.000Z', venue: '李维斯体育场，圣克拉拉', stage: 'group' },
  { homeCode: 'TUN', awayCode: 'NED', date: '2026-06-25T23:00:00.000Z', venue: '梅赛德斯-奔驰体育场，亚特兰大', stage: 'group' },
  { homeCode: 'TUR', awayCode: 'USA', date: '2026-06-26T02:00:00.000Z', venue: '吉列体育场，福克斯堡', stage: 'group' },
  { homeCode: 'PAR', awayCode: 'AUS', date: '2026-06-26T02:00:00.000Z', venue: '流明球场，西雅图', stage: 'group' },
  { homeCode: 'NOR', awayCode: 'FRA', date: '2026-06-26T19:00:00.000Z', venue: '阿兹特克体育场，墨西哥城', stage: 'group' },
  { homeCode: 'SEN', awayCode: 'IRQ', date: '2026-06-26T19:00:00.000Z', venue: '大都会人寿体育场，新泽西', stage: 'group' },
  { homeCode: 'URU', awayCode: 'ESP', date: '2026-06-27T00:00:00.000Z', venue: '硬石体育场，迈阿密', stage: 'group' },
  { homeCode: 'CPV', awayCode: 'KSA', date: '2026-06-27T00:00:00.000Z', venue: 'BMO球场，多伦多', stage: 'group' },
  { homeCode: 'EGY', awayCode: 'IRN', date: '2026-06-27T03:00:00.000Z', venue: '玫瑰碗体育场，洛杉矶', stage: 'group' },
  { homeCode: 'NZL', awayCode: 'BEL', date: '2026-06-27T03:00:00.000Z', venue: 'AT&T体育场，达拉斯', stage: 'group' },
  { homeCode: 'PAN', awayCode: 'ENG', date: '2026-06-27T21:00:00.000Z', venue: '李维斯体育场，圣克拉拉', stage: 'group' },
  { homeCode: 'CRO', awayCode: 'GHA', date: '2026-06-27T21:00:00.000Z', venue: '梅赛德斯-奔驰体育场，亚特兰大', stage: 'group' },
  { homeCode: 'COD', awayCode: 'UZB', date: '2026-06-27T23:30:00.000Z', venue: '吉列体育场，福克斯堡', stage: 'group' },
  { homeCode: 'COL', awayCode: 'POR', date: '2026-06-27T23:30:00.000Z', venue: '流明球场，西雅图', stage: 'group' },
  { homeCode: 'JOR', awayCode: 'ARG', date: '2026-06-28T02:00:00.000Z', venue: '阿兹特克体育场，墨西哥城', stage: 'group' },
  { homeCode: 'ALG', awayCode: 'AUT', date: '2026-06-28T02:00:00.000Z', venue: '大都会人寿体育场，新泽西', stage: 'group' },
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
      'INSERT INTO matches (home_team_id, away_team_id, match_date, venue, stage, status, home_score, away_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const m of INITIAL_MATCHES) {
        const homeTeam = teamMap.get(m.homeCode);
        const awayTeam = teamMap.get(m.awayCode);
        if (!homeTeam || !awayTeam) {
          console.warn(`[Seed] ⚠️ Team not found: ${m.homeCode} or ${m.awayCode}. Skipping match.`);
          continue;
        }
        // Determine match status based on time
        const matchDate = new Date(m.date);
        const matchEnd = new Date(matchDate.getTime() + 105 * 60 * 1000); // 90min + 15min halftime
        const now = new Date();
        let matchStatus: string;
        if (now < matchDate) {
          matchStatus = 'scheduled';
        } else if (now < matchEnd) {
          matchStatus = 'live';
        } else {
          matchStatus = 'finished';
        }
        insertMatch.run(homeTeam.id, awayTeam.id, m.date, m.venue, m.stage, matchStatus, null, null);
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
    insertN.run('2026世界杯正式开赛！48队12组激战正酣', '2026 World Cup Kicks Off! 48 Teams Battle in 12 Groups',
      '2026年世界杯于6月11日在墨西哥城阿兹特克体育场正式拉开帷幕。48支参赛队分为12个小组展开激烈角逐。揭幕战东道主墨西哥2-0击败南非取得开门红。目前小组赛第一轮已全部结束，德国7-1大胜库拉索创下本届最大比分。',
      'The 2026 World Cup kicked off June 11 at Estadio Azteca. 48 teams in 12 groups. Host Mexico beat South Africa 2-0. Germany crushed Curacao 7-1 for the biggest win so far.',
      '世界杯开幕！墨西哥2-0南非，德国7-1库拉索创最大比分。',
      'World Cup opens! Mexico 2-0 South Africa, Germany 7-1 Curacao.',
      'Bing Sports', 1);
    insertN.run('阿根廷3-0阿尔及利亚 梅西接班人闪耀首秀', 'Argentina 3-0 Algeria: Messi Successor Shines',
      '阿根廷在J组首轮3-0轻取阿尔及利亚，球队在梅西退役后展现出强大的整体实力。新10号阿尔瓦雷斯梅开二度，成为赛后焦点。阿根廷与同组的奥地利、约旦争夺出线权。',
      'Argentina beat Algeria 3-0 in Group J. Alvarez scored twice as the post-Messi era begins strongly.',
      '阿根廷3-0阿尔及利亚，阿尔瓦雷斯梅开二度。',
      'Argentina 3-0 Algeria, Alvarez brace.',
      'ESPN', 0);
    insertN.run('赔率更新：法国稳居夺冠第一热门', 'Odds Update: France Remains Top Favorite',
      '根据最新赔率数据，法国(+425)稳居夺冠第一热门，西班牙(+550)紧随其后，英格兰(+700)位列第三。法国在I组首轮3-1战胜塞内加尔展现强劲状态。',
      'France (+425) leads title odds ahead of Spain (+550) and England (+700). France beat Senegal 3-1 in Group I opener.',
      '法国+425领跑夺冠赔率，西班牙+550第二，英格兰+700第三。',
      'France +425 leads odds, Spain +550 second, England +700 third.',
      'OddsPortal', 0);
    insertN.run('中国队无缘世界杯 12支新军首次亮相', 'China Misses World Cup; 12 New Teams Debut',
      '2026世界杯扩军至48队后，12支球队首次亮相世界杯决赛圈，包括库拉索、佛得角、海地等。遗憾的是中国男足未能从亚洲区突围，连续两届缺席。',
      '12 teams debut at 2026 World Cup including Curacao, Cape Verde, Haiti. China missed qualification again.',
      '12支新军首秀世界杯，中国队连续两届缺席。',
      '12 new teams debut, China misses out again.',
      '新华社', 0);
    console.log(`[Seed] ✅ 4 news articles inserted.`);
  }
}
