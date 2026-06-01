import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type Lang = 'zh' | 'en';

const zh: Record<string, string> = {
  // Nav
  'nav.home': '首页', 'nav.dashboard': '赛事中心', 'nav.standings': '积分榜',
  'nav.bracket': '对阵图', 'nav.results': '比赛结果', 'nav.leaderboard': '排行榜',
  'nav.myBets': '我的投注', 'nav.wallet': '钱包', 'nav.profile': '个人中心',
  'nav.login': '登录', 'nav.register': '注册', 'nav.logout': '退出',

  // Home
  'home.hero': '2026世界杯 模拟足彩竞猜',
  'home.subtitle': '48支顶级球队，真实 Elo 实力评级，智能赔率系统',
  'home.cta': '免费注册，开始竞猜',
  'home.schedule': '查看赛程',
  'home.featured': '即将开赛',

  // Dashboard
  'dashboard.title': '赛事中心', 'dashboard.all': '全部',
  'dashboard.upcoming': '未开始', 'dashboard.live': '进行中', 'dashboard.finished': '已结束',
  'dashboard.allStages': '全部阶段',

  // Match
  'match.vs': 'VS', 'match.homeWin': '主胜', 'match.draw': '平局', 'match.awayWin': '客胜',
  'match.odds': '赔率', 'match.betSlip': '投注单', 'match.amount': '投注金额',
  'match.balance': '余额', 'match.potentialReturn': '潜在回报',
  'match.confirmBet': '确认投注', 'match.betSuccess': '投注成功',
  'match.countdown': '距开赛', 'match.noData': '暂无比赛数据',
  'match.market': '盘口', 'match.option': '选项', 'match.cancelled': '已取消',
  'match.loginToBet': '请登录后投注',

  // Bets
  'bet.title': '我的投注', 'bet.all': '全部',
  'bet.pending': '进行中', 'bet.won': '已赢', 'bet.lost': '已输',
  'bet.cancelled': '已取消', 'bet.refunded': '已退款',
  'bet.potentialReturn': '潜在回报',
  'bet.noBets': '暂无投注记录', 'bet.goBet': '去下注',

  // Wallet
  'wallet.title': '我的钱包', 'wallet.balance': '当前余额',
  'wallet.coins': '虚拟币', 'wallet.careerWon': '生涯赢取',
  'wallet.totalBets': '总投注', 'wallet.winRate': '胜率',
  'wallet.transactions': '交易记录', 'wallet.noTx': '暂无交易记录',

  // Leaderboard
  'lb.title': '排行榜', 'lb.subtitle': '最强预言家榜单，实时更新',
  'lb.noData': '暂无排名数据', 'lb.hint': '下注后即可参与排名',

  // Profile
  'profile.title': '个人中心', 'profile.info': '基本信息',
  'profile.username': '用户名', 'profile.email': '邮箱',
  'profile.changePwd': '修改密码', 'profile.oldPwd': '当前密码',
  'profile.newPwd': '新密码', 'profile.confirmPwd': '确认新密码',
  'profile.pwdSuccess': '密码修改成功',

  // Standings
  'standings.title': '小组积分榜', 'standings.noData': '暂无积分数据',
  'standings.hint': '小组赛结束后将自动计算积分',
  'standings.team': '球队',
  'standings.mp': '赛', 'standings.w': '胜', 'standings.d': '平',
  'standings.l': '负', 'standings.pts': '分',

  // Bracket
  'bracket.title': '淘汰赛对阵图',
  'bracket.noData': '暂无淘汰赛数据',
  'bracket.hint': '小组赛结束后管理员可创建淘汰赛对阵',
  'bracket.advances': '晋级',

  // Results
  'results.title': '比赛结果', 'results.noData': '暂无完赛数据',

  // Common
  'common.loading': '加载中...',
  'common.error': '出错了',
  'common.save': '保存', 'common.cancel': '取消', 'common.confirm': '确认',
  'common.search': '搜索', 'common.export': '导出 CSV', 'common.viewAll': '查看全部 →',

  // Notification
  'notif.won': '🎉 投注获胜！', 'notif.lost': '😞 投注失利',
};

