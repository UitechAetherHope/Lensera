import { BaseStyles, Button, ThemeProvider } from '@primer/react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getMineProfilePath } from './utils/blogRoutes';
import { fetchBlogPost, recordBlogView } from './api/blogs';
import BlogArticleView from './BlogArticleView';
import { buildMarkdownArticle } from './utils/simpleMarkdownHtml';
import './Blog.css';
import './BlogArticle.css';

const BLOG_ROUTE = '/editor/blog';

/** @param {{ blogId?: number }} props */
export default function ApiBlogDetail({ blogId: blogIdProp }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromMine =
    location.state?.from === 'mine' || searchParams.get('from') === 'mine';
  const queryPublicId = searchParams.get('publicId');
  const backTo =
    location.state?.backTo ??
    (fromMine ? getMineProfilePath(queryPublicId ?? undefined) : BLOG_ROUTE);
  const backLabel = fromMine ? '返回个人主页' : (location.state?.backLabel ?? '返回博客列表');
  const routeId = id ?? (blogIdProp != null ? `p-${blogIdProp}` : '');
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!routeId) {
      setPost(null);
      setLoading(false);
      setErr('无效的博客链接');
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setErr('');
    fetchBlogPost(routeId)
      .then((data) => {
        if (!cancelled) {
          setPost(data);
          if (data?.blogId) void recordBlogView(data.blogId);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPost(null);
          setErr(e?.response?.data?.message || e?.message || '加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  const viewPost = useMemo(() => {
    if (!post) return null;
    return {
      id: post.blogId,
      category: post.category,
      title: post.title,
      excerpt: post.excerpt,
      author: post.author,
      date: post.date,
      views: post.views,
      comments: post.comments,
      image: post.coverUrl,
      tags: post.tags ?? [],
      markdownBody: post.bodyMarkdown,
    };
  }, [post]);

  const { html: markdownHtml, outline } = useMemo(() => {
    if (!viewPost?.markdownBody) return { html: '', outline: [] };
    return buildMarkdownArticle(viewPost.markdownBody);
  }, [viewPost?.markdownBody]);

  if (loading) {
    return (
      <ThemeProvider colorMode="night" nightScheme="dark_dimmed">
        <BaseStyles className="blog-board__base">
          <section className="blog-detail blog-detail--empty">
            <div className="blog-board__empty">加载中…</div>
          </section>
        </BaseStyles>
      </ThemeProvider>
    );
  }

  if (!viewPost) {
    return (
      <ThemeProvider colorMode="night" nightScheme="dark_dimmed">
        <BaseStyles className="blog-board__base">
          <section className="blog-detail blog-detail--empty">
            <div className="blog-board__empty">
              {err || '没有找到这篇博客。'}
              <Button className="blog-detail__empty-action" onClick={() => navigate(BLOG_ROUTE)}>
                返回博客列表
              </Button>
            </div>
          </section>
        </BaseStyles>
      </ThemeProvider>
    );
  }

  const tokenPresent =
    typeof localStorage !== 'undefined' && !!localStorage.getItem('token');

  return (
    <ThemeProvider colorMode="night" nightScheme="dark_dimmed">
      <BaseStyles className="blog-board__base">
        <BlogArticleView
          post={viewPost}
          sections={[]}
          markdownHtml={markdownHtml}
          outline={outline}
          adjacentPosts={{ previous: null, next: null }}
          blogId={viewPost.id}
          tokenPresent={tokenPresent}
          backLabel={backLabel}
          onBack={() => navigate(backTo)}
          onNavigatePost={() => {}}
        />
      </BaseStyles>
    </ThemeProvider>
  );
}
