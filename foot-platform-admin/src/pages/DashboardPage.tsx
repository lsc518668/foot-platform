import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography } from 'antd';
import { TeamOutlined, DollarOutlined, TrophyOutlined, CheckCircleOutlined, RiseOutlined, UserSwitchOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title } = Typography;

const stageLabels: Record<string, string> = {
  group: '小组赛', round_of_32: '32强', round_of_16: '16强',
  quarter_final: '1/4决赛', semi_final: '半决赛', third_place: '三四名', final: '决赛',
};

function SimpleBar({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, paddingTop: 20 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#ffd700', marginBottom: 2 }}>
            {d.value > 0 ? d.value : ''}
          </span>
          <div style={{
            width: '100%', maxWidth: 40,
            height: maxVal > 0 ? `${Math.max(4, (d.value / maxVal) * 100)}%` : '0%',
            background: 'linear-gradient(180deg, #ffd700, #1a5632)',
            borderRadius: '4px 4px 0 0', minHeight: d.value > 0 ? 2 : 0,
          }} />
          <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>
            {d.label.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    client.get('/admin/dashboard').then(res => setData(res.data)).catch(console.error);
  }, []);

  if (!data) return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>加载中...</div>;

  const { stats, charts } = data;

  const cards = [
    { title: '总用户数', value: stats.totalUsers, icon: <TeamOutlined />, color: '#3b82f6' },
    { title: '活跃用户', value: stats.activeUsers, icon: <UserSwitchOutlined />, color: '#22c55e' },
    { title: '总投注数', value: stats.totalBets, icon: <TrophyOutlined />, color: '#f59e0b' },
    { title: '今日投注', value: stats.totalBetsToday, icon: <RiseOutlined />, color: '#8b5cf6' },
    { title: '总营收', value: `${(stats.totalRevenue - stats.totalPaidOut).toFixed(0)} 币`, icon: <DollarOutlined />, color: '#ef4444' },
    { title: '待结算', value: stats.pendingSettlements, icon: <CheckCircleOutlined />, color: '#ec4899' },
  ];

  const dailyBetData = (charts?.dailyBets || []).map((d: any) => ({ label: d.day, value: d.count }));
  const maxDaily = Math.max(1, ...dailyBetData.map((d: any) => d.value));

  return (
    <div>
      <Title level={3} style={{ color: '#e2e8f0', marginBottom: 24 }}>📊 仪表盘</Title>

      <Row gutter={[16, 16]}>
        {cards.map((card, i) => (
          <Col xs={24} sm={12} lg={8} key={i}>
            <Card>
              <Statistic
                title={<span style={{ color: '#94a3b8' }}>{card.title}</span>}
                value={card.value}
                prefix={<span style={{ color: card.color }}>{card.icon}</span>}
                valueStyle={{ color: '#ffd700', fontWeight: 700 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: '#94a3b8', fontSize: 14 }}>📈 近7天投注量</span>}>
            <SimpleBar data={dailyBetData} maxVal={maxDaily} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: '#94a3b8', fontSize: 14 }}>🏟️ 赛事阶段分布</span>}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(charts?.stageDist || []).map((d: any) => (
                <div key={d.stage} style={{
                  background: '#1a5632', borderRadius: 8, padding: '8px 16px',
                  textAlign: 'center', minWidth: 80,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#ffd700' }}>{d.count}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{stageLabels[d.stage] || d.stage}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
