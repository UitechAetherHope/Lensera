import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Tilt from 'react-parallax-tilt';
import { deleteWork, likeWork, unlikeWork } from './api/works';
import { authorAvatarSrc } from './utils/authorAvatar';

function apiErrMessage(err) {
  return err?.response?.data?.message || err?.message || '请求失败';
}
import WorksLightbox from './WorksLightbox';
import './WorksTilt.css';

const photoData = [
  { id: 1, title: '城市夜景', desc: '一张极具氛围感的摄影作品', img: 'https://picsum.photos/id/10/400/500' },
  { id: 2, title: '古镇风情', desc: '一张极具氛围感的摄影作品', img: 'https://picsum.photos/id/1015/400/600' },
  { id: 3, title: '花海漫步', desc: '', img: 'https://picsum.photos/id/106/400/450' },
  { id: 4, title: '山间云雾', desc: '', img: 'https://picsum.photos/id/1067/400/550' },
  { id: 5, title: '城市街景', desc: '', img: 'https://picsum.photos/id/1068/400/480' },
  { id: 6, title: '林间晨光', desc: '', img: 'https://picsum.photos/id/1071/400/520' },
  { id: 7, title: '海岸浪花', desc: '', img: 'https://picsum.photos/id/1074/400/460' },
  { id: 8, title: '星空银河', desc: '', img: 'https://picsum.photos/id/1080/400/530' },
  { id: 9, title: '秋日风景', desc: '', img: 'https://picsum.photos/id/1082/400/470' },
  { id: 10, title: '森林秘境', desc: '', img: 'https://picsum.photos/id/1083/400/510' },
];

