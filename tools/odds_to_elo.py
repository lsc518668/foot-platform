"""
Convert real World Cup 2026 winner odds (American format) to Elo ratings.
Data source: OddsPortal.com (scraped 2026-06-18)

American odds to probability:
  Positive odds (+N): prob = 100 / (N + 100)
The sum of raw probabilities > 100% due to bookmaker overround.
We normalize and then map to Elo using a reference anchor.
"""

import math
import json

# Real odds data from OddsPortal.com for World Cup 2026 Winner
ODDS_DATA = [
    # Format: (team_en, team_zh, flag_emoji, american_odds)
    ("France", "法国", "🇫🇷", 425),
    ("Spain", "西班牙", "🇪🇸", 550),
    ("England", "英格兰", "🏴", 700),
    ("Argentina", "阿根廷", "🇦🇷", 900),
    ("Portugal", "葡萄牙", "🇵🇹", 900),
    ("Brazil", "巴西", "🇧🇷", 1100),
    ("Germany", "德国", "🇩🇪", 1400),
    ("Netherlands", "荷兰", "🇳🇱", 2000),
    ("Norway", "挪威", "🇳🇴", 3300),
    ("Belgium", "比利时", "🇧🇪", 4000),
    ("USA", "美国", "🇺🇸", 4000),
    ("Morocco", "摩洛哥", "🇲🇦", 4000),
    ("Colombia", "哥伦比亚", "🇨🇴", 4500),
    ("Japan", "日本", "🇯🇵", 5000),
    ("Mexico", "墨西哥", "🇲🇽", 5500),
    ("Uruguay", "乌拉圭", "🇺🇾", 7500),
    ("Croatia", "克罗地亚", "🇭🇷", 8000),
    ("Switzerland", "瑞士", "🇨🇭", 8000),
    ("Austria", "奥地利", "🇦🇹", 12500),
    ("Senegal", "塞内加尔", "🇸🇳", 13000),
    ("Ecuador", "厄瓜多尔", "🇪🇨", 15000),
    ("Canada", "加拿大", "🇨🇦", 17500),
    ("Sweden", "瑞典", "🇸🇪", 19000),
    ("Ivory Coast", "科特迪瓦", "🇨🇮", 25000),
    ("Egypt", "埃及", "🇪🇬", 40000),
    ("South Korea", "韩国", "🇰🇷", 40000),
    ("Australia", "澳大利亚", "🇦🇺", 40000),
    ("Algeria", "阿尔及利亚", "🇩🇿", 50000),
    ("Paraguay", "巴拉圭", "🇵🇾", 50000),
    ("Ghana", "加纳", "🇬🇭", 70000),
    ("Tunisia", "突尼斯", "🇹🇳", 250000),
    ("Iran", "伊朗", "🇮🇷", 250000),
    ("Panama", "巴拿马", "🇵🇦", 250000),
    ("Saudi Arabia", "沙特阿拉伯", "🇸🇦", 250000),
    ("Qatar", "卡塔尔", "🇶🇦", 250000),
    ("New Zealand", "新西兰", "🇳🇿", 250000),
]

def american_to_decimal(am_odds):
    """Convert American odds to decimal."""
    if am_odds > 0:
        return 1 + am_odds / 100
    else:
        return 1 + 100 / abs(am_odds)

def american_to_prob(am_odds):
    """Convert American odds to raw implied probability."""
    if am_odds > 0:
        return 100 / (am_odds + 100)
    else:
        return abs(am_odds) / (abs(am_odds) + 100)

# Step 1: Calculate raw probabilities and overround
raw_probs = []
for i, (name_en, name_zh, flag, odds) in enumerate(ODDS_DATA):
    prob = american_to_prob(odds)
    decimal = american_to_decimal(odds)
    raw_probs.append((name_en, name_zh, flag, odds, decimal, prob))

# Sum of raw probabilities (overround)
overround = sum(p[5] for p in raw_probs)
print(f"Overround (sum of raw probs): {overround:.4f} ({overround*100:.1f}%)")

# Step 2: Normalize probabilities
norm_probs = [(name_en, name_zh, flag, odds, dec, prob / overround) for name_en, name_zh, flag, odds, dec, prob in raw_probs]

# Sort by probability descending (favorites first)
norm_probs.sort(key=lambda x: x[5], reverse=True)

print("\n=== Normalized Probabilities & Elo Ratings ===")
print(f"{'Rank':<5} {'Team':<16} {'Am Odds':<10} {'Decimal':<8} {'P(raw)':<8} {'P(norm)':<8} {'Elo':<6}")
print("-" * 75)

# Step 3: Map to Elo
# Set France (top favorite) as base Elo = 2000
# For each team, its Elo depends on how much less likely it is to win
# Using the Elo formula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
# In a "tournament winner" context, we can think of it as:
#   P(team wins) ∝ 1 / (1 + 10^((R_top - R_team) / 400))
#   → R_team = R_top + 400 * log10(P_team / P_top)

base_elo = 2000
top_prob = norm_probs[0][5]  # France's normalized probability

