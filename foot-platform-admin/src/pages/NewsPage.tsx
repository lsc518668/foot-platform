import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Popconfirm, message, Typography, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title } = Typography;
const { TextArea } = Input;

export default function AdminNewsPage() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try { const r = await client.get('/news', { params: { limit: 100 } }); setNews(r.data.news || []); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async (values: any) => {
    try {
      if (editing) {
        await client.put(`/news/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await client.post('/news', values);
        message.success('发布成功');
      }
      setModalOpen(false); setEditing(null); form.resetFields(); fetch();
    } catch (e: any) { message.error(e.response?.data?.error || '失败'); }
  };

  const handleDelete = async (id: number) => {
    await client.delete(`/news/${id}`);
    message.success('已删除');
    fetch();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 50 },
    { title: '标题（中文）', dataIndex: 'title_zh', ellipsis: true,
      render: (v: string, r: any) => <>{r.is_pinned ? '📌 ' : ''}{v}</> },
    { title: '来源', dataIndex: 'source', width: 80 },
    { title: '浏览', dataIndex: 'view_count', width: 60 },
    { title: '时间', dataIndex: 'created_at', width: 140,
      render: (v: string) => v ? new Date(v).toLocaleDateString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-' },
    { title: '操作', width: 120,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditing(r);
            form.setFieldsValue({ titleZh: r.title_zh, titleEn: r.title_en, contentZh: r.content_zh, contentEn: r.content_en, summaryZh: r.summary_zh, summaryEn: r.summary_en, source: r.source, isPinned: r.is_pinned === 1 });
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
        <Title level={3} style={{ color: '#e2e8f0', margin: 0 }}>📰 新闻管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null); form.resetFields(); setModalOpen(true);
        }}>发布新闻</Button>
      </div>

      <Table columns={columns} dataSource={news} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />

      <Modal title={editing ? '编辑新闻' : '发布新闻'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={700} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="titleZh" label="标题（中文）" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="titleEn" label="标题（英文）"><Input /></Form.Item>
          <Form.Item name="summaryZh" label="摘要（中文）"><Input /></Form.Item>
          <Form.Item name="summaryEn" label="摘要（英文）"><Input /></Form.Item>
          <Form.Item name="contentZh" label="内容（中文）" rules={[{ required: true }]}><TextArea rows={6} /></Form.Item>
          <Form.Item name="contentEn" label="内容（英文）"><TextArea rows={6} /></Form.Item>
          <Form.Item name="source" label="来源" initialValue="官方"><Input /></Form.Item>
          <Form.Item name="isPinned" label="置顶" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
