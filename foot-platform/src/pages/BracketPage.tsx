import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import client from '../api/client';
import { Match } from '../types';
import FlagImage, { fifaToIso2 } from '../components/common/FlagImage';

interface StageData {
  label: string;
  matches: Match[];
}

const STAGE_ORDER = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];
const STAGE_LABELS: Record<string, string> = {
  round_of_32: '32强', round_of_16: '16强', quarter_final: '1/4决赛',
  semi_final: '半决赛', third_place: '三四名', final: '决赛',
};

export default function BracketPage() {
  const { t } = useI18n();
  const [stages, setStages] = useState<StageData[]>([]);

  useEffect(() => {
    client.get('/matches', { params: { limit: 200 } })
      .then(res => {
        const matches: Match[] = res.data.matches || [];
        const knockoutMatches = matches.filter(m => m.stage !== 'group');
        const stageMap = new Map<string, Match[]>();

        for (const m of knockoutMatches) {
          const stage = m.stage;
          if (!stageMap.has(stage)) stageMap.set(stage, []);
          stageMap.get(stage)!.push(m);
        }

        setStages(
          STAGE_ORDER
            .filter(s => stageMap.has(s))
            .map(s => ({ label: STAGE_LABELS[s] || s, matches: stageMap.get(s)! }))
        );
      })
      .catch(console.error);
  }, []);

  if (stages.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">🏆 淘汰赛对阵</h1>
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">🏟️</p>
          <p>暂无淘汰赛数据</p>
          <p className="text-sm mt-2">小组赛结束后管理员可创建淘汰赛对阵</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">🏆 淘汰赛对阵图</h1>

      <div className="space-y-8">
        {stages.map(stage => (
          <div key={stage.label}>
            <h2 className="text-xl font-bold text-accent mb-4 text-center border-b border-gray-700 pb-2">
              {stage.label}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 justify-center">
              {stage.matches.map(match => (
                <div key={match.id} className="card text-center">
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(match.match_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="text-center">
                      <span className="text-2xl block"><FlagImage code={fifaToIso2(match.homeTeam.short_code)} size={28} /></span>
                      <p className="text-sm font-medium">{match.homeTeam.name_zh}</p>
                    </div>
                    <div className="text-center min-w-[50px]">
                      {match.status === 'finished' ? (
                        <span className="text-xl font-bold text-accent">{match.home_score} - {match.away_score}</span>
                      ) : (
                        <span className="text-sm text-gray-500">VS</span>
                      )}
                      <p className="text-[10px]">
                        <span className={`${
                          match.status === 'live' ? 'text-red-400 animate-pulse' :
                          match.status === 'finished' ? 'text-gray-500' : 'text-green-400'
                        }`}>
                          {{ scheduled: '未开始', live: '⚡进行中', finished: '已结束' }[match.status as keyof typeof import('../types')['MATCH_STATUS_LABELS']] || match.status}
                        </span>
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="text-2xl block"><FlagImage code={fifaToIso2(match.awayTeam.short_code)} size={28} /></span>
                      <p className="text-sm font-medium">{match.awayTeam.name_zh}</p>
                    </div>
                  </div>
                  {match.status === 'finished' && match.home_score != null && match.away_score != null && (
                    <div className="text-xs text-gray-400 mt-1">
                      {match.home_score > match.away_score
                        ? `${match.homeTeam.name_zh} 晋级`
                        : match.home_score < match.away_score
                          ? `${match.awayTeam.name_zh} 晋级`
                          : '平局'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
