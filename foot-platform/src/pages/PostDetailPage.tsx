import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuthStore } from '../stores/authStore';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [msg, setMsg] = useState('');

  const fetchData = async () => {
    if (!id) return;
    const [p, c] = await Promise.all([
      client.get(`/forum/posts/${id}`),
      client.get(`/forum/posts/${id}/comments`),
    ]);
    setPost(p.data.post);
    setComments(c.data.comments || []);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleComment = async () => {
    if (!content.trim()) return;
    try {
      await client.post(`/forum/posts/${id}/comments`, { content });
      setContent(''); setMsg('');
      const r = await client.get(`/forum/posts/${id}/comments`);
      setComments(r.data.comments || []);
    } catch (e: any) { setMsg(e.response?.data?.error || '评论失败'); }
  };

  const handleDelete = async () => {
    if (!confirm('确定删除？')) return;
    try {
      await client.delete(`/forum/posts/${id}`);
      navigate('/forum');
    } catch (e: any) { alert(e.response?.data?.error); }
  };

  const handleDeleteComment = async (cid: number) => {
    try {
      await client.delete(`/forum/comments/${cid}`);
      setComments(prev => prev.filter(c => c.id !== cid));
    } catch {}
  };

  if (!post) return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">加载中...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/forum" className="text-gray-400 hover:text-accent text-sm mb-4 inline-block">← 返回论坛</Link>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">{post.cat_name}</span>
          {(user?.id === post.user_id || user?.role === 'admin') && (
            <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300">删除</button>
          )}
        </div>
        <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
        <p className="text-xs text-gray-500 mb-4">{post.username} · {new Date(post.created_at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · 👁 {post.view_count}</p>
        <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">{post.content}</div>
      </div>

      {/* Comments */}
      <h2 className="text-lg font-bold mb-4">评论 ({comments.length})</h2>

      {comments.map((c: any) => (
        <div key={c.id} className="card !p-4 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{c.username}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              {(user?.id === c.user_id || user?.role === 'admin') && (
                <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-red-400">删除</button>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-300">{c.content}</p>
        </div>
      ))}

      {isAuthenticated ? (
        <div className="mt-4">
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
            className="input-field mb-2" placeholder="写下你的评论..." />
          <div className="flex items-center gap-2">
            <button onClick={handleComment} className="btn-accent !py-2 !px-6 !text-sm">发表评论</button>
            {msg && <span className="text-red-400 text-sm">{msg}</span>}
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500 mt-4"><Link to="/login" className="text-accent hover:underline">登录</Link>后参与评论</p>
      )}
    </div>
  );
}
