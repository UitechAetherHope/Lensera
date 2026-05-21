import {
  CalendarIcon,
  ChevronLeftIcon,
  EyeIcon,
  PersonIcon,
} from '@primer/octicons-react';
import { Label } from '@primer/react';
import { useEffect, useState } from 'react';
import BlogArticleOutline from './BlogArticleOutline';
import BlogCommentsPanel from './BlogCommentsPanel';
import './BlogArticle.css';

const categoryLabelVariants = {
  技术分享: 'accent',
  器材资讯: 'success',
  社区新闻: 'done',
  后期教程: 'attention',
  行业动态: 'severe',
};

/**
 * 简洁文章页：对应投稿表单字段，方便用户对照编辑。
 * - 标题 title · 摘要 excerpt · 正文 contentBlocks（小标题 / 段落 / 要点）
 * - 可选 aiSummary（后期 API 填入）
 */
export default function BlogArticleView({
  post,
  sections,
  markdownHtml,
  outline = [],
  adjacentPosts,
  blogId = null,
  tokenPresent = false,
  localComments,
  onLocalCommentAdd,
  onBack,
  onNavigatePost,
  backLabel = '返回博客列表',
}) {
  const aiSummary = post.aiSummary;
  const [scrollRoot, setScrollRoot] = useState(null);
  const readMinutes =
    post.readMinutes ??
    Math.max(3, Math.ceil((markdownHtml ? 4 : sections.length) * 2.5));
  const showOutline = outline.length > 0;

  useEffect(() => {
    const root = document.querySelector('.editor-content');
    if (root instanceof HTMLElement) setScrollRoot(root);
  }, []);

  return (
    <article
      className={`blog-article blog-article--editor${showOutline ? ' has-outline' : ''}`}
    >
      <button type="button" className="blog-article__back" onClick={onBack}>
        <ChevronLeftIcon size={16} />
        {backLabel}
      </button>

      <div className="blog-article__layout">
        <div className="blog-article__sheet">
        <header className="blog-article__head">
          <Label variant={categoryLabelVariants[post.category] ?? 'secondary'}>
            {post.category}
          </Label>
          <h1>{post.title}</h1>
          <p className="blog-article__lead">{post.excerpt}</p>
          <div className="blog-article__byline">
            <span>
              <PersonIcon size={14} />
              {post.author}
            </span>
            <span>
              <CalendarIcon size={14} />
              {post.date}
            </span>
            <span>
              <EyeIcon size={14} />
              {post.views}
            </span>
            <span>约 {readMinutes} 分钟</span>
          </div>
        </header>

        {aiSummary && (
          <aside
            className="blog-article__ai"
            data-api-slot={`blog-ai-summary-${post.id}`}
            data-api-status={aiSummary.status ?? 'placeholder'}
            data-api-endpoint={`/api/blog/${post.id}/ai-summary`}
          >
            <div className="blog-article__ai-label">AI 精炼</div>
            <p className="blog-article__ai-text">{aiSummary.oneLiner}</p>
            {aiSummary.bullets?.length > 0 && (
              <ul>
                {aiSummary.bullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </aside>
        )}

        {post.image && (
          <figure className="blog-article__cover">
            <img src={post.image} alt="" />
          </figure>
        )}

        <div className="blog-article__body">
          {markdownHtml ? (
            <div
              className="blog-article__markdown"
              dangerouslySetInnerHTML={{ __html: markdownHtml }}
            />
          ) : null}
          {!markdownHtml &&
            sections.map((section, index) => (
            <section key={section.title} className="blog-article__block">
              <h2 id={`section-${index}`}>{section.title}</h2>
              {section.body?.split('\n').map((para, i) =>
                para.trim() ? <p key={`${section.title}-${i}`}>{para}</p> : null,
              )}
              {section.callout && (
                <blockquote className="blog-article__quote">{section.callout}</blockquote>
              )}
              {section.points?.length > 0 && (
                <ul className="blog-article__list">
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {post.tags?.length > 0 && (
          <footer className="blog-article__tags">
            {post.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </footer>
        )}

        {adjacentPosts.previous && (
          <nav className="blog-article__prev" aria-label="上一篇">
            <span className="blog-article__prev-label">上一篇</span>
            <button type="button" onClick={() => onNavigatePost(adjacentPosts.previous.id)}>
              {adjacentPosts.previous.title}
            </button>
          </nav>
        )}

        <BlogCommentsPanel
          blogId={blogId}
          tokenPresent={tokenPresent}
          localComments={localComments}
          onLocalCommentAdd={onLocalCommentAdd}
        />
        </div>

        {showOutline && (
          <aside className="blog-article__outline-aside">
            <BlogArticleOutline items={outline} scrollRoot={scrollRoot} />
          </aside>
        )}
      </div>
    </article>
  );
}
