import { Component, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBlogPostsByPublicId, fetchMyBlogPosts } from './api/blogs';
import MineBlogFeedCard from './MineBlogFeedCard';
import { getBlogDetailPath, getMineProfilePath } from './utils/blogRoutes';
import { mapApiBlogToCard } from './utils/mapApiBlogToCard';

class MineBlogPanelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mine-blog-panel mine-blog-panel--error">
          <p className="mine-blog-compose-hint mine-blog-compose-hint--err">
            博客区域加载异常：{this.state.error?.message || '未知错误'}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * @param {{
 *   publicId?: number | null,
 *   isSelf?: boolean,
 *   tokenPresent?: boolean,
 *   showCompose?: boolean,
 *   refreshKey?: number,
 *   onEditBlog?: (post: object) => void,
 * }} props
 */
function MineBlogPanelInner({
  publicId,
  isSelf = false,
  tokenPresent = false,
  showCompose = false,
  refreshKey = 0,
  onEditBlog,
}) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  /** @type {['published' | 'drafts']} */
  const [listTab, setListTab] = useState('published');

  useEffect(() => {
    let cancelled = false;

    if (!isSelf && (publicId == null || publicId === '')) {
      setPosts([]);
      setLoadErr('');
      setLoading(false);
      return undefined;
    }

    if (isSelf && !tokenPresent) {
      setPosts([]);
      setLoadErr('');
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setLoadErr('');

    const loader = isSelf ? fetchMyBlogPosts() : fetchBlogPostsByPublicId(publicId);

    loader
      .then((list) => {
        if (cancelled) return;
        const raw = Array.isArray(list) ? list : [];
        const mapped = raw
          .map((item) => {
            try {
              if (item?.blogId == null) return null;
              return mapApiBlogToCard(item);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        setPosts(isSelf ? mapped : mapped.filter((p) => p.status === 'published'));
      })
      .catch((e) => {
        if (cancelled) return;
        setPosts([]);
        setLoadErr(e?.response?.data?.message || '博客列表加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publicId, isSelf, tokenPresent, refreshKey]);

  const visiblePosts = useMemo(() => {
    if (!isSelf) {
      return posts.filter((p) => p.status === 'published');
    }
    if (listTab === 'drafts') {
      return posts.filter((p) => p.status === 'draft');
    }
    return posts.filter((p) => p.status !== 'draft');
  }, [posts, isSelf, listTab]);

  const openPost = (post) => {
    if (!post?.id) return;
    const backTo = getMineProfilePath(publicId);
    navigate(getBlogDetailPath(post.id, { from: 'mine', publicId }), {
      state: {
        from: 'mine',
        backLabel: '返回个人主页',
        backTo,
      },
    });
  };

  const emptyHint =
    !isSelf
      ? '该用户暂无已发布博客。'
      : listTab === 'drafts'
        ? '草稿箱是空的。在「上传作品 → 博客」里保存草稿后会出现在这里。'
        : '暂无已发表或审核中的博客。通过「上传作品 → 博客」发布后会显示在这里。';

  return (
    <div className="mine-blog-panel">
      {showCompose && (
        <div className="mine-blog-toolbar" role="tablist" aria-label="我的博客分类">
          <button
            type="button"
            role="tab"
            aria-selected={listTab === 'published'}
            className={`mine-blog-filter-btn${listTab === 'published' ? ' is-active' : ''}`}
            onClick={() => setListTab('published')}
          >
            已发表
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listTab === 'drafts'}
            className={`mine-blog-filter-btn${listTab === 'drafts' ? ' is-active' : ''}`}
            onClick={() => setListTab('drafts')}
          >
            草稿箱
          </button>
        </div>
      )}

      {loading && <p className="mine-blog-compose-hint">加载博客列表…</p>}

      {!loading && loadErr && (
        <p className="mine-blog-compose-hint mine-blog-compose-hint--err" role="alert">
          {loadErr}
        </p>
      )}

      {!loading && !loadErr && visiblePosts.length === 0 && (
        <p className="mine-blog-compose-hint">{emptyHint}</p>
      )}

      {!loading && visiblePosts.length > 0 && (
        <div className="mine-blog-feed">
          {visiblePosts.map((post) => (
            <MineBlogFeedCard
              key={post.id}
              post={post}
              showStatus={isSelf}
              onOpen={openPost}
              onEdit={isSelf && onEditBlog ? () => onEditBlog(post) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MineBlogPanel(props) {
  return (
    <MineBlogPanelErrorBoundary>
      <MineBlogPanelInner {...props} />
    </MineBlogPanelErrorBoundary>
  );
}