function HeartIcon({ filled }) {
  return (
    <svg className={`mine-tilt-like-icon${filled ? ' is-filled' : ''}`} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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

/**
 * 个人主页「作品」Tab：接口作品列表 + 点赞；非 apiMode 时为本地演示数据
 * @param {object} props
 * @param {number} props.ownerPublicId
 * @param {string} [props.ownerName]
 * @param {boolean} [props.apiMode]
 * @param {boolean} [props.apiLoading]
 * @param {Array<object>} [props.apiItems]
 * @param {boolean} [props.tokenPresent]
 * @param {boolean} [props.canManageWorks] 当前为本人主页且已登录时可删除作品
 * @param {() => void} [props.onWorkInteract] 点赞后回调（建议仅刷新统计，勿整表重拉）
 * @param {() => void} [props.onWorkDeleted] 删除成功后刷新列表与统计
 * @param {(workId: number) => void} [props.onWorkEdit] 编辑作品
 */
export default function TiltWorksPanel({
  ownerPublicId,
  ownerName = '用户',
  apiMode = false,
  apiLoading = false,
  apiItems = [],
  tokenPresent = false,
  canManageWorks = false,
  onWorkInteract,
  onWorkDeleted,
  onWorkEdit,
}) {
  const navigate = useNavigate();
  const authorHref = `/editor/user/${ownerPublicId}`;

  const [likeBusyId, setLikeBusyId] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [lbTarget, setLbTarget] = useState(null);
  /** 与 props 同步；点赞在本地合并接口返回值，避免父组件整表 refetch 卡顿 */
  const [resolvedApiItems, setResolvedApiItems] = useState(() => apiItems);

  useEffect(() => {
    setResolvedApiItems(apiItems);
  }, [apiItems]);

  const [likeMap, setLikeMap] = useState(() =>
    Object.fromEntries(photoData.map((p) => [p.id, { liked: false, count: 12 + (p.id * 17) % 200 }])),
  );

  const toggleDemoLike = useCallback((id) => {
    setLikeMap((prev) => {
      const cur = prev[id] ?? { liked: false, count: 0 };
      const liked = !cur.liked;
      return { ...prev, [id]: { liked, count: cur.count + (liked ? 1 : -1) } };
    });
  }, []);

  const onApiLikeClick = useCallback(
    async (workId, liked) => {
      if (!tokenPresent) {
        navigate('/login');
        return;
      }
      setLikeBusyId(workId);
      try {
        const next = liked ? await unlikeWork(workId) : await likeWork(workId);
        if (next) {
          setResolvedApiItems((prev) =>
            prev.map((w) =>
              w.workId === workId
                ? { ...w, likeCount: next.likeCount ?? w.likeCount, likedByMe: next.likedByMe }
                : w,
            ),
          );
        }
        onWorkInteract?.();
      } catch {
        /* 忽略 */
      } finally {
        setLikeBusyId(null);
      }
    },
    [tokenPresent, navigate, onWorkInteract],
  );

  const displayName = useMemo(() => ownerName || '用户', [ownerName]);

  const lbItem = useMemo(() => {
    if (!lbTarget) return null;
    if (lbTarget.type === 'api') {
      const w = resolvedApiItems.find((x) => x.workId === lbTarget.workId);
      if (!w) return null;
      const wid = w.workId;
      return {
        id: wid,
        workId: wid,
        tokenPresent,
        imageLarge: w.imageUrl,
        categorySearch: w.category || undefined,
        heading: w.title,
        caption: w.caption || undefined,
        authorName: w.authorName || displayName,
        authorHref,
        avatarUrl: w.authorAvatarUrl || null,
        liked: !!w.likedByMe,
        likeCount: w.likeCount,
        onLikeClick: () => {
          const cur = resolvedApiItems.find((x) => x.workId === wid);
          if (!cur) return;
          void onApiLikeClick(wid, !!cur.likedByMe);
        },
        likeBusy: likeBusyId === wid,
        canDelete: canManageWorks,
        canEdit: canManageWorks && !!onWorkEdit,
        deleteBusy: deleteBusyId === wid,
        onEditClick:
          canManageWorks && onWorkEdit
            ? () => {
                setLbTarget(null);
                onWorkEdit(wid);
              }
            : undefined,
        onDeleteClick:
          canManageWorks
            ? async () => {
                if (!window.confirm('确定删除该作品？删除后无法恢复。')) return;
                setDeleteBusyId(wid);
                try {
                  await deleteWork(wid);
                  setLbTarget(null);
                  onWorkDeleted?.();
                } catch (e) {
                  window.alert(apiErrMessage(e));
                } finally {
                  setDeleteBusyId(null);
                }
              }
            : undefined,
      };
    }
    const photo = photoData.find((p) => p.id === lbTarget.id);
    if (!photo) return null;
    const like = likeMap[photo.id] ?? { liked: false, count: 0 };
    const pid = photo.id;
    return {
      id: pid,
      imageLarge: photo.img,
      heading: photo.title,
      caption: photo.desc || undefined,
      authorName: displayName,
      authorHref,
      avatarUrl: `https://picsum.photos/seed/u${ownerPublicId}/96/96`,
      liked: like.liked,
      likeCount: like.count,
      onLikeClick: () => toggleDemoLike(pid),
    };
  }, [
    lbTarget,
    resolvedApiItems,
    authorHref,
    displayName,
    likeMap,
    likeBusyId,
    deleteBusyId,
    canManageWorks,
    onApiLikeClick,
    ownerPublicId,
    toggleDemoLike,
    onWorkDeleted,
    onWorkEdit,
    tokenPresent,
  ]);

  const lightbox = <WorksLightbox item={lbItem} onClose={() => setLbTarget(null)} />;

  if (apiMode) {
    if (apiLoading) {
      return (
        <>
          <div className="mine-tilt-works-root">
            <div className="mine-tilt-state mine-tilt-state--loading">加载作品中…</div>
          </div>
          {lightbox}
        </>
      );
    }
    if (!resolvedApiItems.length) {
      return (
        <>
          <div className="mine-tilt-works-root">
            <div className="mine-tilt-state mine-tilt-state--empty">暂无作品，点击「上传作品」发布第一张吧</div>
          </div>
          {lightbox}
        </>
      );
    }
    return (
      <>
        <div className="mine-tilt-works-root">
          <div className="works-grid-works">
            {resolvedApiItems.map((w) => {
              const liked = !!w.likedByMe;
              const busy = likeBusyId === w.workId;
              return (
                <Tilt
                  key={w.workId}
                  className="photo-tilt-works"
                  glareEnable
                  glareColor="#6366f1"
                  glareMaxOpacity={0.2}
                  tiltMaxAngleX={6}
                  tiltMaxAngleY={6}
                  scale={1.02}
                >
                  <div className="photo-card-works">
                    <div
                      className="mine-tilt-media-zoom"
                      role="button"
                      tabIndex={0}
                      aria-label={`放大查看 ${w.title}`}
                      onClick={() => setLbTarget({ type: 'api', workId: w.workId })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setLbTarget({ type: 'api', workId: w.workId });
                        }
                      }}
                    >
                      <img
                        src={w.thumbnailUrl || w.imageUrl}
                        alt={w.title}
                        className="card-img-works"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="card-info-works">
                      <h4 className="card-title-works">{w.title}</h4>
                      {w.caption && <p className="card-desc-works">{w.caption}</p>}
                      <div className="mine-tilt-card-foot">
                        <div className="mine-tilt-card-foot-left">
                          <Link
                            to={authorHref}
                            className="mine-tilt-author"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`${displayName}，公开用户号 ${w.authorPublicId ?? ownerPublicId}`}
                          >
                            <span className="mine-tilt-avatar-ring">
                              <img
                                src={authorAvatarSrc(w.authorAvatarUrl, w.authorName || displayName)}
                                alt=""
                                className="mine-tilt-avatar"
                              />
                            </span>
                            <span className="mine-tilt-author-text-col">
                              <span className="mine-tilt-author-name">{w.authorName || displayName}</span>
                              {w.authorPublicId != null ? (
                                <span className="mine-tilt-public-id" title="公开用户号">
                                  {w.authorPublicId}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                          {w.category ? (
                            <Link
                              to={{ pathname: '/editor/works', search: `?cat=${encodeURIComponent(w.category)}` }}
                              className="mine-tilt-cat"
                              onClick={(e) => e.stopPropagation()}
                            >
                              #{w.category}
                            </Link>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className={`mine-tilt-like${liked ? ' is-liked' : ''}`}
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            onApiLikeClick(w.workId, liked);
                          }}
                          aria-pressed={liked}
                        >
                          <HeartIcon filled={liked} />
                          <span className="mine-tilt-like-count">{w.likeCount}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </Tilt>
              );
            })}
          </div>
        </div>
        {lightbox}
      </>
    );
  }

  return (
    <>
      <div className="mine-tilt-works-root">
        <div className="works-grid-works">
          {photoData.map((photo) => {
            const like = likeMap[photo.id] ?? { liked: false, count: 0 };
            return (
              <Tilt
                key={photo.id}
                className="photo-tilt-works"
                glareEnable
                glareColor="#6366f1"
                glareMaxOpacity={0.2}
                tiltMaxAngleX={6}
                tiltMaxAngleY={6}
                scale={1.02}
              >
                <div className="photo-card-works">
                  <div
                    className="mine-tilt-media-zoom"
                    role="button"
                    tabIndex={0}
                    aria-label={`放大查看 ${photo.title}`}
                    onClick={() => setLbTarget({ type: 'demo', id: photo.id })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setLbTarget({ type: 'demo', id: photo.id });
                      }
                    }}
                  >
                    <img src={photo.img} alt={photo.title} className="card-img-works" />
                  </div>
                  <div className="card-info-works">
                    <h4 className="card-title-works">{photo.title}</h4>
                    {photo.desc && <p className="card-desc-works">{photo.desc}</p>}
                    <div className="mine-tilt-card-foot">
                      <Link to={authorHref} className="mine-tilt-author" onClick={(e) => e.stopPropagation()}>
                        <span className="mine-tilt-avatar-ring">
                          <img src={`https://picsum.photos/seed/u${ownerPublicId}/40/40`} alt="" className="mine-tilt-avatar" />
                        </span>
                        <span className="mine-tilt-author-name">{displayName}</span>
                      </Link>
                      <button
                        type="button"
                        className={`mine-tilt-like${like.liked ? ' is-liked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDemoLike(photo.id);
                        }}
                        aria-pressed={like.liked}
                      >
                        <HeartIcon filled={like.liked} />
                        <span className="mine-tilt-like-count">{like.count}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Tilt>
            );
          })}
        </div>
      </div>
      {lightbox}
    </>
  );
}
