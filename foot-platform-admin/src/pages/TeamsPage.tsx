import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Space, Popconfirm, message, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title } = Typography;

const groupOptions = Array.from({ length: 12 }, (_, i) => ({ label: `Group ${String.fromCharCode(65 + i)}`, value: String.fromCharCode(65 + i) }));

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await client.get('/admin/teams');
      setTeams(res.data.teams || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, []);

  const handleSave = async (values: any) => {
    try {
      if (editing) {
        await client.put(`/admin/teams/${editing.id}`, values);
        message.success('球队更新成功');
      } else {
        await client.post('/admin/teams', values);
        message.success('球队创建成功');
      }
      setModalOpen(false); setEditing(null); form.resetFields(); fetchTeams();
    } catch (err: any) { message.error(err.response?.data?.error || '操作失败'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await client.delete(`/admin/teams/${id}`);
      message.success('球队已删除');
      fetchTeams();
    } catch (err: any) { message.error(err.response?.data?.error || '删除失败'); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '国旗', dataIndex: 'flag_emoji', width: 60, render: (v: string) => <span style={{ fontSize: 24 }}>{v}</span> },
    { title: '中文名', dataIndex: 'name_zh' },
    { title: '英文名', dataIndex: 'name_en' },
    { title: '代码', dataIndex: 'short_code' },
    { title: '分组', dataIndex: 'group_name' },
    {
      title: 'Elo', dataIndex: 'elo_rating', sorter: (a: any, b: any) => b.elo_rating - a.elo_rating,
      render: (v: number) => <span style={{ color: v >= 1800 ? '#22c55e' : v >= 1600 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{v}</span>
    },
    {
      title: '操作', render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditing(r);
            form.setFieldsValue({
              nameZh: r.name_zh, nameEn: r.name_en, shortCode: r.short_code,
              flagEmoji: r.flag_emoji, eloRating: r.elo_rating, groupName: r.group_name,
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
        <Title level={3} style={{ color: '#e2e8f0', margin: 0 }}>👥 球队管理 ({teams.length})</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null); form.resetFields(); setModalOpen(true);
        }}>添加球队</Button>
      </div>

      <Table columns={columns} dataSource={teams} rowKey="id" loading={loading} pagination={false} />

      <Modal
        title={editing ? '编辑球队' : '添加球队'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="nameZh" label="中文名" rules={[{ required: true }]}>
            <Input placeholder="如：阿根廷" />
          </Form.Item>
          <Form.Item name="nameEn" label="英文名" rules={[{ required: true }]}>
            <Input placeholder="如：Argentina" />
          </Form.Item>
          <Form.Item name="shortCode" label="三字母代码" rules={[{ required: true, len: 3 }]}>
            <Input placeholder="如：ARG" maxLength={3} style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item name="flagEmoji" label="国旗 Emoji">
            <Input placeholder="如：🇦🇷" />
          </Form.Item>
          <Form.Item name="eloRating" label="Elo 评分" initialValue={1500}>
            <InputNumber min={800} max={2500} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="groupName" label="分组">
            <Select options={groupOptions} allowClear placeholder="选择小组" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
