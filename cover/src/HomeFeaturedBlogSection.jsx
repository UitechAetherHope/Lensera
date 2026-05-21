import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBlogFeed } from './api/blogs';
import { fetchWorksFeed } from './api/works';
import { fetchPublicProfile } from './api/users';
import { buildFeaturedAuthors } from './utils/buildFeaturedAuthors';
import { mapApiBlogToCard } from './utils/mapApiBlogToCard';
import { formatCompactCount } from './utils/parseCompactNumber';
import { getBlogDetailPath, getMineProfilePath } from './utils/blogRoutes';
import { useDampedSlotCarousel } from './hooks/useDampedSlotCarousel';
import { getAuthorSlotPosts } from './utils/getAuthorSlotPosts';

const BLOG_ROUTE = '/editor/blog';
const SLOT_COUNT = 3;

const FALLBACK_BLOGS_A = [
  {
    id: 'fallback-1',
    title: '如何在光线不足的环境下拍出好照片',
    excerpt: '分享一些在低光环境下拍摄的技巧和经验，帮助你更好地捕捉夜晚的美。',
    date: '2024-05-18',
    views: '1.2k',
    image: 'https://picsum.photos/seed/light/200/100',
  },
  {
    id: 'fallback-2',
    title: '我的旅行摄影装备清单',
    excerpt: '这些年我在旅行中使用过的摄影装备，以及它们的优缺点分析。',
    date: '2024-05-10',
    views: '856',
    image: 'https://picsum.photos/seed/gear/200/100',
  },
];

const FALLBACK_BLOGS_B = [
  {
    id: 'fallback-3',
    title: '夜景拍摄流程拆解：如何把暗光街头拍出层次感',
    excerpt: '从机位选择、快门控制到噪点处理，拆解一套适合城市夜拍的完整思路。',
    date: '2026-04-25',
    views: '1.2k',
    image: 'https://picsum.photos/seed/night/200/100',
  },
  {
    id: 'fallback-4',
    title: '扫街镜头怎么选：35mm 和 50mm 的真实差异',
    excerpt: '结合街头拍摄场景，对比不同焦段在构图距离与背景压缩上的差别。',
    date: '2026-04-20',
    views: '980',
    image: 'https://picsum.photos/seed/street/200/100',
  },
];

const FALLBACK_BLOGS_C = [
  {
    id: 'fallback-5',
    title: 'Lightroom 批量调色：如何统一一组旅行照片',
    excerpt: '用预设 + 局部蒙版建立可复用的旅行相册后期流程，节省重复劳动。',
    date: '2026-04-18',
    views: '760',
    image: 'https://picsum.photos/seed/edit/200/100',
  },
  {
    id: 'fallback-6',
    title: '导出设置怎么选：发博客与留存档的两套方案',
    excerpt: '讨论长边像素、锐化与色彩空间，避免二次压缩带来的细节损失。',
    date: '2026-04-12',
    views: '640',
    image: 'https://picsum.photos/seed/export/200/100',
  },
];

/** 接口不足时补足 3 个竖向卡槽（与博客页兜底作者对应） */
const HOME_FALLBACK_AUTHORS = [
  {
    id: 'home-fb-1',
    publicId: null,
    name: '光圈实验室',
    roles: '摄影师 · 城市观察者 · 内容创作者',
    bio: ['用镜头记录城市夜色与街头细节', '分享拍摄技巧、器材经验与创作心得'],
    avatarUrl: 'https://picsum.photos/seed/home-a/100/100',
    avatarLabel: '光圈',
    featuredPosts: FALLBACK_BLOGS_A,
    stats: { blogCount: 2, worksCount: 12, totalViews: 2100, totalComments: 26 },
  },
  {
    id: 'home-fb-2',
    publicId: null,
    name: '器材研究会',
    roles: '摄影器材观察者 · 搭配控 · 测评写作者',
    bio: ['专注入门到进阶器材选择与镜头组合', '把复杂参数翻译成更好理解的购买建议'],
    avatarUrl: 'https://picsum.photos/seed/home-b/100/100',
    avatarLabel: '器研',
    featuredPosts: FALLBACK_BLOGS_B,
    stats: { blogCount: 2, worksCount: 18, totalViews: 1800, totalComments: 18 },
  },
  {
    id: 'home-fb-3',
    publicId: null,
    name: '调色手册',
    roles: '后期流程设计者 · 色彩观察者 · 视觉整理控',
    bio: ['关注从筛片到导出的完整后期工作流', '分享更稳定、更省时间的调色方法和统一策略'],
    avatarUrl: 'https://picsum.photos/seed/home-c/100/100',
    avatarLabel: '调色',
    featuredPosts: FALLBACK_BLOGS_C,
    stats: { blogCount: 2, worksCount: 15, totalViews: 1400, totalComments: 12 },
  },
];

