import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import client from '../api/client';

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const [article, setArticle] = useState<any>(null);

  useEffect(() => {
    if (id) client.get(`/news/${id}`).then(r => setArticle(r.data.article)).catch(() => {});
  }, [id]);

  if (!article) return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">{t('common.loading')}</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/news" className="text-gray-400 hover:text-accent text-sm mb-4 inline-block">← {lang === 'zh' ? '返回新闻' : 'Back to News'}</Link>

      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-3">
          {article.is_pinned === 1 && <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded">📌 置顶</span>}
          <span className="text-xs text-gray-500">{article.source}</span>
          <span className="text-xs text-gray-500">
            {new Date(article.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-xs text-gray-600">👁 {article.view_count || 0}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-6">{lang === 'zh' ? article.title_zh : article.title_en || article.title_zh}</h1>

        <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
          {lang === 'zh' ? article.content_zh : article.content_en || article.content_zh}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-700/50 text-xs text-gray-500">
          {lang === 'zh' ? '来源' : 'Source'}: {article.source}
        </div>
      </div>
    </div>
  );
}
