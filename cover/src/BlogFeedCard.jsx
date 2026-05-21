import { CounterLabel, Label, StateLabel } from '@primer/react';
import {
  CalendarIcon,
  ChevronRightIcon,
  CommentDiscussionIcon,
  EyeIcon,
  PersonIcon,
} from '@primer/octicons-react';

const categoryLabelVariants = {
  技术分享: 'accent',
  器材资讯: 'success',
  社区新闻: 'done',
  后期教程: 'attention',
  行业动态: 'severe',
};

const statusLabelMeta = {
  draft: { label: '草稿' },
  pending: { label: '待审' },
  rejected: { label: '已驳回' },
};

export default function BlogFeedCard({ post, active = false, heroFocus = false, onOpen, showStatus = false }) {
  const statusMeta = showStatus && post.status ? statusLabelMeta[post.status] : null;

  return (
    <button
      type="button"
      className={`blog-board__card${active ? ' is-active' : ''}${heroFocus ? ' is-hero-focus' : ''}`}
      onClick={() => onOpen(post)}
    >
      <div className="blog-board__card-inner">
        <div>
          <div className="blog-board__card-kicker">
            <div className="blog-board__card-signals">
              <Label variant={categoryLabelVariants[post.category] ?? 'secondary'}>{post.category}</Label>
              {statusMeta ? (
                <StateLabel size="small" status="issue">
                  {statusMeta.label}
                </StateLabel>
              ) : null}
              {!statusMeta && post.comments >= 30 ? (
                <StateLabel size="small" status="open">
                  讨论升温
                </StateLabel>
              ) : null}
            </div>
            <div className="blog-board__card-counters">
              <CounterLabel className="blog-board__card-counter" variant="primary">
                <EyeIcon size={12} />
                {post.views}
              </CounterLabel>
              <CounterLabel className="blog-board__card-counter" variant="secondary">
                <CommentDiscussionIcon size={12} />
                {post.comments}
              </CounterLabel>
            </div>
          </div>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          <div className="blog-board__card-meta">
            <span>
              <PersonIcon size={14} />
              {post.author}
            </span>
            <span>
              <CalendarIcon size={14} />
              {post.date}
            </span>
          </div>
          <div className="blog-board__card-tags">
            {(post.tags ?? []).slice(0, 3).map((tag) => (
              <Label key={tag} className="blog-board__card-tag" size="small" variant="secondary">
                #{tag}
              </Label>
            ))}
          </div>
          <div className="blog-board__card-actions">
            <span>
              阅读
              <ChevronRightIcon size={14} />
            </span>
            <span>
              <CommentDiscussionIcon size={14} />
              进入讨论
            </span>
          </div>
        </div>
        <div className="blog-board__card-thumb">
          {post.image ? (
            <img src={post.image} alt={post.title} />
          ) : (
            <div className="mine-blog-cover-placeholder">无封面</div>
          )}
        </div>
      </div>
    </button>
  );
}
