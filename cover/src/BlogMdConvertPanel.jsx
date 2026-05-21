import { useCallback, useState } from 'react';
import { convertPlainTextToMarkdown } from './api/blogs';

function apiErrMessage(err) {
  return err?.response?.data?.message || err?.message || '转换失败';
}

/**
 * 博客编辑弹窗右侧：粘贴 AI/纯文本 → 预览 Markdown → 应用到块编辑器
 * @param {{ disabled?: boolean, onApply: (markdown: string) => void }} props
 */
export default function BlogMdConvertPanel({ disabled = false, onApply }) {
  const [pasteText, setPasteText] = useState('');
  const [previewMd, setPreviewMd] = useState('');
  const [tab, setTab] = useState('paste');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handlePreview = useCallback(async () => {
    const text = pasteText.trim();
    if (!text) {
      setErr('请先粘贴要转换的文本');
      setTab('paste');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const md = await convertPlainTextToMarkdown(text);
      setPreviewMd(md);
      setTab('preview');
    } catch (e) {
      setErr(apiErrMessage(e));
    } finally {
      setBusy(false);
    }
  }, [pasteText]);

  const handleApply = useCallback(() => {
    const md = (previewMd || pasteText).trim();
    if (!md) {
      setErr('没有可应用的内容，请先粘贴并点击「预览转换」');
      return;
    }
    if (!previewMd && pasteText.trim()) {
      setErr('请先点击「预览转换」生成 Markdown');
      return;
    }
    setErr('');
    onApply(previewMd);
  }, [onApply, pasteText, previewMd]);

  return (
    <aside className="mine-blog-editor-md" aria-label="MD 转换">
      <div className="mine-blog-editor-md-head">
        <p className="mine-blog-editor-side-title">MD 转换</p>
        <p className="mine-blog-editor-md-hint">从 Word、记事本等复制文稿，预览后写入正文</p>
      </div>

      <div className="mine-blog-editor-md-body">
        <div className="mine-blog-md-head">
          <div className="mine-blog-md-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'paste'}
              className={tab === 'paste' ? 'is-active' : ''}
              onClick={() => setTab('paste')}
              disabled={disabled}
            >
              粘贴原文
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'preview'}
              className={tab === 'preview' ? 'is-active' : ''}
              onClick={() => setTab('preview')}
              disabled={disabled || !previewMd}
            >
              Markdown 预览
            </button>
          </div>
        </div>

        <div className="mine-blog-md-toolbar">
          <button type="button" onClick={() => void handlePreview()} disabled={disabled || busy}>
            {busy ? '转换中…' : '预览转换'}
          </button>
          <button
            type="button"
            className="mine-blog-md-apply"
            onClick={handleApply}
            disabled={disabled || busy || !previewMd}
          >
            应用到正文
          </button>
        </div>

        {err && (
          <p className="mine-blog-md-error" role="alert">
            {err}
          </p>
        )}

        {tab === 'paste' ? (
          <textarea
            className="mine-upload-textarea mine-blog-md-editor mine-blog-md-pane"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={
              '在此粘贴外部文稿…\n\n支持自动识别：章节标题、编号小节、列表、引用，以及【强调】等符号'
            }
            disabled={disabled || busy}
            spellCheck={false}
          />
        ) : (
          <pre className="mine-blog-md-preview mine-blog-md-pane">{previewMd || '（暂无预览）'}</pre>
        )}
      </div>
    </aside>
  );
}
