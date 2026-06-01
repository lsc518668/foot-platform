import { useEffect, useState } from 'react';
import { Table, Typography, Tag } from 'antd';
import client from '../api/client';

const { Title } = Typography;

const actionColors: Record<string, string> = {
  create: 'green', update: 'blue', delete: 'red',
  settle: 'gold', freeze: 'orange', unfreeze: 'cyan', adjust_balance: 'purple',
  generate: 'magenta',
};
const actionLabels: Record<string, string> = {
  create: '创建', update: '更新', delete: '删除',
  settle: '结算', freeze: '冻结', unfreeze: '解冻', adjust_balance: '调账',
  generate: '批量生成',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    client.get('/admin/audit-logs', { params: { limit: 200 } })
      .then(res => setLogs(res.data.logs || []))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '管理员', dataIndex: 'admin_username', width: 100 },
    {
      title: '操作', dataIndex: 'action', width: 80,
      render: (v: string) => <Tag color={actionColors[v] || 'default'}>{actionLabels[v] || v}</Tag>
    },
    { title: '目标', dataIndex: 'target', width: 80 },
    { title: '目标ID', dataIndex: 'target_id', width: 70 },
    { title: '详情', dataIndex: 'details', ellipsis: true },
    {
      title: '时间', dataIndex: 'created_at', width: 160,
      render: (v: string) => v ? new Date(v).toLocaleDateString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'
    },
  ];

  return (
    <div>
      <Title level={3} style={{ color: '#e2e8f0', marginBottom: 24 }}>📋 操作审计日志</Title>
      <Table columns={columns} dataSource={logs} rowKey="id" loading={loading}
        pagination={{ pageSize: 30 }} scroll={{ x: 800 }} />
    </div>
  );
}
