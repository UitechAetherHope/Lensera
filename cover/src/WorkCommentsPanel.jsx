import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  deleteWorkComment,
  fetchWorkComments,
  likeWorkComment,
  postWorkComment,
  unlikeWorkComment,
} from './api/workComments';
import { readStoredUser } from './api/auth';
import { authorAvatarSrc } from './utils/authorAvatar';
import { getMineProfilePath } from './utils/blogRoutes';

function apiErrMessage(err) {
  return err?.response?.data?.message || err?.message || '操作失败';
}

const CTX_MENU_W = 108;
const CTX_MENU_H = 40;

/** 菜单挂到 body，按视口边界约束，避免贴边被裁切 */
function clampCtxMenuPosition(clientX, clientY) {
  const pad = 8;
  const maxX = Math.max(pad, window.innerWidth - CTX_MENU_W - pad);
  const maxY = Math.max(pad, window.innerHeight - CTX_MENU_H - pad);
  return {
    x: Math.max(pad, Math.min(clientX, maxX)),
    y: Math.max(pad, Math.min(clientY, maxY)),
  };
}

function formatTime(epochMs) {
  if (!epochMs) return '';
  const diff = Date.now() - epochMs;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}天前`;
  const d = new Date(epochMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function CommentHeart({ filled }) {
  return (
    <svg className={`wc-like-icon${filled ? ' is-filled' : ''}`} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={filled ? 0 : 1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * @param {{
 *   workId: number|string,
 *   tokenPresent?: boolean,
 * }} props
 */
export default function WorkCommentsPanel({ workId, tokenPresent = false }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likeBusyId, setLikeBusyId] = useState(null);
  /** @type {[null|{ commentId: number, authorName: string, rootId: number }]} */
  const [replyTo, setReplyTo] = useState(null);
  const [expandedRoots, setExpandedRoots] = useState(() => new Set());
  /** @type {[{ x: number, y: number, commentId: number } | null]} */
  const [ctxMenu, setCtxMenu] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    if (!workId) return;
    setLoading(true);
    setErr('');
    try {
      const list = await fetchWorkComments(workId);
      setComments(Array.isArray(list) ? list : []);
      setExpandedRoots(new Set());
    } catch (e) {
      setComments([]);
      setErr(apiErrMessage(e));
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!ctxMenu) return undefined;
    const close = () => setCtxMenu(null);
    const onPointerDown = (e) => {
      if (e.target instanceof Element && e.target.closest('.wc-context-menu')) return;
      close();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('mousedown', onPointerDown, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [ctxMenu]);

  const patchCommentInTree = useCallback((commentId, patch) => {
    const apply = (node) => {
      if (node.commentId === commentId) {
        return { ...node, ...patch };
      }
      if (node.replies?.length) {
        return { ...node, replies: node.replies.map(apply) };
      }
      return node;
    };
    setComments((prev) => prev.map(apply));
  }, []);

  const onLike = useCallback(
    async (commentId, liked) => {
      if (!tokenPresent) {
        window.alert('请先登录后再点赞');
        return;
      }
      setLikeBusyId(commentId);
      try {
        const updated = liked
          ? await unlikeWorkComment(workId, commentId)
          : await likeWorkComment(workId, commentId);
        if (updated) {
          patchCommentInTree(commentId, {
            likeCount: updated.likeCount,
            likedByMe: !!updated.likedByMe,
          });
        }
      } catch (e) {
        window.alert(apiErrMessage(e));
      } finally {
        setLikeBusyId(null);
      }
    },
    [workId, tokenPresent, patchCommentInTree],
  );

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!tokenPresent) {
        window.alert('请先登录后再评论');
        return;
      }
      const content = draft.trim();
      if (!content) return;
      setSubmitting(true);
      setErr('');
      try {
        await postWorkComment(workId, {
          content,
          parentId: replyTo?.commentId ?? null,
        });
        setDraft('');
        setReplyTo(null);
        await load();
        if (replyTo?.rootId) {
          setExpandedRoots((prev) => new Set(prev).add(replyTo.rootId));
        }
      } catch (ex) {
        setErr(apiErrMessage(ex));
      } finally {
        setSubmitting(false);
      }
    },
    [draft, workId, tokenPresent, replyTo, load],
  );

  const me = readStoredUser();

  const isMineComment = useCallback(
    (c) => tokenPresent && me?.publicId != null && String(c.authorPublicId) === String(me.publicId),
    [tokenPresent, me?.publicId],
  );

  const onDeleteComment = useCallback(
    async (commentId) => {
      if (!window.confirm('确定删除这条评论？')) return;
      setCtxMenu(null);
      setDeleteBusyId(commentId);
      try {
        await deleteWorkComment(workId, commentId);
        if (replyTo?.commentId === commentId) setReplyTo(null);
        await load();
      } catch (e) {
        window.alert(apiErrMessage(e));
      } finally {
        setDeleteBusyId(null);
      }
    },
    [workId, replyTo, load],
  );

  const openCtxMenu = useCallback((e, commentId) => {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = clampCtxMenuPosition(e.clientX, e.clientY);
    setCtxMenu({ x, y, commentId });
  }, []);

  const toggleReplies = useCallback((rootId) => {
    setExpandedRoots((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }, []);

  const totalCount = comments.reduce((n, r) => n + 1 + (r.replies?.length ?? 0), 0);

  const renderReplyTarget = (reply) => {
    if (!reply.replyToAuthorName) return null;
    return (
      <span className="wc-reply-to">
        回复 <span className="wc-reply-to-name">@{reply.replyToAuthorName}</span>
        {' · '}
      </span>
    );
  };

  const renderCommentRow = (c, { isReply = false } = {}) => {
    const profilePath = getMineProfilePath(c.authorPublicId);
    const avatar = authorAvatarSrc(c.authorAvatarUrl, c.authorName);
    const liked = !!c.likedByMe;
    const mine = isMineComment(c);
    const deleting = deleteBusyId === c.commentId;

    return (
      <div
        key={c.commentId}
        className={`wc-item${isReply ? ' wc-item--reply' : ''}${mine ? ' wc-item--mine' : ''}${deleting ? ' wc-item--deleting' : ''}`}
        onContextMenu={mine ? (e) => openCtxMenu(e, c.commentId) : undefined}
      >
        <Link to={profilePath} className="wc-avatar-link" onClick={(e) => e.stopPropagation()}>
          <img src={avatar} alt="" className="wc-avatar" />
        </Link>
        <div className="wc-body">
          <div className="wc-meta">
            <Link to={profilePath} className="wc-author" onClick={(e) => e.stopPropagation()}>
              {c.authorName}
            </Link>
            <span className="wc-time">{formatTime(c.createdAtEpochMs)}</span>
          </div>
          <p className="wc-text">
            {isReply ? renderReplyTarget(c) : null}
            {c.body}
          </p>
          <div className="wc-actions">
            <button
              type="button"
              className={`wc-like-btn${liked ? ' is-liked' : ''}`}
              disabled={likeBusyId === c.commentId}
              onClick={() => void onLike(c.commentId, liked)}
              aria-pressed={liked}
            >
              <CommentHeart filled={liked} />
              {c.likeCount > 0 ? <span>{c.likeCount}</span> : null}
            </button>
            {tokenPresent ? (
              <button
                type="button"
                className="wc-reply-btn"
                onClick={() =>
                  setReplyTo({
                    commentId: c.commentId,
                    authorName: c.authorName,
                    rootId: c.rootId ?? c.commentId,
                  })
                }
              >
                回复
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderRoot = (root) => {
    const replyCount = root.replies?.length ?? 0;
    const expanded = expandedRoots.has(root.commentId);

    return (
      <div key={root.commentId} className="wc-thread">
        {renderCommentRow(root, { isReply: false })}
        {replyCount > 0 && !expanded ? (
          <button type="button" className="wc-expand-replies" onClick={() => toggleReplies(root.commentId)}>
            —— 展开 {replyCount} 条回复
          </button>
        ) : null}
        {replyCount > 0 && expanded ? (
          <div className="wc-replies">
            {root.replies.map((r) => renderCommentRow(r, { isReply: true }))}
            <button type="button" className="wc-collapse-replies" onClick={() => toggleReplies(root.commentId)}>
              收起回复
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const placeholder = replyTo
    ? `回复 @${replyTo.authorName}`
    : tokenPresent
      ? '说点什么…'
      : '登录后参与评论';

  return (
    <section ref={panelRef} className="wc-panel" aria-label="评论区">
      <h3 className="wc-title">评论 {totalCount > 0 ? `(${totalCount})` : ''}</h3>

      {loading && <p className="wc-hint">加载评论…</p>}
      {!loading && err && (
        <p className="wc-hint wc-hint--err" role="alert">
          {err}
        </p>
      )}

      <div className="wc-list">
        {!loading && !err && comments.length === 0 ? (
          <p className="wc-hint">暂无评论，来抢沙发吧</p>
        ) : null}
        {!loading && comments.map(renderRoot)}
      </div>

      <form className="wc-compose" onSubmit={onSubmit}>
        {replyTo ? (
          <div className="wc-compose-replying">
            <span>正在回复 @{replyTo.authorName}</span>
            <button type="button" className="wc-compose-cancel" onClick={() => setReplyTo(null)}>
              取消
            </button>
          </div>
        ) : null}
        <div className="wc-compose-row">
          {tokenPresent && me ? (
            <img
              src={authorAvatarSrc(null, me.userName)}
              alt=""
              className="wc-compose-avatar"
            />
          ) : null}
          <textarea
            className="wc-input"
            rows={2}
            value={draft}
            placeholder={placeholder}
            disabled={!tokenPresent || submitting}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <button type="submit" className="wc-submit" disabled={!tokenPresent || submitting || !draft.trim()}>
          {submitting ? '发送中…' : '发送'}
        </button>
      </form>

      {ctxMenu
        ? createPortal(
            <div
              className="wc-context-menu"
              style={{ left: ctxMenu.x, top: ctxMenu.y }}
              role="menu"
              onMouseDown={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <button
                type="button"
                role="menuitem"
                className="wc-context-menu-item wc-context-menu-item--danger"
                disabled={deleteBusyId != null}
                onClick={() => void onDeleteComment(ctxMenu.commentId)}
              >
                删除评论
              </button>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
