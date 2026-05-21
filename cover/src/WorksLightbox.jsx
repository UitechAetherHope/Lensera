import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authorAvatarSrc } from './utils/authorAvatar';
import { downloadWorkWithWatermark } from './utils/downloadWorkWithWatermark';
import WorkCommentsPanel from './WorkCommentsPanel';
import './Works.css';

const LB_CLOSE_MS = 500;
/** 左栏尺寸变化小于此阈值时不重算 fit，避免点赞等侧栏微动触发「宽/高」模式来回切 */
const LB_BOX_EPS_PX = 10;

function computeLightboxFit(naturalW, naturalH, boxW, boxH) {
  if (!naturalW || !naturalH || !boxW || !boxH) return 'height';
  const imgAspect = naturalW / naturalH;
  const boxAspect = boxW / boxH;
  return imgAspect > boxAspect ? 'width' : 'height';
}

function DownloadIcon() {
  return (
    <svg className="works-download-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 3v10m0 0l4-4m-4 4L8 9M5 19h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

/**
 * 左栏大图：按图片与可视区宽高比自动选择「宽占满高自适应」或「高占满宽自适应」。
 * 重算仅在左栏尺寸明显变化时进行（窗口缩放、横竖布局切换），忽略点赞等引起的亚像素抖动。
 */
export default function WorksLightbox({ item, onClose }) {
  const [visible, setVisible] = useState(false);
  const [lbFit, setLbFit] = useState('height');
  const [downloading, setDownloading] = useState(false);
  const closeTimerRef = useRef(null);
  const visualRef = useRef(null);
  const imgRef = useRef(null);
  const committedBoxRef = useRef({ w: 0, h: 0 });
  const rafFitRef = useRef(0);

  const finishClose = useCallback(() => {
    setVisible(false);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, LB_CLOSE_MS);
  }, [onClose]);

  const scheduleUpdateLightboxFit = useCallback((opts = {}) => {
    const force = opts.force === true;
    if (rafFitRef.current) cancelAnimationFrame(rafFitRef.current);
    rafFitRef.current = requestAnimationFrame(() => {
      rafFitRef.current = 0;
      const el = visualRef.current;
      const img = imgRef.current;
      if (!el || !img?.naturalWidth) return;
      const { width: cw, height: ch } = el.getBoundingClientRect();
      if (cw < 2 || ch < 2) return;
      const prev = committedBoxRef.current;
      const bigChange =
        !prev.w ||
        Math.abs(cw - prev.w) > LB_BOX_EPS_PX ||
        Math.abs(ch - prev.h) > LB_BOX_EPS_PX;
      if (!force && !bigChange) return;
      const next = computeLightboxFit(img.naturalWidth, img.naturalHeight, cw, ch);
      committedBoxRef.current = { w: cw, h: ch };
      setLbFit(next);
    });
  }, []);

  useEffect(() => {
    if (!item) {
      setVisible(false);
      return undefined;
    }
    setVisible(false);
    committedBoxRef.current = { w: 0, h: 0 };
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setVisible(true));
    });
    return () => window.cancelAnimationFrame(id);
    // 只用大图 URL：点赞会换新 item 引用，不应重跑开场动画或清空 committed
  }, [item?.imageLarge]);

  useLayoutEffect(() => {
    if (!item || !visible) return undefined;
    scheduleUpdateLightboxFit();
    return undefined;
  }, [item?.imageLarge, visible, scheduleUpdateLightboxFit]);

  useEffect(() => {
    if (!item) return undefined;
    const el = visualRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => scheduleUpdateLightboxFit());
    ro.observe(el);
    const onWinResize = () => scheduleUpdateLightboxFit({ force: true });
    window.addEventListener('resize', onWinResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
    };
  }, [item?.imageLarge, scheduleUpdateLightboxFit]);

  useEffect(() => {
    if (!item) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') finishClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [item?.imageLarge, finishClose]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (rafFitRef.current) cancelAnimationFrame(rafFitRef.current);
    },
    [],
  );

  const handleDownload = useCallback(async () => {
    if (!item?.imageLarge || downloading) return;
    setDownloading(true);
    try {
      await downloadWorkWithWatermark(item.imageLarge, {
        filename: item.heading || `work-${item.id ?? 'image'}`,
      });
    } catch (e) {
      window.alert(e?.message || '下载失败，请稍后重试');
    } finally {
      setDownloading(false);
    }
  }, [item?.imageLarge, item?.heading, item?.id, downloading]);

  if (!item) return null;

  const avatarSrc = authorAvatarSrc(item.avatarUrl, item.authorName);
  const showFoot =
    !!item.imageLarge ||
    item.onLikeClick != null ||
    item.canEdit ||
    item.canDelete;

  const fitHeight = lbFit === 'height';

  return (
    <div
      className={`works-lightbox-backdrop${visible ? ' is-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="works-lightbox-heading"
      onClick={finishClose}
    >
      <div className="works-lightbox-dialog" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="works-lightbox-close" aria-label="关闭预览" onClick={finishClose}>
          ×
        </button>
        <div className="works-lightbox-body">
          <div
            ref={visualRef}
            className={`works-lightbox-visual works-lightbox-visual--fit-${fitHeight ? 'height' : 'width'}`}
          >
            <img
              ref={imgRef}
              key={item.imageLarge}
              src={item.imageLarge}
              alt=""
              className={`works-lightbox-img works-lightbox-img--fit-${fitHeight ? 'height' : 'width'}`}
              onLoad={scheduleUpdateLightboxFit}
            />
          </div>
          <aside className="works-lightbox-aside">
            <div className="works-lightbox-aside-head">
            {item.categorySearch ? (
              <Link
                to={{ pathname: '/editor/works', search: `?cat=${encodeURIComponent(item.categorySearch)}` }}
                className="works-lightbox-eyebrow works-lightbox-eyebrow-link"
                onClick={(e) => e.stopPropagation()}
              >
                #{item.categorySearch}
              </Link>
            ) : item.eyebrow ? (
              <p className="works-lightbox-eyebrow">{item.eyebrow}</p>
            ) : null}
            <h2 id="works-lightbox-heading" className="works-lightbox-title">
              {item.heading}
            </h2>
            {item.authorHref && item.authorName ? (
              <Link to={item.authorHref} className="works-lightbox-author works-tile-author-link">
                <span className="works-lightbox-avatar-ring">
                  <img src={avatarSrc} alt="" className="works-lightbox-avatar" />
                </span>
                <div className="works-lightbox-author-text">
                  <span className="works-lightbox-author-label">作者</span>
                  <span className="works-lightbox-author-name">{item.authorName}</span>
                </div>
              </Link>
            ) : null}
            {item.caption ? <p className="works-lightbox-caption">{item.caption}</p> : null}
            </div>
            {item.workId != null ? (
              <WorkCommentsPanel workId={item.workId} tokenPresent={!!item.tokenPresent} />
            ) : null}
            {showFoot ? (
              <div className="works-lightbox-aside-foot works-lightbox-aside-foot--bar">
                <div className="works-lightbox-aside-foot-start">
                  {item.onLikeClick != null ? (
                    <button
                      type="button"
                      className={`works-tile-like${item.liked ? ' is-liked' : ''}`}
                      onClick={() => item.onLikeClick?.()}
                      disabled={item.likeBusy}
                      aria-pressed={item.liked}
                      aria-label={item.liked ? '取消点赞' : '点赞'}
                    >
                      <HeartIcon filled={!!item.liked} />
                      <span className="works-tile-like-count">{item.likeCount ?? 0}</span>
                    </button>
                  ) : null}
                </div>
                <div className="works-lightbox-aside-foot-end">
                  {item.canEdit && item.onEditClick ? (
                    <button
                      type="button"
                      className="works-lightbox-edit-btn"
                      onClick={() => item.onEditClick?.()}
                    >
                      编辑
                    </button>
                  ) : null}
                  {item.canDelete && item.onDeleteClick ? (
                    <button
                      type="button"
                      className="works-lightbox-delete-btn"
                      disabled={item.deleteBusy}
                      onClick={() => {
                        void item.onDeleteClick?.();
                      }}
                    >
                      {item.deleteBusy ? '删除中…' : '删除'}
                    </button>
                  ) : null}
                  {item.imageLarge ? (
                    <button
                      type="button"
                      className="works-lightbox-download-btn"
                      disabled={downloading}
                      aria-label="下载带水印的作品图"
                      onClick={() => void handleDownload()}
                    >
                      <DownloadIcon />
                      <span>{downloading ? '处理中…' : '下载'}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
