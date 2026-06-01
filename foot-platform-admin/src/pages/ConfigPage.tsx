import { useEffect, useState } from 'react';
import { Card, Form, InputNumber, Button, message, Typography, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title } = Typography;

const configLabels: Record<string, string> = {
  initial_balance: '新用户初始余额',
  min_bet_amount: '最小投注额',
  max_bet_amount: '最大投注额',
  odds_margin: '赔率利润率（庄家抽水）',
  elo_k_factor: 'Elo K因子',
  elo_home_advantage: '主场优势 Elo 分',
};

export default function ConfigPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({});

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await client.get('/admin/config');
      const map: Record<string, string> = {};
      (res.data.configs || []).forEach((c: any) => { map[c.key] = c.value; });
      setConfigs(map);
      const vMap: Record<string, number> = {};
      Object.entries(map).forEach(([k, v]) => { vMap[k] = parseFloat(v); });
      setValues(vMap);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = {};
      Object.entries(values).forEach(([k, v]) => { data[k] = String(v); });
      await client.put('/admin/config', data);
      message.success('系统配置已保存');
    } catch (err: any) {
      message.error(err.response?.data?.error || '保存失败');
    } finally { setSaving(false); }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: 60 }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ color: '#e2e8f0', margin: 0 }}>⚙️ 系统设置</Title>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存配置</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {Object.entries(configs).map(([key, value]) => (
          <Card key={key} title={<span style={{ color: '#94a3b8', fontSize: 14 }}>{configLabels[key] || key}</span>}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>当前:</span>
              <InputNumber
                value={values[key]}
                onChange={v => setValues(prev => ({ ...prev, [key]: v || 0 }))}
                step={key === 'odds_margin' ? 0.01 : 1}
                min={key === 'odds_margin' ? 0 : 0}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 11 }}>
              上次值: {value}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