teams_with_elo = []
for name_en, name_zh, flag, odds, dec, prob in norm_probs:
    if prob > 0 and top_prob > 0:
        # Ratio of probabilities translated to Elo difference
        ratio = prob / top_prob
        if ratio < 1:
            elo_diff = 400 * math.log10(ratio / (1 - ratio))
            elo_diff = max(elo_diff, -800)  # Cap at -800 max difference
        else:
            elo_diff = 0
        elo = round(base_elo + elo_diff)
        elo = max(elo, 1200)  # Floor at 1200
    else:
        elo = 1200

    teams_with_elo.append((name_en, name_zh, flag, elo, prob))

    print(f"{len(teams_with_elo):<5} {name_zh:<8} {name_en:<12} +{odds:<8} {dec:<8.2f} {american_to_prob(odds):.4f}   {prob:.4f}   {elo:<6}")

# Step 4: Add missing teams that are in our original 48 but not in odds data
MISSING_TEAMS = {
    "Italy": ("意大利", "🇮🇹"),
    "Denmark": ("丹麦", "🇩🇰"),
    "Serbia": ("塞尔维亚", "🇷🇸"),
    "Ukraine": ("乌克兰", "🇺🇦"),
    "Peru": ("秘鲁", "🇵🇪"),
    "Chile": ("智利", "🇨🇱"),
    "Nigeria": ("尼日利亚", "🇳🇬"),
    "Cameroon": ("喀麦隆", "🇨🇲"),
    "Costa Rica": ("哥斯达黎加", "🇨🇷"),
    "Jamaica": ("牙买加", "🇯🇲"),
    "UAE": ("阿联酋", "🇦🇪"),
    "China": ("中国", "🇨🇳"),
}

existing = {t[0] for t in teams_with_elo}
for en_name, (zh_name, flag) in MISSING_TEAMS.items():
    if en_name not in existing:
        # Assign low Elo for unlisted teams
        teams_with_elo.append((en_name, zh_name, flag, 1300, 0.001))

# Sort final list by Elo descending
teams_with_elo.sort(key=lambda x: x[3], reverse=True)

print(f"\n=== Final {len(teams_with_elo)} Teams (sorted by Elo) ===")
print(f"{'Rank':<5} {'Chinese':<10} {'English':<16} {'Flag':<4} {'Elo':<6}")
print("-" * 55)

# Output as seed Typescript
print("\n\n// === Copy this to seed.ts ===\n")
print("const TEAMS = [")
group_names = ['A','B','C','D','E','F','G','H']
group_idx = 0
items_per_group = len(teams_with_elo) // 8 + 1

for i, (name_en, name_zh, flag, elo, prob) in enumerate(teams_with_elo):
    group = group_names[min(group_idx, 7)]
    if (i + 1) % items_per_group == 0:
        group_idx += 1

    short_code = name_en[:3].upper()
    if short_code == "UNI":  # USA
        short_code = "USA"
    elif short_code == "SOU":  # South Korea
        short_code = "KOR"
    elif short_code == "SAU":  # Saudi Arabia
        short_code = "KSA"
    elif short_code == "NEW":  # New Zealand
        short_code = "NZL"
    elif short_code == "IVA":  # Ivory Coast
        short_code = "CIV"
    elif short_code == "ALG":  # Algeria
        short_code = "ALG"
    elif short_code == "PAR":  # Paraguay
        short_code = "PAR"
    elif short_code == "PAN":  # Panama
        short_code = "PAN"
    elif short_code == "COS":  # Costa Rica
        short_code = "CRC"
    elif short_code == "JAM":  # Jamaica
        short_code = "JAM"
    elif short_code == "CAM":  # Cameroon
        short_code = "CMR"

    print(f"  {{ nameZh: '{name_zh}', nameEn: '{name_en}', shortCode: '{short_code}', flagEmoji: '{flag}', eloRating: {elo}, groupName: '{group}' }},")

print("];")

# Also output the match seeding data
print("\n\n// === Initial matches (12 matches for opening round) ===")
# Pick top teams for marquee matchups
top_teams = teams_with_elo[:24]
pairs = []
for i in range(0, min(12, len(top_teams) - 1), 2):
    if i + 1 < len(top_teams):
        pairs.append((top_teams[i], top_teams[i+1]))

for i, ((h_en, h_zh, h_flag, h_elo, _), (a_en, a_zh, a_flag, a_elo, _)) in enumerate(pairs[:10]):
    day = 11 + i
    hour = 17 if i % 2 == 0 else 20
    venues = [
        "阿兹特克体育场，墨西哥城",
        "大都会人寿体育场，新泽西",
        "硬石体育场，迈阿密",
        "BMO球场，多伦多",
        "玫瑰碗体育场，洛杉矶",
        "AT&T体育场，达拉斯",
        "李维斯体育场，圣克拉拉",
        "梅赛德斯-奔驰体育场，亚特兰大",
        "吉列体育场，福克斯堡",
        "流明球场，西雅图",
    ]
    venue = venues[i % len(venues)]
    print(f"  {{ homeCode: '{h_en[:3].upper()}', awayCode: '{a_en[:3].upper()}', date: '2026-06-{day:02d}T{hour}:00:00.000Z', venue: '{venue}', stage: 'group' }},")
