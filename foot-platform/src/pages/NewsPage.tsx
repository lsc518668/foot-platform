import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import client from '../api/client';

export default function NewsPage() {
  const { t, lang } = useI18n();
  const [news, setNews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    client.get('/news', { params: { page, limit: 20 } })
      .then(r => { setNews(r.data.news); setTotal(r.data.total); }).catch(() => {});
  }, [page]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">📰 {lang === 'zh' ? '世界杯新闻中心' : 'World Cup News'}</h1>

      {news.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">📭</p>
          <p>{lang === 'zh' ? '暂无新闻' : 'No news yet'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map(article => (
            <Link key={article.id} to={`/news/${article.id}`} className="card block hover:border-accent/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold mb-1 hover:text-accent transition-colors">
                    {article.is_pinned === 1 && '📌 '}{lang === 'zh' ? article.title_zh : article.title_en || article.title_zh}
                  </h2>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                    {lang === 'zh' ? article.summary_zh || article.title_zh : article.summary_en || article.summary_zh}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{article.source}</span>
                    <span>{new Date(article.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                    <span>👁 {article.view_count || 0}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-lg text-sm ${page === i + 1 ? 'bg-accent text-gray-900' : 'bg-gray-800 text-gray-400'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
