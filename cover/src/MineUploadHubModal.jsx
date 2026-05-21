import { useCallback, useEffect, useState } from 'react';
import MineBlogPublishModal from './MineBlogPublishModal';
import MineWorkUploadModal from './MineWorkUploadModal';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onWorkSuccess?: (opts?: { waitForAiTag?: boolean }) => void,
 *   onBlogSuccess?: () => void,
 *   initialTab?: 'works' | 'blog',
 *   editBlogId?: number | null,
 *   editWorkId?: number | null,
 * }} props
 */
export default function MineUploadHubModal({
  open,
  onClose,
  onWorkSuccess,
  onBlogSuccess,
  initialTab = 'works',
  editBlogId = null,
  editWorkId = null,
}) {
  const isEdit = editBlogId != null || editWorkId != null;
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const handleClose = useCallback(() => {
    if (!isEdit) setTab('works');
    onClose();
  }, [isEdit, onClose]);

  if (!open) return null;

  const dialogTitle = editBlogId
    ? '编辑博客'
    : editWorkId
      ? '编辑作品'
      : tab === 'blog'
        ? '撰写博客'
        : '上传作品';

  return (
    <div
      className="mine-upload-overlay"
      role="presentation"
      onClick={handleClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className={`mine-upload-dialog mine-upload-hub${tab === 'blog' || editBlogId ? ' mine-upload-hub--blog' : ''}`}
        role="dialog"
        aria-labelledby="mine-upload-hub-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mine-upload-dialog-head">
          <h2 id="mine-upload-hub-title" className="mine-upload-dialog-title">
            {dialogTitle}
          </h2>
          <button type="button" className="mine-upload-close" onClick={handleClose} aria-label="关闭">
            ×
          </button>
        </div>

        {!isEdit && (
          <div className="mine-upload-hub-tabs" role="tablist" aria-label="上传类型">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'works'}
              className={`mine-upload-hub-tab${tab === 'works' ? ' is-active' : ''}`}
              onClick={() => setTab('works')}
            >
              影视作品
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'blog'}
              className={`mine-upload-hub-tab${tab === 'blog' ? ' is-active' : ''}`}
              onClick={() => setTab('blog')}
            >
              博客
            </button>
          </div>
        )}

        <div className="mine-upload-hub-body">
          {editBlogId ? (
            <MineBlogPublishModal
              blogId={editBlogId}
              onClose={handleClose}
              onSuccess={() => {
                onBlogSuccess?.();
                handleClose();
              }}
            />
          ) : editWorkId ? (
            <MineWorkUploadModal
              embedded
              open
              workId={editWorkId}
              onClose={handleClose}
              onSuccess={(opts) => {
                onWorkSuccess?.(opts);
                handleClose();
              }}
            />
          ) : tab === 'works' ? (
            <MineWorkUploadModal
              embedded
              open
              onClose={handleClose}
              onSuccess={(opts) => {
                onWorkSuccess?.(opts);
                handleClose();
              }}
            />
          ) : (
            <MineBlogPublishModal
              onClose={handleClose}
              onSuccess={() => {
                onBlogSuccess?.();
                handleClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
