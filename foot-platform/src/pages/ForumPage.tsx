import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useI18n } from '../i18n';
import { useAuthStore } from '../stores/authStore';

const defaultCats = [
  { id: 1, name_zh: '赛事讨论', name_en: 'Match Discussion' },
  { id: 2, name_zh: '投注交流', name_en: 'Betting Talk' },
  { id: 3, name_zh: '球队专区', name_en: 'Team Zone' },
  { id: 4, name_zh: '新手问答', name_en: 'Q&A' },
  { id: 5, name_zh: '水帖专区', name_en: 'Off-Topic' },
];

export default function ForumPage() {
  const { t, lang } = useI18n();
  const { isAuthenticated } = useAuthStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [catId, setCatId] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [showEditor, setShowEditor] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selCat, setSelCat] = useState(1);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    client.get('/forum/categories').then(r => {
      setCategories(r.data.categories?.length ? r.data.categories : defaultCats);
    }).catch(() => setCategories(defaultCats));
  }, []);
  useEffect(() => {
    client.get('/forum/posts', { params: { categoryId: catId || undefined, page, limit: 20 } })
      .then(r => { setPosts(r.data.posts); setTotal(r.data.total); }).catch(() => {});
  }, [catId, page]);

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) return;
    try {
      await client.post('/forum/posts', { title, content, categoryId: selCat });
      setShowEditor(false); setTitle(''); setContent(''); setMsg('');
      setPage(1);
      const r = await client.get('/forum/posts', { params: { categoryId: catId || undefined, page: 1, limit: 20 } });
      setPosts(r.data.posts); setTotal(r.data.total);
    } catch (e: any) { setMsg(e.response?.data?.error || '发帖失败'); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">💬 {lang === 'zh' ? '世界杯论坛' : 'World Cup Forum'}</h1>
        {isAuthenticated && (
          <button onClick={() => setShowEditor(!showEditor)} className="btn-accent !py-2 !px-4">
            {showEditor ? '取消' : '+ 发帖'}
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => { setCatId(''); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${catId === '' ? 'bg-accent text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
          {t('dashboard.all')}
        </button>
        {categories.map(c => (
          <button key={c.id} onClick={() => { setCatId(c.id); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm ${catId === c.id ? 'bg-accent text-gray-900 font-medium' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {lang === 'zh' ? c.name_zh : c.name_en}
          </button>
        ))}
      </div>

      {/* New post editor */}
      {showEditor && (
        <div className="card mb-4">
          <input value={title} onChange={e => setTitle(e.target.value)} className="input-field mb-3" placeholder="标题" />
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} className="input-field mb-3" placeholder="内容..." />
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className="text-xs text-gray-400">分类：</span>
            {categories.map(c => (
              <button key={c.id} type="button"
                onClick={() => setSelCat(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selCat === c.id ? 'bg-accent text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                }`}>
                {lang === 'zh' ? c.name_zh : c.name_en}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePost} className="btn-accent !py-2 !px-6 !text-sm">发布</button>
          </div>
          {msg && <p className="text-red-400 text-sm mt-2">{msg}</p>}
        </div>
      )}

      {/* Post list */}
      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-500"><p className="text-4xl mb-4">📝</p><p>暂无帖子</p></div>
      ) : (
        <div className="space-y-2">
          {posts.map((p: any) => (
            <Link key={p.id} to={`/forum/${p.id}`} className="card block hover:border-accent/50">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {p.is_pinned === 1 && <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">置顶</span>}
                    <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">{lang === 'zh' ? p.cat_name : p.cat_name_en}</span>
                    <h3 className="font-medium truncate">{p.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500">{p.username} · {new Date(p.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right text-xs text-gray-500 shrink-0">
                  <p>👁 {p.view_count}</p>
                  <p>💬 {p.comment_count}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-lg text-sm ${page === i + 1 ? 'bg-accent text-gray-900' : 'bg-gray-800 text-gray-400'}`}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}
