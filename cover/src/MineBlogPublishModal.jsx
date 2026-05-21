import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBlogPost, fetchBlogPost, updateBlogPost, uploadBlogAsset } from './api/blogs';
import BlogBlockEditor from './BlogBlockEditor';
import BlogMdConvertPanel from './BlogMdConvertPanel';
import { blocksToMarkdown, createBlock, markdownToBlocks } from './utils/blockEditorModel';

const BLOG_CATEGORIES = ['技术分享', '器材资讯', '社区新闻', '后期教程', '行业动态'];

function apiErrMessage(err) {
  return err?.response?.data?.message || err?.message || '操作失败';
}

function formatFileSize(size) {
  if (!size) return '';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function emptyFormState() {
  return {
    title: '',
    category: '技术分享',
    tags: '',
    excerpt: '',
    blocks: [createBlock('p', '')],
    coverFile: null,
    coverPreview: '',
    coverName: '',
    coverSize: '',
    coverType: '',
    existingCoverUrl: '',
  };
}

/**
 * @param {{ blogId?: number|null, onClose: () => void, onSuccess: () => void }} props
 */
export default function MineBlogPublishModal({ blogId = null, onClose, onSuccess }) {
  const assetInputRef = useRef(null);
  const isEdit = blogId != null;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('技术分享');
  const [tags, setTags] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [blocks, setBlocks] = useState(() => [createBlock('p', '')]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [existingCoverUrl, setExistingCoverUrl] = useState('');
  const [coverName, setCoverName] = useState('');
  const [coverSize, setCoverSize] = useState('');
  const [coverType, setCoverType] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [assetBusy, setAssetBusy] = useState(false);
  const [err, setErr] = useState('');

  const bodyMarkdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);

  const isBodyEmpty = useMemo(
    () => blocks.length === 1 && blocks[0]?.type === 'p' && !(blocks[0]?.text ?? '').trim(),
    [blocks],
  );

  const handleApplyMarkdown = useCallback(
    (markdown) => {
      const next = markdownToBlocks(markdown);
      if (!next.length) return;
      if (isBodyEmpty) {
        setBlocks(next);
        return;
      }
      if (window.confirm('正文已有内容，是否用转换结果替换当前正文？（取消则追加到文末）')) {
        setBlocks(next);
      } else {
        setBlocks((prev) => [...prev, ...next]);
      }
    },
    [isBodyEmpty],
  );

  const resetCoverPreview = useCallback(() => {
    if (coverPreview.startsWith('blob:')) {
      URL.revokeObjectURL(coverPreview);
    }
  }, [coverPreview]);

  useEffect(() => {
    if (!blogId) {
      const empty = emptyFormState();
      setTitle(empty.title);
      setCategory(empty.category);
      setTags(empty.tags);
      setExcerpt(empty.excerpt);
      setBlocks(empty.blocks);
      setCoverFile(null);
      setCoverPreview('');
      setExistingCoverUrl('');
      setCoverName('');
      setCoverSize('');
      setCoverType('');
      setErr('');
      return undefined;
    }

    let cancelled = false;
    setLoadingDetail(true);
    setErr('');
    fetchBlogPost(blogId)
      .then((post) => {
        if (cancelled || !post) return;
        setTitle(post.title ?? '');
        setCategory(post.category ?? '技术分享');
        setTags((post.tags ?? []).join(', '));
        setExcerpt(post.excerpt ?? '');
        setBlocks(markdownToBlocks(post.bodyMarkdown));
        setCoverFile(null);
        const url = post.coverUrl ?? '';
        setExistingCoverUrl(url);
        setCoverPreview(url);
        setCoverName(post.coverName ?? (url ? '当前封面' : ''));
        setCoverSize(post.coverByteSize ? formatFileSize(post.coverByteSize) : '');
        setCoverType(post.coverMime ?? '');
      })
      .catch((e) => {
        if (!cancelled) setErr(apiErrMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [blogId]);

  const handleCoverChange = useCallback(
    (e) => {
      const file = e.target.files?.[0] ?? null;
      resetCoverPreview();
      if (!file) {
        setCoverFile(null);
        setCoverPreview(existingCoverUrl);
        setCoverName(existingCoverUrl ? '当前封面' : '');
        setCoverSize('');
        setCoverType('');
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setCoverName(file.name);
      setCoverSize(formatFileSize(file.size));
      setCoverType(file.type || '');
    },
    [existingCoverUrl, resetCoverPreview],
  );

  const clearCover = useCallback(() => {
    resetCoverPreview();
    setCoverFile(null);
    setCoverPreview(existingCoverUrl);
    setCoverName(existingCoverUrl ? '当前封面' : '');
    setCoverSize('');
    setCoverType('');
  }, [existingCoverUrl, resetCoverPreview]);

  const handleInsertAsset = useCallback(async () => {
    assetInputRef.current?.click();
  }, []);

  const onAssetFile = useCallback(async (file) => {
    if (!file) return;
    setErr('');
    setAssetBusy(true);
    try {
      const res = await uploadBlogAsset(file);
      if (!res?.url) throw new Error('上传失败');
      const alt = file.name.replace(/\.[^.]+$/, '') || '配图';
      setBlocks((prev) => [
        ...prev,
        { id: `b-img-${Date.now()}`, type: 'image', text: alt, url: res.url },
        createBlock('p', ''),
      ]);
    } catch (e) {
      setErr(apiErrMessage(e));
    } finally {
      setAssetBusy(false);
      if (assetInputRef.current) assetInputRef.current.value = '';
    }
  }, []);

  const hasCoverForPublish = !!(coverFile || existingCoverUrl || (coverPreview && !coverPreview.startsWith('blob:')));

  const submit = useCallback(
    async (status) => {
      setErr('');
      const t = title.trim();
      if (!t) {
        setErr('请填写标题');
        return;
      }
      if (status === 'published' && !hasCoverForPublish) {
        setErr('发布前请上传列表卡片封面');
        return;
      }
      if (status === 'published' && !bodyMarkdown.trim()) {
        setErr('发布前请填写正文');
        return;
      }
      setBusy(true);
      try {
        const payload = {
          title: t,
          category,
          tags,
          excerpt,
          bodyMarkdown,
          status,
          cover: coverFile,
        };
        if (isEdit) {
          await updateBlogPost(blogId, payload);
        } else {
          await createBlogPost(payload);
        }
        onSuccess();
      } catch (e) {
        setErr(apiErrMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [title, category, tags, excerpt, bodyMarkdown, coverFile, hasCoverForPublish, isEdit, blogId, onSuccess],
  );

  const disabled = busy || assetBusy || loadingDetail;

  return (
    <div className="mine-blog-publish mine-blog-publish--wechat">
      <input
        ref={assetInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => void onAssetFile(e.target.files?.[0] ?? null)}
      />

      {loadingDetail && <p className="mine-blog-compose-hint">加载博客内容…</p>}

      {err && (
        <div className="mine-upload-error" role="alert">
          {err}
        </div>
      )}

      <div className="mine-blog-editor-layout">
        <aside className="mine-blog-editor-side">
          <p className="mine-blog-editor-side-title">文章设置</p>

          <label className="mine-upload-label">
            分类
            <select
              className="mine-upload-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={disabled}
            >
              {BLOG_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="mine-upload-label">
            标签
            <input
              className="mine-upload-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="夜景摄影, 参数设置"
              disabled={disabled}
            />
          </label>

          <label className="mine-upload-label">
            摘要
            <textarea
              className="mine-upload-textarea"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={4}
              placeholder="列表卡片上显示的摘要"
              disabled={disabled}
            />
          </label>

          <div className="mine-upload-label">
            <span>列表封面</span>
            <div className="mine-blog-cover-row mine-blog-cover-row--stack">
              <div className="mine-blog-cover-preview mine-blog-cover-preview--wide">
                {coverPreview ? (
                  <img src={coverPreview} alt="封面预览" />
                ) : (
                  <span className="mine-blog-cover-placeholder">16:9 封面</span>
                )}
              </div>
              <label className="mine-upload-btn mine-upload-btn--ghost mine-blog-cover-pick">
                {isEdit ? '更换封面' : '上传封面'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="mine-upload-file"
                  hidden
                  disabled={disabled}
                  onChange={handleCoverChange}
                />
              </label>
              {coverFile && (
                <button type="button" className="mine-blog-cover-clear" onClick={clearCover} disabled={busy}>
                  恢复原封面
                </button>
              )}
              {coverName && (
                <p className="mine-upload-file-name">
                  {coverName}
                  {coverSize ? ` · ${coverSize}` : ''}
                </p>
              )}
            </div>
          </div>
        </aside>

        <main className="mine-blog-editor-main">
          <input
            className="mine-blog-editor-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="请输入标题"
            disabled={disabled}
          />

          <div className="mine-blog-editor-body">
            <BlogBlockEditor
              blocks={blocks}
              onChange={setBlocks}
              disabled={disabled}
              onInsertImage={handleInsertAsset}
            />
          </div>
        </main>

        <BlogMdConvertPanel disabled={disabled} onApply={handleApplyMarkdown} />
      </div>

      <div className="mine-blog-editor-footer">
        <span className="mine-blog-editor-footer-hint">
          右侧可粘贴外部文稿，预览转换后写入正文
        </span>
        <div className="mine-upload-actions">
          <button type="button" className="mine-upload-btn mine-upload-btn--ghost" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className="mine-upload-btn mine-upload-btn--ghost"
            onClick={() => void submit('draft')}
            disabled={disabled}
          >
            存草稿
          </button>
          <button
            type="button"
            className="mine-upload-btn mine-upload-btn--primary"
            onClick={() => void submit('published')}
            disabled={disabled}
          >
            {busy ? '提交中…' : isEdit ? '保存' : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
}