function formatViewsMeta(views) {
  const v = String(views ?? '0');
  return v.includes('阅读') ? v : `${v} 阅读`;
}

function padAuthorsToThree(list) {
  if (list.length >= SLOT_COUNT) return list.slice(0, SLOT_COUNT);
  const merged = [...list];
  for (let i = merged.length; i < SLOT_COUNT; i += 1) {
    merged.push(HOME_FALLBACK_AUTHORS[i]);
  }
  return merged;
}

function buildStatItems(author, profile) {
  const stats = author?.stats ?? {};
  return [
    { num: stats.worksCount ?? 0, label: '作品' },
    { num: stats.blogCount ?? 0, label: '博客' },
    {
      num:
        profile?.followersCount != null
          ? formatCompactCount(Number(profile.followersCount))
          : formatCompactCount(stats.totalViews ?? 0),
      label: profile?.followersCount != null ? '关注者' : '总阅读',
    },
    { num: stats.totalComments ?? 0, label: '讨论' },
  ];
}

/**
 * 首页推荐：3 个竖向卡槽（每槽 1 作者 2 篇博客），滚轮上下切换；算法同博客页 Top3
 */
export default function HomeFeaturedBlogSection() {
  const [apiFeedPosts, setApiFeedPosts] = useState([]);
  const [apiWorksFeed, setApiWorksFeed] = useState([]);
  const [authorProfiles, setAuthorProfiles] = useState({});
  const [avatarBrokenId, setAvatarBrokenId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchBlogFeed(), fetchWorksFeed()])
      .then(([blogs, works]) => {
        if (cancelled) return;
        setApiFeedPosts(Array.isArray(blogs) ? blogs.map(mapApiBlogToCard) : []);
        setApiWorksFeed(Array.isArray(works) ? works : []);
      })
      .catch(() => {
        if (!cancelled) {
          setApiFeedPosts([]);
          setApiWorksFeed([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredAuthors = useMemo(() => {
    const built = buildFeaturedAuthors({
      posts: apiFeedPosts,
      works: apiWorksFeed,
      profilesByPublicId: authorProfiles,
    });
    if (built.length > 0) return padAuthorsToThree(built);
    if (!loading) return HOME_FALLBACK_AUTHORS;
    return [];
  }, [apiFeedPosts, apiWorksFeed, authorProfiles, loading]);

  const authorSlotKey = useMemo(
    () => featuredAuthors.map((a) => a.id).join('|'),
    [featuredAuthors],
  );

  useEffect(() => {
    const ids = [
      ...new Set(
        buildFeaturedAuthors({ posts: apiFeedPosts, works: apiWorksFeed })
          .map((a) => a.publicId)
          .filter((id) => id != null),
      ),
    ];
    if (ids.length === 0) return undefined;

    let cancelled = false;
    Promise.all(ids.map((id) => fetchPublicProfile(id).catch(() => null))).then((profiles) => {
      if (cancelled) return;
      const map = {};
      profiles.forEach((p, index) => {
        if (p?.publicId != null) map[String(p.publicId)] = p;
        else if (p && ids[index] != null) map[String(ids[index])] = p;
      });
      setAuthorProfiles(map);
    });

    return () => {
      cancelled = true;
    };
  }, [apiFeedPosts, apiWorksFeed]);

  const {
    viewportRef,
    trackStyle,
    activeIndex,
    goToIndex,
    bindSlotRef,
    slotStepStyle,
    viewportStyle,
  } = useDampedSlotCarousel({
    slotCount: featuredAuthors.length,
    axis: 'y',
    resetKey: authorSlotKey,
  });

  useEffect(() => {
    setAvatarBrokenId(null);
  }, [authorSlotKey, activeIndex]);

  const currentAuthor = featuredAuthors[activeIndex] ?? featuredAuthors[0];
  const currentProfile =
    currentAuthor?.publicId != null ? authorProfiles[String(currentAuthor.publicId)] : null;

  if (!currentAuthor) {
    return (
      <section className="blog-profile-section">
        <div className="latest-blogs">
          <div className="section-header">
            <h2>最新博客</h2>
          </div>
          <p className="home-blog-hint">加载中…</p>
        </div>
      </section>
    );
  }

  const bioLines =
    currentAuthor.bio?.length > 0
      ? currentAuthor.bio
      : currentProfile?.bio?.trim()
        ? currentProfile.bio.trim().split(/\n+/).filter(Boolean)
        : ['分享摄影经验与创作记录'];

  const profilePath =
    currentAuthor.publicId != null ? getMineProfilePath(currentAuthor.publicId) : BLOG_ROUTE;
  const showAvatarImg =
    currentAuthor.avatarUrl && avatarBrokenId !== currentAuthor.id;

  return (
    <section className="blog-profile-section">
      <div className="latest-blogs">
        <div className="section-header home-blog-section-head">
          <h2>最新博客</h2>
        </div>

        <div
          ref={viewportRef}
          className="home-author-carousel"
          aria-label="推荐作者博客列表"
          tabIndex={0}
          style={viewportStyle}
        >
          <div className="home-author-carousel-track" style={trackStyle}>
            {featuredAuthors.map((author, slotIndex) => {
              const posts = getAuthorSlotPosts(author, apiFeedPosts);
              return (
                <div
                  key={author.id}
                  ref={(node) => bindSlotRef(slotIndex, node)}
                  className="home-author-slot"
                  style={slotStepStyle}
                >
                  <div className="home-author-slot-blogs">
                    {posts.length > 0 ? (
                      posts.map((blog) => (
                        <Link
                          key={`${author.id}-${blog.id}`}
                          to={getBlogDetailPath(blog.id)}
                          className="blog-card blog-card--link"
                        >
                          <img
                            src={blog.image || 'https://picsum.photos/seed/blog/200/100'}
                            alt=""
                            className="blog-img"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="blog-info">
                            <h3>{blog.title}</h3>
                            <p className="blog-desc">{blog.excerpt ?? blog.desc ?? ''}</p>
                            <p className="blog-meta">
                              {blog.date} · {formatViewsMeta(blog.views)}
                            </p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="home-blog-hint">该作者暂无足够博客展示</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="home-author-carousel-dots" aria-hidden>
            {featuredAuthors.map((author, index) => (
              <button
                key={author.id}
                type="button"
                className={`home-author-carousel-dot${activeIndex === index ? ' is-active' : ''}`}
                aria-label={`切换到${author.name}`}
                onClick={() => goToIndex(index)}
              />
            ))}
          </div>
        </div>

        <Link to={BLOG_ROUTE} className="view-all-blogs">
          查看全部博客 →
        </Link>
      </div>

      <div className="profile-card" key={currentAuthor.id}>
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            {showAvatarImg ? (
              <img
                key={`${currentAuthor.id}-${currentAuthor.avatarUrl}`}
                src={currentAuthor.avatarUrl}
                alt=""
                className="profile-avatar"
                onError={() => setAvatarBrokenId(currentAuthor.id)}
              />
            ) : (
              <span className="profile-avatar profile-avatar--fallback" aria-hidden>
                {currentAuthor.avatarLabel ?? '作者'}
              </span>
            )}
          </div>
          <div className="profile-desc">
            <p className="profile-title">{currentAuthor.roles}</p>
            <p className="profile-text">
              {bioLines.map((line, i) => (
                <span key={`${currentAuthor.id}-bio-${i}`}>
                  {line}
                  {i < bioLines.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          </div>
          <Link to={profilePath} className="btn primary-btn profile-btn">
            {currentAuthor.publicId != null ? '进入作者专栏' : '了解更多'}
          </Link>
        </div>
        <div className="profile-stats">
          {buildStatItems(currentAuthor, currentProfile).map((item) => (
            <div key={item.label} className="stat-item">
              <span className="stat-num">{item.num}</span>
              <span className="stat-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
