import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, Space, Popconfirm, message, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import client from '../api/client';
import dayjs from 'dayjs';

const { Title } = Typography;

const stageOptions = [
  { label: '小组赛', value: 'group' }, { label: '32强赛', value: 'round_of_32' },
  { label: '16强赛', value: 'round_of_16' }, { label: '1/4决赛', value: 'quarter_final' },
  { label: '半决赛', value: 'semi_final' }, { label: '三四名决赛', value: 'third_place' },
  { label: '决赛', value: 'final' },
];

const statusOptions = [
  { label: '未开始', value: 'scheduled' }, { label: '进行中', value: 'live' },
  { label: '已结束', value: 'finished' }, { label: '已取消', value: 'cancelled' },
];

export default function MatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await client.get('/admin/matches', { params: { limit: 100 } });
      setMatches(res.data.matches || []);
    } finally { setLoading(false); }
  };

  const fetchTeams = async () => {
    const res = await client.get('/teams');
    setTeams(res.data.teams);
  };

  useEffect(() => { fetchMatches(); fetchTeams(); }, []);

  const handleSave = async (values: any) => {
    try {
      const data = {
        ...values,
        matchDate: values.matchDate.toISOString(),
      };
      if (editing) {
        await client.put(`/admin/matches/${editing.id}`, data);
        message.success('比赛更新成功');
      } else {
        await client.post('/admin/matches', data);
        message.success('比赛创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      fetchMatches();
    } catch (err: any) {
      message.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await client.delete(`/admin/matches/${id}`);
      message.success('比赛已删除');
      fetchMatches();
    } catch (err: any) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await client.put(`/admin/matches/${id}/status`, { status });
      message.success('状态已更新');
      fetchMatches();
    } catch (err: any) {
      message.error(err.response?.data?.error || '更新失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '主队', dataIndex: ['homeTeam', 'name_zh'], render: (_: any, r: any) =>
        <>{r.homeTeam?.flag_emoji} {r.homeTeam?.name_zh}</>
    },
    {
      title: '客队', dataIndex: ['awayTeam', 'name_zh'], render: (_: any, r: any) =>
        <>{r.awayTeam?.flag_emoji} {r.awayTeam?.name_zh}</>
    },
    { title: '日期', dataIndex: 'match_date', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '场馆', dataIndex: 'venue', ellipsis: true },
    { title: '阶段', dataIndex: 'stage', render: (v: string) => stageOptions.find(s => s.value === v)?.label || v },
    {
      title: '状态', dataIndex: 'status', render: (v: string, r: any) => (
        <Select value={v} size="small" style={{ width: 100 }}
          onChange={(s) => handleStatusChange(r.id, s)}
          options={statusOptions}
        />
      )
    },
    {
      title: '比分', render: (_: any, r: any) =>
        r.home_score !== null ? `${r.home_score} - ${r.away_score}` : '-'
    },
    {
      title: '操作', render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditing(r);
            form.setFieldsValue({
              homeTeamId: r.home_team_id,
              awayTeamId: r.away_team_id,
              matchDate: dayjs(r.match_date),
              venue: r.venue,
              stage: r.stage,
            });
            setModalOpen(true);
          }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ color: '#e2e8f0', margin: 0 }}>⚽ 比赛管理</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditing(null); form.resetFields(); setModalOpen(true);
          }}>添加比赛</Button>
          <Button icon={<ThunderboltOutlined />} onClick={async () => {
            try {
              const res = await client.post('/admin/generate-schedule');
              message.success(res.data.message);
              fetchMatches();
            } catch (err: any) { message.error(err.response?.data?.error || '生成失败'); }
          }}>小组赛</Button>
          <Button icon={<ThunderboltOutlined />} style={{ borderColor: '#ffd700', color: '#ffd700' }} onClick={async () => {
            try {
              const res = await client.post('/admin/generate-knockout');
              message.success(res.data.message);
              fetchMatches();
            } catch (err: any) { message.error(err.response?.data?.error || '生成失败'); }
          }}>淘汰赛</Button>
        </Space>
      </div>

      <Table columns={columns} dataSource={matches} rowKey="id" loading={loading}
        pagination={{ pageSize: 20 }} scroll={{ x: 1200 }} />

      <Modal
        title={editing ? '编辑比赛' : '添加比赛'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="homeTeamId" label="主队" rules={[{ required: true }]}>
            <Select showSearch filterOption={(input, option) =>
              (option?.label as string)?.includes(input)}
              options={teams.map(t => ({ label: `${t.flag_emoji} ${t.name_zh}`, value: t.id }))} />
          </Form.Item>
          <Form.Item name="awayTeamId" label="客队" rules={[{ required: true }]}>
            <Select showSearch filterOption={(input, option) =>
              (option?.label as string)?.includes(input)}
              options={teams.map(t => ({ label: `${t.flag_emoji} ${t.name_zh}`, value: t.id }))} />
          </Form.Item>
          <Form.Item name="matchDate" label="比赛时间" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="venue" label="场馆">
            <Input placeholder="比赛场馆" />
          </Form.Item>
          <Form.Item name="stage" label="阶段" initialValue="group">
            <Select options={stageOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
