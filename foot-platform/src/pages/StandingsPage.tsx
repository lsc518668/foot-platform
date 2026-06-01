import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import client from '../api/client';
import { Team } from '../types';
import FlagImage, { fifaToIso2 } from '../components/common/FlagImage';

interface GroupStanding {
  rank: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface StandingsGroup {
  group: string;
  standings: GroupStanding[];
}

export default function StandingsPage() {
  const { t } = useI18n();
  const [groups, setGroups] = useState<StandingsGroup[]>([]);

  useEffect(() => {
    client.get('/standings').then(res => setGroups(res.data.groups)).catch(console.error);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">📊 小组积分榜</h1>

      {groups.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">📋</p>
          <p>暂无积分数据</p>
          <p className="text-sm mt-2">小组赛结束后将自动计算积分</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <div key={group.group} className="card">
              <h2 className="text-lg font-bold mb-3 text-accent">Group {group.group}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 w-8">#</th>
                      <th className="text-left py-2">球队</th>
                      <th className="text-center py-2 w-8">赛</th>
                      <th className="text-center py-2 w-8">胜</th>
                      <th className="text-center py-2 w-8">平</th>
                      <th className="text-center py-2 w-8">负</th>
                      <th className="text-center py-2 w-8">+/-</th>
                      <th className="text-center py-2 w-10 font-bold text-accent">分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings.map(s => (
                      <tr key={s.team.id} className={`border-b border-gray-700/30 ${s.rank <= 2 ? 'bg-green-500/5' : ''}`}>
                        <td className="py-2 text-gray-500">{s.rank}</td>
                        <td className="py-2">
                          <span className="mr-1"><FlagImage code={fifaToIso2(s.team.short_code)} size={28} /></span>
                          <span className={s.rank <= 2 ? 'font-medium' : ''}>{s.team.name_zh}</span>
                        </td>
                        <td className="text-center py-2 text-gray-400">{s.played}</td>
                        <td className="text-center py-2">{s.won}</td>
                        <td className="text-center py-2">{s.drawn}</td>
                        <td className="text-center py-2">{s.lost}</td>
                        <td className="text-center py-2 text-xs">
                          <span className={s.goalDiff > 0 ? 'text-green-400' : s.goalDiff < 0 ? 'text-red-400' : 'text-gray-400'}>
                            {s.goalDiff > 0 ? '+' : ''}{s.goalDiff}
                          </span>
                        </td>
                        <td className="text-center py-2 font-bold text-accent">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