const en: Record<string, string> = {
  'nav.home': 'Home', 'nav.dashboard': 'Matches', 'nav.standings': 'Standings',
  'nav.bracket': 'Bracket', 'nav.results': 'Results', 'nav.leaderboard': 'Leaderboard',
  'nav.myBets': 'My Bets', 'nav.wallet': 'Wallet', 'nav.profile': 'Profile',
  'nav.login': 'Login', 'nav.register': 'Register', 'nav.logout': 'Logout',

  'home.hero': '2026 World Cup Betting Simulation',
  'home.subtitle': '48 top teams, real Elo ratings, smart odds system',
  'home.cta': 'Register Free & Start Betting',
  'home.schedule': 'View Schedule',
  'home.featured': 'Upcoming Matches',

  'dashboard.title': 'Match Center', 'dashboard.all': 'All',
  'dashboard.upcoming': 'Upcoming', 'dashboard.live': 'Live', 'dashboard.finished': 'Finished',
  'dashboard.allStages': 'All Stages',

  'match.vs': 'VS', 'match.homeWin': 'Home Win', 'match.draw': 'Draw', 'match.awayWin': 'Away Win',
  'match.odds': 'Odds', 'match.betSlip': 'Bet Slip', 'match.amount': 'Amount',
  'match.balance': 'Balance', 'match.potentialReturn': 'Potential Return',
  'match.confirmBet': 'Place Bet', 'match.betSuccess': 'Bet Placed!',
  'match.countdown': 'Starts in', 'match.noData': 'No matches',
  'match.market': 'Market', 'match.option': 'Option', 'match.cancelled': 'Cancelled',
  'match.loginToBet': 'Login to place bets',

  'bet.title': 'My Bets', 'bet.all': 'All',
  'bet.pending': 'Pending', 'bet.won': 'Won', 'bet.lost': 'Lost',
  'bet.cancelled': 'Cancelled', 'bet.refunded': 'Refunded',
  'bet.potentialReturn': 'Potential Return',
  'bet.noBets': 'No bets yet', 'bet.goBet': 'Go Bet',

  'wallet.title': 'My Wallet', 'wallet.balance': 'Balance',
  'wallet.coins': 'coins', 'wallet.careerWon': 'Career Won',
  'wallet.totalBets': 'Total Bets', 'wallet.winRate': 'Win Rate',
  'wallet.transactions': 'Transactions', 'wallet.noTx': 'No transactions',

  'lb.title': 'Leaderboard', 'lb.subtitle': 'Top predictors, real-time ranking',
  'lb.noData': 'No ranking data', 'lb.hint': 'Start betting to join',

  'profile.title': 'Profile', 'profile.info': 'Info',
  'profile.username': 'Username', 'profile.email': 'Email',
  'profile.changePwd': 'Change Password', 'profile.oldPwd': 'Current Password',
  'profile.newPwd': 'New Password', 'profile.confirmPwd': 'Confirm Password',
  'profile.pwdSuccess': 'Password changed',

  'standings.title': 'Group Standings', 'standings.noData': 'No data',
  'standings.hint': 'Standings auto-calculate after group stage',
  'standings.team': 'Team',
  'standings.mp': 'MP', 'standings.w': 'W', 'standings.d': 'D',
  'standings.l': 'L', 'standings.pts': 'Pts',

  'bracket.title': 'Knockout Bracket',
  'bracket.noData': 'No knockout data',
  'bracket.hint': 'Admin creates knockout matches after group stage',
  'bracket.advances': 'Advances',

  'results.title': 'Match Results', 'results.noData': 'No finished matches',

  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.confirm': 'Confirm',
  'common.search': 'Search', 'common.export': 'Export CSV', 'common.viewAll': 'View All →',

  'notif.won': '🎉 Bet Won!', 'notif.lost': '😞 Bet Lost',
};

const messages: Record<Lang, Record<string, string>> = { zh, en };

interface I18nContext {
  lang: Lang;
  t: (key: string) => string;
  setLang: (l: Lang) => void;
}

const I18nCtx = createContext<I18nContext>({ lang: 'zh', t: (k) => k, setLang: () => {} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'zh');

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  }, []);

  const t = useCallback((key: string) => {
    return messages[lang][key] || key;
  }, [lang]);

  return React.createElement(I18nCtx.Provider, { value: { lang, t, setLang } }, children);
}

export function useI18n() {
  return useContext(I18nCtx);
}
