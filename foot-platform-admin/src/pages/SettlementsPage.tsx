import { useEffect, useState } from 'react';
import { Table, Button, Modal, InputNumber, Space, message, Tag, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title, Text } = Typography;

export default function SettlementsPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [settleModal, setSettleModal] = useState<any>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await client.get('/admin/matches', { params: { status: 'finished', limit: 50 } });
      setMatches(res.data.matches || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchMatches(); }, []);

  const handleSettle = async () => {
    if (!settleModal) return;
    try {
      const res = await client.post(`/admin/settle/${settleModal.id}`, { homeScore, awayScore });
      message.success(res.data.message);
      setSettleModal(null);
      fetchMatches();
    } catch (err: any) { message.error(err.response?.data?.error || '结算失败'); }
  };

  const handleQuickFinishAndSettle = async (match: any, h: number, a: number) => {
    try {
      await client.put(`/admin/matches/${match.id}/status`, { status: 'finished', homeScore: h, awayScore: a });
      const res = await client.post(`/admin/settle/${match.id}`, { homeScore: h, awayScore: a });
      message.success(res.data.message);
      fetchMatches();
    } catch (err: any) { message.error(err.response?.data?.error || '操作失败'); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '比赛', render: (_: any, r: any) =>
        <>{r.homeTeam?.flag_emoji} {r.homeTeam?.name_zh} vs {r.awayTeam?.name_zh} {r.awayTeam?.flag_emoji}</>
    },
    { title: '日期', dataIndex: 'match_date', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
    {
      title: '比分', render: (_: any, r: any) =>
        r.home_score !== null ? <Tag color="blue">{r.home_score} - {r.away_score}</Tag> : <Tag>未设置</Tag>
    },
    {
      title: '操作', render: (_: any, r: any) => (
        <Space>
          <Button icon={<CheckCircleOutlined />} type="primary" size="small"
            onClick={() => { setSettleModal(r); setHomeScore(r.home_score || 0); setAwayScore(r.away_score || 0); }}>
            手动结算
          </Button>
        </Space>
      )
    },
  ];

  return (
    <div>
      <Title level={3} style={{ color: '#e2e8f0', marginBottom: 24 }}>✅ 结算管理</Title>

      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        以下为已结束但尚未结算的比赛。设置比分后点击"结算"即可自动处理投注、更新余额和Elo评分。
      </Text>

      <Table columns={columns} dataSource={matches} rowKey="id" loading={loading} pagination={false} />

      <Modal title="结算比赛" open={!!settleModal} onCancel={() => setSettleModal(null)}
        onOk={handleSettle} destroyOnClose>
        {settleModal && (
          <div>
            <p style={{ marginBottom: 16, color: '#94a3b8' }}>
              {settleModal.homeTeam?.flag_emoji} {settleModal.homeTeam?.name_zh} vs {settleModal.awayTeam?.name_zh} {settleModal.awayTeam?.flag_emoji}
            </p>
            <Space>
              <div>
                <label style={{ color: '#94a3b8', display: 'block', marginBottom: 4 }}>主队进球</label>
                <InputNumber value={homeScore} onChange={v => setHomeScore(v || 0)} min={0} style={{ width: 100 }} />
              </div>
              <div>
                <label style={{ color: '#94a3b8', display: 'block', marginBottom: 4 }}>客队进球</label>
                <InputNumber value={awayScore} onChange={v => setAwayScore(v || 0)} min={0} style={{ width: 100 }} />
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}
