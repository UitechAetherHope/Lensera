/** 个人主页博客列表卡片：与 BlogFeedCard 同款布局，不依赖 Primer（避免 ThemeProvider 下组件 undefined） */

const CATEGORY_CLASS = {
  技术分享: 'mine-blog-feed-card__cat--accent',
  器材资讯: 'mine-blog-feed-card__cat--success',
  社区新闻: 'mine-blog-feed-card__cat--done',
  后期教程: 'mine-blog-feed-card__cat--attention',
  行业动态: 'mine-blog-feed-card__cat--severe',
};

const STATUS_LABEL = {
  draft: '草稿',
  pending: '待审',
  rejected: '已驳回',
};

/**
 * @param {{ post: object, showStatus?: boolean, onOpen: (post: object) => void, onEdit?: () => void }} props
 */
export default function MineBlogFeedCard({ post, showStatus = false, onOpen, onEdit }) {
  const statusLabel = showStatus && post.status ? STATUS_LABEL[post.status] : null;

  const handleOpen = () => onOpen(post);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="blog-board__card"
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
    >
      <div className="blog-board__card-inner">
        <div>
          <div className="blog-board__card-kicker">
            <div className="blog-board__card-signals">
              <span className={`mine-blog-feed-card__cat ${CATEGORY_CLASS[post.category] ?? ''}`}>
                {post.category}
              </span>
              {statusLabel && <span className="mine-blog-feed-card__status">{statusLabel}</span>}
              {!statusLabel && post.comments >= 30 && (
                <span className="mine-blog-feed-card__hot">讨论升温</span>
              )}
            </div>
            <div className="blog-board__card-counters">
              <span className="blog-board__card-counter mine-blog-feed-card__counter--primary">
                👁 {post.views}
              </span>
              <span className="blog-board__card-counter mine-blog-feed-card__counter--secondary">
                💬 {post.comments}
              </span>
            </div>
          </div>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          <div className="blog-board__card-meta">
            <span>{post.author}</span>
            <span>{post.date}</span>
          </div>
          {(post.tags ?? []).length > 0 && (
            <div className="blog-board__card-tags">
              {(post.tags ?? []).slice(0, 3).map((tag) => (
                <span key={tag} className="mine-blog-feed-card__tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="blog-board__card-actions">
            <span>阅读 ›</span>
            <span>💬 进入讨论</span>
            {onEdit ? (
              <button
                type="button"
                className="mine-blog-feed-card__edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                编辑
              </button>
            ) : null}
          </div>
        </div>
        <div className="blog-board__card-thumb">
          {post.image ? (
            <img src={post.image} alt="" loading="lazy" />
          ) : (
            <span className="mine-blog-cover-placeholder">无封面</span>
          )}
        </div>
      </div>
    </div>
  );
}
