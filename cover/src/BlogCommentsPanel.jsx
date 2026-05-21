import { CommentDiscussionIcon } from '@primer/octicons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  deleteBlogComment,
  fetchBlogComments,
  likeBlogComment,
  postBlogComment,
  unlikeBlogComment,
} from './api/blogComments';
import { readStoredUser } from './api/auth';
import { authorAvatarSrc } from './utils/authorAvatar';
import { getMineProfilePath } from './utils/blogRoutes';

function apiErrMessage(err) {
  return err?.response?.data?.message || err?.message || '操作失败';
}

const CTX_MENU_W = 108;
const CTX_MENU_H = 40;

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
    <svg className={`bc-like-icon${filled ? ' is-filled' : ''}`} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
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

/** @param {Array<{ id: string, author: string, content: string }>} list */
function mapLocalComments(list) {
  return (list ?? []).map((item, index) => ({
    commentId: item.id ?? `local-${index}`,
    parentId: null,
    rootId: item.id ?? `local-${index}`,
    authorPublicId: null,
    authorName: item.author ?? '用户',
    authorAvatarUrl: null,
    replyToAuthorName: null,
    body: item.content ?? '',
    likeCount: 0,
    likedByMe: false,
    createdAtEpochMs: Date.now(),
    replies: [],
  }));
}

/**
 * 博客文章评论区（文章末尾内联，与作品评论能力对齐）
 * @param {{
 *   blogId?: number|string|null,
 *   tokenPresent?: boolean,
 *   localComments?: Array<{ id: string, author: string, content: string }>,
 *   onLocalCommentAdd?: (content: string) => void,
 *   onCountChange?: (count: number) => void,
 * }} props
 */
