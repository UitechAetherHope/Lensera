import { useCallback, useEffect, useState } from 'react';
import { fetchWork, updateWork, uploadWork } from './api/works';

function apiErrMessage(err) {
  return err?.response?.data?.message || err?.message || '上传失败';
}

/** 与后端手选白名单一致；未选则不传 category，库内为 null */
const MANUAL_TAGS = [
  { value: '风景', hash: '#风景' },
  { value: '人物', hash: '#人物' },
  { value: '动物', hash: '#动物' },
  { value: '街拍', hash: '#街拍' },
  { value: '静物', hash: '#静物' },
];

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onSuccess: (opts?: { waitForAiTag?: boolean }) => void,
 *   embedded?: boolean,
 *   workId?: number|null,
 * }} props
 */
export default function MineWorkUploadModal({ open, onClose, onSuccess, embedded = false, workId = null }) {
  const isEdit = workId != null;

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  /** @type {string | null} */
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [aiClassify, setAiClassify] = useState(false);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [err, setErr] = useState('');

  const reset = useCallback(() => {
    setTitle('');
    setCaption('');
    setSelectedCategory(null);
    setAiClassify(false);
    setFile(null);
    setImagePreview('');
    setErr('');
    setBusy(false);
    setLoadingDetail(false);
  }, []);

  useEffect(() => {
    if (!open || !workId) {
      if (!workId) reset();
      return undefined;
    }

    let cancelled = false;
    setLoadingDetail(true);
    setErr('');
    fetchWork(workId)
      .then((w) => {
        if (cancelled || !w) return;
        setTitle(w.title ?? '');
        setCaption(w.caption ?? '');
        setSelectedCategory(w.category ?? null);
        setImagePreview(w.imageUrl ?? '');
        setFile(null);
        setAiClassify(false);
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
  }, [open, workId, reset]);

  const handleClose = useCallback(() => {
    if (busy) return;
    reset();
    onClose();
  }, [busy, onClose, reset]);

  const toggleTag = useCallback(
    (value) => {
      if (aiClassify) return;
      setSelectedCategory((prev) => (prev === value ? null : value));
    },
    [aiClassify],
  );

  const handleAiClassifyChange = useCallback((checked) => {
    setAiClassify(checked);
    if (checked) setSelectedCategory(null);
  }, []);

  const submit = useCallback(async () => {
    setErr('');
    if (!isEdit && !file) {
      setErr('请选择一张图片');
      return;
    }
    const t = title.trim();
    if (!t) {
      setErr('请填写标题');
      return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await updateWork(workId, {
          file: file ?? undefined,
          title: t,
          caption,
          category: aiClassify ? undefined : selectedCategory ?? undefined,
          aiClassify,
        });
      } else {
        await uploadWork({
          file,
          title: t,
          caption,
          category: aiClassify ? undefined : selectedCategory ?? undefined,
          aiClassify,
        });
      }
      reset();
      onSuccess({ waitForAiTag: aiClassify });
      if (!embedded) onClose();
    } catch (e) {
      setErr(apiErrMessage(e));
    } finally {
      setBusy(false);
    }
  }, [file, title, caption, selectedCategory, aiClassify, embedded, isEdit, workId, onClose, onSuccess, reset]);

  if (!open) return null;

  const disabled = busy || loadingDetail;

  const form = (
    <>
      {loadingDetail && <p className="mine-blog-compose-hint">加载作品信息…</p>}

      {err && (
        <div className="mine-upload-error" role="alert">
          {err}
        </div>
      )}

      {isEdit && imagePreview && (
        <div className="mine-work-edit-preview">
          <img src={imagePreview} alt="" />
          <p className="mine-upload-hint">不重新选择文件则保留当前图片</p>
        </div>
      )}

      <label className="mine-upload-label">
        标题
        <input
          className="mine-upload-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={128}
          placeholder="作品标题"
          disabled={disabled}
        />
      </label>
      <label className="mine-upload-label">
        文案（可选）
        <textarea
          className="mine-upload-textarea"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          placeholder="补充说明、拍摄思路等"
          disabled={disabled}
        />
      </label>
      <label className="mine-upload-check">
        <input
          type="checkbox"
          checked={aiClassify}
          onChange={(e) => handleAiClassifyChange(e.target.checked)}
          disabled={disabled}
        />
        <span>
          {isEdit
            ? '使用 AI 自动分类（豆包/DeepSeek/通义/智谱视觉模型，保存后自动打标签）'
            : '使用 AI 自动分类（云端视觉模型识别画面，自动写入 #风景 等标签）'}
        </span>
      </label>
      <div className="mine-upload-label">
        <span>分类{aiClassify ? '（由 AI 自动写入）' : '（可选）'}</span>
        <div
          className={`mine-upload-tags${aiClassify ? ' mine-upload-tags--locked' : ''}`}
          role="group"
          aria-label="作品分类"
          aria-disabled={aiClassify}
        >
          {MANUAL_TAGS.map(({ value, hash }) => (
            <button
              key={value}
              type="button"
              className={`mine-upload-tag${selectedCategory === value ? ' is-active' : ''}`}
              onClick={() => toggleTag(value)}
              disabled={disabled || aiClassify}
              aria-pressed={selectedCategory === value}
            >
              {hash}
            </button>
          ))}
        </div>
        <p className="mine-upload-hint">
          {aiClassify ? (
            <>
              已开启 AI 分类，保存后由云端大模型识别画面并写入
              <strong className="mine-upload-hint-strong"> #风景 / #人物 / #动物 / #街拍 / #静物 </strong>
              之一（约数秒～半分钟，请稍后刷新列表；需在服务端配置 API Key）。
            </>
          ) : (
            <>
              未选择时<strong className="mine-upload-hint-strong">不写入分类</strong>（作品可在「全部」流中展示，分类页仅展示已打标签的作品）。
            </>
          )}
        </p>
      </div>
      <label className="mine-upload-label mine-upload-file-label">
        {isEdit ? '更换图片（可选）' : '图片文件'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="mine-upload-file"
          disabled={disabled}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && <span className="mine-upload-file-name">{file.name}</span>}
      </label>
      <div className="mine-upload-actions">
        <button type="button" className="mine-upload-btn mine-upload-btn--ghost" onClick={handleClose} disabled={busy}>
          取消
        </button>
        <button type="button" className="mine-upload-btn mine-upload-btn--primary" onClick={submit} disabled={disabled}>
          {busy ? '保存中…' : isEdit ? '保存修改' : '发布'}
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="mine-upload-embedded">{form}</div>;
  }

  return (
    <div className="mine-upload-overlay" role="presentation" onClick={handleClose}>
      <div
        className="mine-upload-dialog"
        role="dialog"
        aria-labelledby="mine-upload-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mine-upload-dialog-head">
          <h2 id="mine-upload-title" className="mine-upload-dialog-title">
            {isEdit ? '编辑作品' : '上传作品'}
          </h2>
          <button type="button" className="mine-upload-close" onClick={handleClose} disabled={busy} aria-label="关闭">
            ×
          </button>
        </div>
        {form}
      </div>
    </div>
  );
}
