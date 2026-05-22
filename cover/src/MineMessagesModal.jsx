import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyMessages } from './api/inbox';
import { authorAvatarSrc } from './utils/authorAvatar';
import './MineMessagesModal.css';

function apiErrMessage(err) {
  return err?.response?.data?.message || err?.message || '请求失败';
}

function formatWhen(epochMs) {
  const ms = Number(epochMs) || 0;
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function MineMessagesModal({ open, onClose }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchMyMessages();
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setItems([]);
      setError(apiErrMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onOpenTarget = useCallback(
    (msg) => {
      if (!msg) return;
      onClose();
      if (msg.kind === 'blog' && msg.targetId != null) {
        navigate(`/editor/blog/${msg.targetId}`);
        return;
      }
      if (msg.kind === 'work' && msg.targetId != null) {
        navigate(`/editor/works?work=${msg.targetId}`);
      }
    },
    [navigate, onClose],
  );

  if (!open) return null;

  return (
    <div className="mine-msg-overlay" role="presentation" onClick={onClose}>
      <div
        className="mine-msg-panel"
        role="dialog"
        aria-labelledby="mine-msg-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mine-msg-header">
          <h3 id="mine-msg-title">消息</h3>
          <button type="button" className="mine-msg-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <p className="mine-msg-hint">他人在你的作品与博客下的留言，点击可跳转查看</p>
        {loading && <div className="mine-msg-state">加载中…</div>}
        {error && !loading && (
          <div className="mine-msg-state mine-msg-state--error" role="alert">
            {error}
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="mine-msg-state">暂无新留言</div>
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="mine-msg-list">
            {items.map((msg) => {
              const kindLabel = msg.kind === 'blog' ? '博客' : '作品';
              const key = `${msg.kind}-${msg.commentId}`;
              return (
                <li key={key}>
                  <button type="button" className="mine-msg-item" onClick={() => onOpenTarget(msg)}>
                    <div className="mine-msg-item__thumb">
                      {msg.targetImageUrl ? (
                        <img src={msg.targetImageUrl} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="mine-msg-item__thumb-ph">{kindLabel}</span>
                      )}
                      <span className={`mine-msg-kind mine-msg-kind--${msg.kind}`}>{kindLabel}</span>
                    </div>
                    <div className="mine-msg-item__body">
                      <div className="mine-msg-item__top">
                        <img
                          src={authorAvatarSrc(msg.authorAvatarUrl, msg.authorName)}
                          alt=""
                          className="mine-msg-avatar"
                        />
                        <span className="mine-msg-author">{msg.authorName || '用户'}</span>
                        <span className="mine-msg-time">{formatWhen(msg.createdAtEpochMs)}</span>
                      </div>
                      <p className="mine-msg-target" title={msg.targetTitle}>
                        {msg.targetTitle || (msg.kind === 'blog' ? '博客' : '作品')}
                      </p>
                      <p className="mine-msg-preview">{msg.bodyPreview}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
