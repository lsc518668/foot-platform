import { useEffect, useState } from 'react';
import { Table, Select, Tag, Typography, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title } = Typography;

export default function BetsPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchBets = async () => {
    setLoading(true);
    try {
      const res = await client.get('/admin/bets', { params: { status: status || undefined, page, limit: 50 } });
      setBets(res.data.bets || []);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchBets(); }, [page, status]);

  const statusColors: Record<string, string> = {
    pending: 'gold', won: 'green', lost: 'red', cancelled: 'default', refunded: 'blue',
  };
  const statusLabels: Record<string, string> = {
    pending: '进行中', won: '已赢', lost: '已输', cancelled: '已取消', refunded: '已退款',
  };
  const betLabels: Record<string, string> = { home_win: '主胜', draw: '平局', away_win: '客胜' };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户', dataIndex: ['match', 'homeTeam', 'name_zh'], render: (_: any, r: any) => <span style={{ color: '#94a3b8' }}>{r.user_username || r.user_id}</span> },
    {
      title: '比赛', render: (_: any, r: any) =>
        <>{r.match?.homeTeam?.flag_emoji} {r.match?.homeTeam?.name_zh} vs {r.match?.awayTeam?.name_zh} {r.match?.awayTeam?.flag_emoji}</>
    },
    { title: '投注类型', dataIndex: 'bet_type', render: (v: string) => <Tag>{betLabels[v] || v}</Tag> },
    { title: '金额', dataIndex: 'amount', render: (v: number) => v?.toFixed(2) },
    { title: '赔率', dataIndex: 'odds_at_bet' },
    { title: '潜在回报', dataIndex: 'potential_payout', render: (v: number) => v?.toFixed(2) },
    {
      title: '状态', dataIndex: 'status',
      render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v]}</Tag>
    },
    { title: '时间', dataIndex: 'created_at', render: (v: string) => v ? new Date(v).toLocaleDateString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ color: '#e2e8f0', margin: 0 }}>📝 投注记录</Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<DownloadOutlined />} onClick={() => window.open('/api/admin/export/bets', '_blank')}>
            导出 CSV
          </Button>
          <Select value={status} onChange={v => { setStatus(v); setPage(1); }}
            style={{ width: 150 }} placeholder="筛选状态" allowClear
          options={[
            { label: '全部', value: '' },
            { label: '进行中', value: 'pending' },
            { label: '已赢', value: 'won' },
            { label: '已输', value: 'lost' },
          ]}
          />
        </div>
      </div>

      <Table columns={columns} dataSource={bets} rowKey="id" loading={loading}
        pagination={{ total, current: page, onChange: setPage, pageSize: 50 }} scroll={{ x: 1200 }} />
    </div>
  );
}