export default function BlogCommentsPanel({
  blogId = null,
  tokenPresent = false,
  localComments = [],
  onLocalCommentAdd,
  onCountChange,
}) {
  const normalizedBlogId =
    blogId != null && blogId !== '' ? String(blogId).replace(/^p-/, '') : '';
  const apiMode = normalizedBlogId !== '' && /^\d+$/.test(normalizedBlogId);
  const sectionRef = useRef(null);
  const inputRef = useRef(null);

  const [comments, setComments] = useState(() => (apiMode ? [] : mapLocalComments(localComments)));
  const [loading, setLoading] = useState(apiMode);
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likeBusyId, setLikeBusyId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [expandedRoots, setExpandedRoots] = useState(() => new Set());
  const [ctxMenu, setCtxMenu] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!apiMode) return;
    setLoading(true);
    setErr('');
    try {
      const list = await fetchBlogComments(normalizedBlogId);
      setComments(Array.isArray(list) ? list : []);
      setExpandedRoots(new Set());
    } catch (e) {
      setComments([]);
      setErr(apiErrMessage(e));
    } finally {
      setLoading(false);
    }
  }, [apiMode, normalizedBlogId]);

  useEffect(() => {
    if (apiMode) void load();
  }, [apiMode, load]);

  useEffect(() => {
    if (!apiMode) {
      setComments(mapLocalComments(localComments));
    }
  }, [apiMode, localComments]);

  const totalCount = comments.reduce((n, r) => n + 1 + (r.replies?.length ?? 0), 0);

  useEffect(() => {
    onCountChange?.(totalCount);
  }, [totalCount, onCountChange]);

  useEffect(() => {
    if (!ctxMenu) return undefined;
    const close = () => setCtxMenu(null);
    const onPointerDown = (e) => {
      if (e.target instanceof Element && e.target.closest('.bc-context-menu')) return;
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
      if (!apiMode) return;
      if (!tokenPresent) {
        window.alert('请先登录后再点赞');
        return;
      }
      setLikeBusyId(commentId);
      try {
        const updated = liked
          ? await unlikeBlogComment(normalizedBlogId, commentId)
          : await likeBlogComment(normalizedBlogId, commentId);
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
    [apiMode, normalizedBlogId, tokenPresent, patchCommentInTree],
  );

  const me = readStoredUser();

  const isMineComment = useCallback(
    (c) => apiMode && tokenPresent && me?.publicId != null && String(c.authorPublicId) === String(me.publicId),
    [apiMode, tokenPresent, me?.publicId],
  );

  const onDeleteComment = useCallback(
    async (commentId) => {
      if (!apiMode) return;
      if (!window.confirm('确定删除这条评论？')) return;
      setCtxMenu(null);
      setDeleteBusyId(commentId);
      try {
        await deleteBlogComment(normalizedBlogId, commentId);
        if (replyTo?.commentId === commentId) setReplyTo(null);
        await load();
      } catch (e) {
        window.alert(apiErrMessage(e));
      } finally {
        setDeleteBusyId(null);
      }
    },
    [apiMode, normalizedBlogId, replyTo, load],
  );

  const openCtxMenu = useCallback((e, commentId) => {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = clampCtxMenuPosition(e.clientX, e.clientY);
    setCtxMenu({ x, y, commentId });
  }, []);

  const startReply = useCallback((replyTarget) => {
    setReplyTo(replyTarget);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const content = draft.trim();
      if (!content) return;

      if (!apiMode) {
        onLocalCommentAdd?.(content);
        setDraft('');
        setReplyTo(null);
        return;
      }

      if (!tokenPresent) {
        window.alert('请先登录后再评论');
        return;
      }

      setSubmitting(true);
      setErr('');
      try {
        await postBlogComment(normalizedBlogId, {
          content,
          parentId: replyTo?.commentId ?? null,
        });
        setDraft('');
        const expandRoot = replyTo?.rootId;
        setReplyTo(null);
        await load();
        if (expandRoot) {
          setExpandedRoots((prev) => new Set(prev).add(expandRoot));
        }
      } catch (ex) {
        const msg = apiErrMessage(ex);
        setErr(msg);
        window.alert(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [draft, apiMode, normalizedBlogId, tokenPresent, replyTo, load, onLocalCommentAdd],
  );

  const toggleReplies = useCallback((rootId) => {
    setExpandedRoots((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }, []);

  const placeholder = replyTo
    ? `回复 @${replyTo.authorName}…`
    : tokenPresent || !apiMode
      ? '写下评论…'
      : '登录后参与评论';

  const renderReplyTarget = (reply) => {
    if (!reply.replyToAuthorName) return null;
    return (
      <span className="bc-reply-to">
        回复 <span className="bc-reply-to-name">@{reply.replyToAuthorName}</span>
        {' · '}
      </span>
    );
  };

  const renderCommentRow = (c, { isReply = false } = {}) => {
    const profilePath = c.authorPublicId ? getMineProfilePath(c.authorPublicId) : null;
    const avatar = authorAvatarSrc(c.authorAvatarUrl, c.authorName);
    const liked = !!c.likedByMe;
    const mine = isMineComment(c);
    const deleting = deleteBusyId === c.commentId;

    const avatarNode = profilePath ? (
      <Link to={profilePath} className="bc-avatar-link" onClick={(e) => e.stopPropagation()}>
        <img src={avatar} alt="" className="bc-avatar" />
      </Link>
    ) : (
      <span className="bc-avatar-link">
        <img src={avatar} alt="" className="bc-avatar" />
      </span>
    );

    const authorNode = profilePath ? (
      <Link to={profilePath} className="bc-author" onClick={(e) => e.stopPropagation()}>
        {c.authorName}
      </Link>
    ) : (
      <span className="bc-author">{c.authorName}</span>
    );

    return (
      <div
        key={c.commentId}
        className={`bc-item${isReply ? ' bc-item--reply' : ''}${mine ? ' bc-item--mine' : ''}${deleting ? ' bc-item--deleting' : ''}`}
        onContextMenu={mine ? (e) => openCtxMenu(e, c.commentId) : undefined}
      >
        {avatarNode}
        <div className="bc-body">
          <div className="bc-meta">
            {authorNode}
            {apiMode && c.createdAtEpochMs ? (
              <span className="bc-time">{formatTime(c.createdAtEpochMs)}</span>
            ) : null}
          </div>
          <p className="bc-text">
            {isReply ? renderReplyTarget(c) : null}
            {c.body}
          </p>
          {apiMode ? (
            <div className="bc-actions">
              <button
                type="button"
                className={`bc-like-btn${liked ? ' is-liked' : ''}`}
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
                  className="bc-reply-btn"
                  onClick={() =>
                    startReply({
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
          ) : null}
        </div>
      </div>
    );
  };

  const renderRoot = (root) => {
    const replyCount = root.replies?.length ?? 0;
    const expanded = expandedRoots.has(root.commentId);

    return (
      <div key={root.commentId} className="bc-thread">
        {renderCommentRow(root, { isReply: false })}
        {replyCount > 0 && !expanded ? (
          <button type="button" className="bc-expand-replies" onClick={() => toggleReplies(root.commentId)}>
            —— 展开 {replyCount} 条回复
          </button>
        ) : null}
        {replyCount > 0 && expanded ? (
          <div className="bc-replies">
            {root.replies.map((r) => renderCommentRow(r, { isReply: true }))}
            <button type="button" className="bc-collapse-replies" onClick={() => toggleReplies(root.commentId)}>
              收起回复
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <section
        ref={sectionRef}
        className="blog-article__comments"
        id="article-comments"
        aria-label="评论区"
      >
        <h2>
          <CommentDiscussionIcon size={16} />
          评论 {totalCount > 0 ? `(${totalCount})` : ''}
        </h2>

        {loading && <p className="bc-hint">加载评论…</p>}
        {!loading && err && (
          <p className="bc-hint bc-hint--err" role="alert">
            {err}
          </p>
        )}

        <div className="blog-article__comment-list bc-list">
          {!loading && !err && comments.length === 0 ? (
            <p className="bc-hint">暂无评论，来抢沙发吧</p>
          ) : null}
          {!loading && comments.map(renderRoot)}
        </div>

        <form className="blog-article__comment-form" onSubmit={onSubmit}>
          {replyTo ? (
            <p className="bc-reply-hint">
              正在回复 @{replyTo.authorName}
              <button type="button" className="bc-reply-hint-cancel" onClick={() => setReplyTo(null)}>
                取消
              </button>
            </p>
          ) : null}
          <textarea
            ref={inputRef}
            value={draft}
            placeholder={placeholder}
            rows={3}
            disabled={apiMode ? !tokenPresent || submitting : submitting}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="submit"
            className="blog-article__comment-submit"
            disabled={(apiMode && !tokenPresent) || submitting || !draft.trim()}
          >
            {submitting ? '发送中…' : '发布'}
          </button>
        </form>
      </section>

      {ctxMenu
        ? createPortal(
            <div
              className="bc-context-menu"
              style={{ left: ctxMenu.x, top: ctxMenu.y }}
              role="menu"
              onMouseDown={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <button
                type="button"
                role="menuitem"
                className="bc-context-menu-item bc-context-menu-item--danger"
                disabled={deleteBusyId != null}
                onClick={() => void onDeleteComment(ctxMenu.commentId)}
              >
                删除评论
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
