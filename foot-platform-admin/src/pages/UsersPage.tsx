import { useEffect, useState } from 'react';
import { Table, Input, Button, Modal, InputNumber, Space, Tag, message, Typography } from 'antd';
import { SearchOutlined, LockOutlined, DollarOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title } = Typography;

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await client.get('/admin/users', { params: { search, page, limit: 20 } });
      setUsers(res.data.users || []);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, search]);

  const handleToggleFreeze = async (user: any) => {
    try {
      const res = await client.put(`/admin/users/${user.id}/freeze`);
      message.success(res.data.message);
      fetchUsers();
    } catch (err: any) { message.error(err.response?.data?.error || '操作失败'); }
  };

  const handleAdjustBalance = async () => {
    if (!adjustModal) return;
    try {
      const res = await client.put(`/admin/users/${adjustModal.id}/balance`, {
        amount: adjustAmount,
        description: adjustReason,
      });
      message.success(res.data.message);
      setAdjustModal(null);
      fetchUsers();
    } catch (err: any) { message.error(err.response?.data?.error || '调整失败'); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username' },
    { title: '邮箱', dataIndex: 'email' },
    { title: '余额', dataIndex: 'balance', render: (v: number) => <span style={{ color: '#ffd700', fontWeight: 700 }}>{v?.toFixed(2)}</span> },
    {
      title: '状态', dataIndex: 'is_frozen',
      render: (v: number) => v ? <Tag color="red">已冻结</Tag> : <Tag color="green">正常</Tag>
    },
    { title: '赢取', dataIndex: 'total_won', render: (v: number) => v?.toFixed(0) },
    {
      title: '胜率', render: (_: any, r: any) =>
        r.total_bet_count > 0 ? `${((r.won_bet_count / r.total_bet_count) * 100).toFixed(1)}%` : '-'
    },
    {
      title: '操作', render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<LockOutlined />}
            danger={!r.is_frozen} onClick={() => handleToggleFreeze(r)}>
            {r.is_frozen ? '解冻' : '冻结'}
          </Button>
          <Button size="small" icon={<DollarOutlined />} onClick={() => {
            setAdjustModal(r); setAdjustAmount(0); setAdjustReason('');
          }}>调账</Button>
        </Space>
      )
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ color: '#e2e8f0', margin: 0 }}>👤 用户管理</Title>
        <Input
          prefix={<SearchOutlined />} placeholder="搜索用户..."
          style={{ width: 300 }} value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Table columns={columns} dataSource={users} rowKey="id" loading={loading}
        pagination={{ total, current: page, onChange: setPage, pageSize: 20 }} />

      <Modal title="调整余额" open={!!adjustModal} onCancel={() => setAdjustModal(null)}
        onOk={handleAdjustBalance} destroyOnClose>
        {adjustModal && (
          <div>
            <p style={{ color: '#94a3b8', marginBottom: 16 }}>
              用户：{adjustModal.username} | 当前余额：{adjustModal.balance?.toFixed(2)}
            </p>
            <label style={{ color: '#94a3b8', display: 'block', marginBottom: 8 }}>调整金额（正数=增加，负数=减少）</label>
            <InputNumber value={adjustAmount} onChange={v => setAdjustAmount(v || 0)}
              style={{ width: '100%', marginBottom: 16 }} />
            <label style={{ color: '#94a3b8', display: 'block', marginBottom: 8 }}>调整原因</label>
            <Input.TextArea value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
              placeholder="调整原因" rows={3} />
          </div>
        )}
      </Modal>
    </div>
  );
}
