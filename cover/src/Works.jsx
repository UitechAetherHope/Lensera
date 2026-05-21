import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, NavLink, useSearchParams } from 'react-router-dom';
import './Works.css';
import WorksLightbox from './WorksLightbox';
import { fetchWork, fetchWorksFeed, likeWork, unlikeWork } from './api/works';
import { authorAvatarSrc } from './utils/authorAvatar';

const CATEGORIES = ['全部', '风景', '人物', '动物', '街拍', '静物'];
const FILTER_LABELS = new Set(['风景', '人物', '动物', '街拍', '静物']);
const TILES = ['wide', 'mid', 'tall'];

function HeartIcon({ filled }) {
  return (
    <svg className={`works-like-icon${filled ? ' is-filled' : ''}`} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={filled ? 0 : 1.35}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function mapFeedToTile(row) {
  const tid = Number(row.workId) || 0;
  const full = row.imageUrl;
  const listSrc = row.thumbnailUrl || full;
  return {
    id: row.workId,
    workId: row.workId,
    title: row.title,
    caption: row.caption || '',
    category: row.category || null,
    authorPublicId: row.authorPublicId,
    authorName: row.authorName || '用户',
    authorAvatarUrl: row.authorAvatarUrl || null,
    img: listSrc,
    imgLarge: full,
    likes: row.likeCount ?? 0,
    liked: !!row.likedByMe,
    tile: TILES[Math.abs(tid) % 3],
  };
}

function mapWorkResponseToTile(w) {
  const tid = Number(w.workId) || 0;
  const full = w.imageUrl;
  const listSrc = w.thumbnailUrl || full;
  return {
    id: w.workId,
    workId: w.workId,
    title: w.title,
    caption: w.caption || '',
    category: w.category || null,
    authorPublicId: w.authorPublicId,
    authorName: w.authorName || '用户',
    authorAvatarUrl: w.authorAvatarUrl || null,
    img: listSrc,
    imgLarge: full,
    likes: w.likeCount ?? 0,
    liked: !!w.likedByMe,
    tile: TILES[Math.abs(tid) % 3],
  };
}

/**
 * 与个人主页作品区类似：单卡 memo，避免父级（如 likeBusyId）变化时整墙无差别重渲染。
 */
const WorksMasonryTile = React.memo(function WorksMasonryTile({ photo, likeBusy, onLike, onOpenLightbox }) {
  const tileClass = ['wide', 'mid', 'tall'].includes(photo.tile) ? photo.tile : 'mid';
  const open = useCallback(() => {
    onOpenLightbox(photo);
  }, [photo, onOpenLightbox]);

  return (
    <article className={`works-tile works-tile--${tileClass}`} role="listitem">
      <div className="works-tile-inner">
        <div
          className="works-tile-media works-tile-media--zoom"
          role="button"
          tabIndex={0}
          aria-label={`放大查看 ${photo.title}`}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              open();
            }
          }}
        >
          <img src={photo.img} alt="" className="works-tile-img" loading="lazy" decoding="async" />
          <div className="works-tile-media-vignette" aria-hidden="true" />
          <div className="works-tile-media-shine" aria-hidden="true" />
        </div>
        <footer className="works-tile-footer">
          <div className="works-tile-footer-main">
            <Link
              to={`/editor/user/${photo.authorPublicId}`}
              className="works-tile-author works-tile-author-link"
              onClick={(e) => e.stopPropagation()}
              aria-label={`${photo.authorName} 的主页`}
            >
              <span className="works-tile-avatar-ring">
                <img src={authorAvatarSrc(photo.authorAvatarUrl, photo.authorName)} className="works-tile-avatar" alt="" />
              </span>
              <span className="works-tile-name">{photo.authorName}</span>
            </Link>
          </div>
          <button
            type="button"
            className={`works-tile-like${photo.liked ? ' is-liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              void onLike(photo.workId, photo.liked);
            }}
            disabled={likeBusy}
            aria-pressed={photo.liked}
            aria-label={photo.liked ? '取消点赞' : '点赞'}
          >
            <HeartIcon filled={photo.liked} />
            <span className="works-tile-like-count">{photo.likes}</span>
          </button>
        </footer>
      </div>
    </article>
  );
});

export default function Works() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCat = searchParams.get('cat');
  const openWorkParam = searchParams.get('work') || searchParams.get('workId');
  const filterCategory = rawCat && FILTER_LABELS.has(rawCat) ? rawCat : null;
  const activeNav = filterCategory ?? '全部';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [likeBusyId, setLikeBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const list = await fetchWorksFeed(filterCategory ?? undefined);
      setItems(Array.isArray(list) ? list.map(mapFeedToTile) : []);
    } catch (e) {
      setLoadErr(e?.response?.data?.message || e?.message || '加载失败');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!openWorkParam || loading) return;
    const targetId = Number(openWorkParam);
    if (!targetId) return;

    const photo = items.find((p) => Number(p.workId) === targetId);
    if (photo) {
      setLightbox(photo);
      return undefined;
    }

    let cancelled = false;
    fetchWork(targetId)
      .then((row) => {
        if (cancelled || !row?.workId) return;
        setLightbox(mapWorkResponseToTile(row));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [openWorkParam, items, loading]);

  const closeLightbox = useCallback(() => {
    setLightbox(null);
    if (openWorkParam) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('work');
          next.delete('workId');
          return next;
        },
        { replace: true },
      );
    }
  }, [openWorkParam, setSearchParams]);

  /** 灯箱仍需对齐主内容区；顶栏改 sticky 后不再依赖写死侧栏 280px */
  useLayoutEffect(() => {
    const root = document.querySelector('.works-content-works');
    const contentCol = document.querySelector('.editor-content');
    if (!root || !contentCol) {
      return undefined;
    }

    const syncContentBounds = () => {
      const rect = contentCol.getBoundingClientRect();
      root.style.setProperty('--works-fixed-left', `${rect.left}px`);
      root.style.setProperty('--works-fixed-right', `${window.innerWidth - rect.right}px`);
      root.style.setProperty('--works-lightbox-top', `${rect.top}px`);
      root.style.setProperty('--works-lightbox-bottom', `${window.innerHeight - rect.bottom}px`);
    };

    syncContentBounds();
    const ro = new ResizeObserver(syncContentBounds);
    ro.observe(contentCol);
    const sidebar = document.querySelector('.editor-sidebar');
    if (sidebar) {
      ro.observe(sidebar);
    }
    window.addEventListener('resize', syncContentBounds);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncContentBounds);
    };
  }, []);

  const onLikeClick = useCallback(async (workId, currentlyLiked) => {
    if (!localStorage.getItem('token')) {
      window.alert('请先登录后再点赞');
      return;
    }
    setLikeBusyId(workId);
    try {
      const next = currentlyLiked ? await unlikeWork(workId) : await likeWork(workId);
      if (!next) return;
      setItems((prev) =>
        prev.map((p) => {
          if (p.workId !== workId) return p;
          const up = mapWorkResponseToTile(next);
          return { ...up, tile: p.tile };
        }),
      );
      setLightbox((prev) => {
        if (!prev || prev.workId !== workId) return prev;
        const up = mapWorkResponseToTile(next);
        return { ...up, tile: prev.tile };
      });
    } catch {
      /* 忽略 */
    } finally {
      setLikeBusyId(null);
    }
  }, []);

  const onOpenLightbox = useCallback((photo) => {
    setLightbox(photo);
  }, []);

  const tokenPresent = typeof localStorage !== 'undefined' && !!localStorage.getItem('token');

  const lightboxItem = useMemo(() => {
    if (!lightbox) return null;
    return {
      id: lightbox.workId,
      workId: lightbox.workId,
      tokenPresent,
      imageLarge: lightbox.imgLarge,
      categorySearch: lightbox.category,
      heading: lightbox.title,
      caption: lightbox.caption || undefined,
      authorName: lightbox.authorName,
      authorHref: `/editor/user/${lightbox.authorPublicId}`,
      avatarUrl: lightbox.authorAvatarUrl || null,
      liked: lightbox.liked,
      likeCount: lightbox.likes,
      onLikeClick: () => void onLikeClick(lightbox.workId, lightbox.liked),
      likeBusy: likeBusyId === lightbox.workId,
    };
  }, [lightbox, likeBusyId, onLikeClick, tokenPresent]);

  const pillClass = useCallback(
    ({ isActive }) => `works-category-pill works-category-pill--nav${isActive ? ' is-active' : ''}`,
    [],
  );

  return (
    <div className="works-content-works">
      <h1 className="works-sr-only">摄影作品</h1>
      <div className="works-fixed-head">
        <div className="works-top-align">
          <nav className="works-category-nav works-category-nav--luxury" aria-label="作品分类">
            <div className="works-category-nav-frame">
              <div className="works-category-inner">
                <NavLink to="/editor/works" end className={pillClass}>
                  <span className="works-category-pill-shine" aria-hidden="true" />
                  全部
                </NavLink>
                {CATEGORIES.filter((c) => c !== '全部').map((cat) => (
                  <NavLink
                    key={cat}
                    to={{ pathname: '/editor/works', search: `?cat=${encodeURIComponent(cat)}` }}
                    className={pillClass}
                  >
                    <span className="works-category-pill-shine" aria-hidden="true" />
                    {cat}
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>
          <button type="button" className="upload-fab-works" aria-label="上传作品">
            <span className="upload-fab-ring" aria-hidden="true" />
            <span className="upload-fab-ring upload-fab-ring--delayed" aria-hidden="true" />
            <span className="upload-fab-plus">+</span>
          </button>
        </div>
      </div>

      {loadErr ? (
        <p className="works-feed-error" role="alert">
          {loadErr}
        </p>
      ) : null}
      {loading && !loadErr ? <p className="works-feed-loading">加载中…</p> : null}

      <div className="works-masonry-grid" role="list">
        {!loading &&
          items.map((photo) => (
            <WorksMasonryTile
              key={photo.workId}
              photo={photo}
              likeBusy={likeBusyId === photo.workId}
              onLike={onLikeClick}
              onOpenLightbox={onOpenLightbox}
            />
          ))}
      </div>

      {!loading && !loadErr && items.length === 0 ? (
        <p className="works-feed-empty">
          {activeNav === '全部' ? '暂无作品，去个人中心上传吧。' : `「${activeNav}」下暂无带此标签的作品。`}
        </p>
      ) : null}

      {/* 与个人主页一致：未打开时不挂载灯箱，避免 ResizeObserver / 锁滚动等常驻开销 */}
      {lightbox ? <WorksLightbox item={lightboxItem} onClose={closeLightbox} /> : null}
    </div>
  );
}
