import { useEffect } from 'react';
import { CalendarIcon, EyeIcon } from '@primer/octicons-react';
import { CounterLabel, Label } from '@primer/react';
import { useDampedSlotCarousel } from './hooks/useDampedSlotCarousel';
import { getAuthorSlotPosts } from './utils/getAuthorSlotPosts';

/**
 * 博客页推荐区：横向三槽，每槽 1 作者 2 篇；滚轮向下 → 阻尼右滑
 */
export default function BlogHeroAuthorCarousel({
  featuredAuthors,
  apiFeedPosts = [],
  onIndexChange,
  onOpenPost,
  goToIndexRef,
}) {
  const authorKey = featuredAuthors.map((a) => a.id).join('|');

  const { viewportRef, trackStyle, activeIndex, goToIndex, slotStepStyle } = useDampedSlotCarousel({
    slotCount: featuredAuthors.length,
    axis: 'x',
    resetKey: authorKey,
  });

  useEffect(() => {
    onIndexChange?.(activeIndex);
  }, [activeIndex, onIndexChange]);

  useEffect(() => {
    if (goToIndexRef) {
      goToIndexRef.current = goToIndex;
    }
  }, [goToIndex, goToIndexRef]);

  return (
    <div
      ref={viewportRef}
      className="blog-board__hero-carousel"
      aria-label="推荐作者博客列表"
      tabIndex={0}
    >
      <div className="blog-board__hero-carousel-track" style={trackStyle}>
        {featuredAuthors.map((author) => {
          const posts = getAuthorSlotPosts(author, apiFeedPosts);
          return (
            <div key={author.id} className="blog-board__hero-slot" style={slotStepStyle}>
              <div className="blog-board__hero-list">
                {posts.length > 0 ? (
                  posts.map((post, index) => (
                    <button
                      key={`${author.id}-${post.id}-${index}`}
                      type="button"
                      className={`blog-board__hero-post${index === 1 ? ' is-secondary' : ''}`}
                      onClick={() => onOpenPost?.(post)}
                    >
                      <div
                        className={`blog-board__hero-post-thumb ${
                          post.heroTone === 'gear' ? 'is-gear' : 'is-night'
                        }`}
                        style={{ '--hero-post-image': `url(${post.image})` }}
                      >
                        <span>{index === 0 ? '主推文章' : '最新补充'}</span>
                      </div>

                      <div className="blog-board__hero-post-content">
                        <div className="blog-board__hero-post-top">
                          <Label size="small" variant="secondary">
                            {index === 0 ? '推荐作者专栏' : '同作者更新'}
                          </Label>
                          <CounterLabel variant="secondary">
                            <EyeIcon size={12} />
                            {post.views}
                          </CounterLabel>
                        </div>

                        <div className="blog-board__hero-post-title">{post.title}</div>
                        <p>{post.heroExcerpt ?? post.excerpt}</p>

                        <div className="blog-board__hero-post-meta">
                          <span>
                            <CalendarIcon size={14} />
                            {post.date}
                          </span>
                          <span>
                            <EyeIcon size={14} />
                            {post.views} 阅读
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="blog-board__hero-slot-empty">该作者暂无足够博客展示</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
