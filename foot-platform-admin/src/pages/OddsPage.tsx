import { useEffect, useState } from 'react';
import { Table, Select, InputNumber, Button, Space, message, Typography, Tag } from 'antd';
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title } = Typography;

export default function OddsPage() {
  const [oddsList, setOddsList] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [homeOdds, setHomeOdds] = useState(0);
  const [drawOdds, setDrawOdds] = useState(0);
  const [awayOdds, setAwayOdds] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.get('/admin/odds').then(res => setOddsList(res.data.odds || [])).catch(console.error);
  }, []);

  const selected = oddsList.find(o => o.match_id === selectedMatch);

  useEffect(() => {
    if (selected) {
      setHomeOdds(selected.home_win_odds);
      setDrawOdds(selected.draw_odds);
      setAwayOdds(selected.away_win_odds);
    }
  }, [selected]);

  const handleSaveOverride = async () => {
    if (!selectedMatch) return;
    try {
      await client.put(`/admin/odds/${selectedMatch}`, {
        homeWinOdds: homeOdds, drawOdds: drawOdds, awayWinOdds: awayOdds,
      });
      message.success('赔率已手动调整');
      const res = await client.get('/admin/odds');
      setOddsList(res.data.odds);
    } catch (err: any) { message.error(err.response?.data?.error || '调整失败'); }
  };

  const handleRemoveOverride = async () => {
    if (!selectedMatch) return;
    try {
      await client.delete(`/admin/odds/${selectedMatch}/override`);
      message.success('已恢复自动计算');
      const res = await client.get('/admin/odds');
      setOddsList(res.data.odds);
    } catch (err: any) { message.error(err.response?.data?.error || '重置失败'); }
  };

  const columns = [
    { title: '比赛', render: (_: any, r: any) => `${r.home_name || '?'} vs ${r.away_name || '?'}` },
    { title: '日期', dataIndex: 'match_date', render: (v: string) => v ? new Date(v).toLocaleDateString('zh-CN') : '-' },
    { title: '主胜', dataIndex: 'home_win_odds', render: (v: number) => <span style={{ fontWeight: 700 }}>{v}</span> },
    { title: '平局', dataIndex: 'draw_odds', render: (v: number) => <span style={{ fontWeight: 700 }}>{v}</span> },
    { title: '客胜', dataIndex: 'away_win_odds', render: (v: number) => <span style={{ fontWeight: 700 }}>{v}</span> },
    {
      title: '来源', dataIndex: 'is_manual_override',
      render: (v: number) => v === 1 ? <Tag color="orange">手动设置</Tag> : <Tag color="green">自动计算</Tag>
    },
  ];

  return (
    <div>
      <Title level={3} style={{ color: '#e2e8f0', marginBottom: 24 }}>📊 赔率管理</Title>

      <div style={{ background: '#0f172a', padding: 24, borderRadius: 12, marginBottom: 24 }}>
        <Title level={5} style={{ color: '#94a3b8', marginBottom: 16 }}>手动调整赔率</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            showSearch
            placeholder="选择比赛"
            style={{ width: '100%' }}
            value={selectedMatch}
            onChange={(v) => setSelectedMatch(v)}
            filterOption={(input, option) => (option?.label as string)?.includes(input)}
            options={oddsList
              .filter(o => o.status === 'scheduled')
              .map(o => ({ label: `${o.home_name} vs ${o.away_name} (${new Date(o.match_date).toLocaleDateString('zh-CN')})`, value: o.match_id }))
            }
          />
          {selected && (
            <Space>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12 }}>主胜</label>
                <InputNumber value={homeOdds} onChange={v => setHomeOdds(v || 0)} min={1.05} step={0.01} style={{ width: 100 }} />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12 }}>平局</label>
                <InputNumber value={drawOdds} onChange={v => setDrawOdds(v || 0)} min={1.05} step={0.01} style={{ width: 100 }} />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12 }}>客胜</label>
                <InputNumber value={awayOdds} onChange={v => setAwayOdds(v || 0)} min={1.05} step={0.01} style={{ width: 100 }} />
              </div>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveOverride}>保存手动赔率</Button>
              <Button icon={<UndoOutlined />} onClick={handleRemoveOverride}>重置自动计算</Button>
            </Space>
          )}
        </Space>
      </div>

      <Table columns={columns} dataSource={oddsList} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
    </div>
  );
}
