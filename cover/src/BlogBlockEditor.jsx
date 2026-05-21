import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildMarkdownArticle } from './utils/markdownArticle';
import { createBlock, parseBlockShortcut, blocksToMarkdown } from './utils/blockEditorModel';
import { wrapTextareaSelection } from './utils/textareaFormat';
import './BlogBlockEditor.css';

const TYPE_HINT = {
  p: '正文',
  h1: '一级标题',
  h2: '二级标题',
  h3: '三级标题',
  bullet: '列表',
  quote: '引用',
  image: '图片',
};

const INLINE_TOOLS = [
  { id: 'bold', label: 'B', title: '加粗 **文字**', className: 'is-bold', before: '**', after: '**', placeholder: '加粗' },
  { id: 'italic', label: 'I', title: '斜体 *文字*', className: 'is-italic', before: '*', after: '*', placeholder: '斜体' },
  { id: 'strike', label: 'S', title: '删除线 ~~文字~~', className: 'is-strike', before: '~~', after: '~~', placeholder: '删除' },
  { id: 'code', label: '</>', title: '行内代码 `代码`', className: 'is-code', before: '`', after: '`', placeholder: '代码' },
  { id: 'link', label: '链', title: '链接 [文字](地址)', className: 'is-link', before: '[', after: '](https://)', placeholder: '链接文字' },
];

function syncTextareaHeight(el) {
  if (!el) return;
  el.style.height = '0px';
  const min = el.classList.contains('blog-block__field') ? 36 : 24;
  el.style.height = `${Math.max(el.scrollHeight, min)}px`;
}

const BLOCK_TOOLS = [
  { id: 'h1', label: 'H1', title: '一级标题', type: 'h1' },
  { id: 'h2', label: 'H2', title: '二级标题', type: 'h2' },
  { id: 'h3', label: 'H3', title: '三级标题', type: 'h3' },
  { id: 'bullet', label: '•', title: '无序列表', type: 'bullet' },
  { id: 'quote', label: '引', title: '引用块', type: 'quote' },
  { id: 'p', label: '正文', title: '正文段落', type: 'p' },
];

/**
 * @param {{
 *   blocks: import('./utils/blockEditorModel').EditorBlock[],
 *   onChange: (blocks: import('./utils/blockEditorModel').EditorBlock[]) => void,
 *   disabled?: boolean,
 *   onInsertImage?: () => void,
 * }} props
 */
export default function BlogBlockEditor({ blocks, onChange, disabled = false, onInsertImage }) {
  const inputRefs = useRef({});
  const [activeBlockId, setActiveBlockId] = useState(() => blocks[0]?.id ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeBlockId) ?? null,
    [blocks, activeBlockId],
  );

  const previewHtml = useMemo(() => {
    if (!previewOpen) return '';
    return buildMarkdownArticle(blocksToMarkdown(blocks)).html;
  }, [blocks, previewOpen]);

  const updateBlock = useCallback(
    (id, patch) => {
      onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    },
    [blocks, onChange],
  );

  const insertAfter = useCallback(
    (afterId, block) => {
      const idx = blocks.findIndex((b) => b.id === afterId);
      const next = [...blocks];
      next.splice(idx + 1, 0, block);
      onChange(next);
      return block.id;
    },
    [blocks, onChange],
  );

  const removeBlock = useCallback(
    (id) => {
      if (blocks.length <= 1) {
        onChange([createBlock('p', '')]);
        return;
      }
      onChange(blocks.filter((b) => b.id !== id));
    },
    [blocks, onChange],
  );

  const applyShortcut = useCallback(
    (id) => {
      const block = blocks.find((b) => b.id === id);
      if (!block || block.type === 'image') return false;
      const parsed = parseBlockShortcut(block.text);
      if (!parsed) return false;
      updateBlock(id, parsed);
      return true;
    },
    [blocks, updateBlock],
  );

  const focusBlock = useCallback((id) => {
    setActiveBlockId(id);
    queueMicrotask(() => inputRefs.current[id]?.focus());
  }, []);

  const applyInlineFormat = useCallback(
    (before, after, placeholder) => {
      const id = activeBlockId;
      const el = id ? inputRefs.current[id] : null;
      const block = blocks.find((b) => b.id === id);
      if (!el || !block || block.type === 'image' || disabled) return;

      const { text, selectionStart, selectionEnd } = wrapTextareaSelection(
        el,
        before,
        after,
        placeholder,
      );
      updateBlock(id, { text });
      queueMicrotask(() => {
        el.focus();
        el.setSelectionRange(selectionStart, selectionEnd);
      });
    },
    [activeBlockId, blocks, disabled, updateBlock],
  );

  const setBlockType = useCallback(
    (type) => {
      const id = activeBlockId;
      const block = blocks.find((b) => b.id === id);
      if (!block || block.type === 'image' || disabled) return;
      updateBlock(id, { type });
      focusBlock(id);
    },
    [activeBlockId, blocks, disabled, focusBlock, updateBlock],
  );

  const handleKeyDown = useCallback(
    (e, block) => {
      if (disabled) return;

      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const applied = applyShortcut(block.id);
        if (!applied && block.text.trim()) {
          const nid = insertAfter(block.id, createBlock('p', ''));
          focusBlock(nid);
        } else {
          focusBlock(block.id);
        }
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey && block.type !== 'image') {
        e.preventDefault();
        const nid = insertAfter(block.id, createBlock('p', ''));
        focusBlock(nid);
        return;
      }

      if (e.key === 'Backspace' && !block.text && blocks.length > 1) {
        e.preventDefault();
        const idx = blocks.findIndex((b) => b.id === block.id);
        const prev = blocks[idx - 1];
        removeBlock(block.id);
        if (prev) focusBlock(prev.id);
      }
    },
    [applyShortcut, blocks, disabled, focusBlock, insertAfter, removeBlock],
  );

  const canFormat = activeBlock && activeBlock.type !== 'image';

  useLayoutEffect(() => {
    blocks.forEach((block) => {
      if (block.type === 'image') return;
      syncTextareaHeight(inputRefs.current[block.id]);
    });
  }, [blocks]);

  const bindTextareaRef = useCallback((id, el) => {
    inputRefs.current[id] = el;
    syncTextareaHeight(el);
  }, []);

  const handleTextChange = useCallback(
    (id, value) => {
      updateBlock(id, { text: value });
      queueMicrotask(() => syncTextareaHeight(inputRefs.current[id]));
    },
    [updateBlock],
  );

  return (
    <div className="blog-block-editor">
      <div className="blog-block-editor__toolbar" role="toolbar" aria-label="正文格式">
        <div className="blog-block-editor__toolbar-group" aria-label="行内格式">
          {INLINE_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`blog-fmt-btn ${tool.className}`}
              title={tool.title}
              disabled={disabled || !canFormat}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyInlineFormat(tool.before, tool.after, tool.placeholder)}
            >
              {tool.label}
            </button>
          ))}
        </div>

        <span className="blog-block-editor__toolbar-sep" aria-hidden="true" />

        <div className="blog-block-editor__toolbar-group" aria-label="段落类型">
          {BLOCK_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`blog-fmt-btn blog-fmt-btn--block${activeBlock?.type === tool.type ? ' is-active' : ''}`}
              title={tool.title}
              disabled={disabled || !canFormat}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setBlockType(tool.type)}
            >
              {tool.label}
            </button>
          ))}
        </div>

        <span className="blog-block-editor__toolbar-sep" aria-hidden="true" />

        <button
          type="button"
          className={`blog-fmt-btn blog-fmt-btn--preview${previewOpen ? ' is-active' : ''}`}
          title="预览 Markdown 渲染效果"
          disabled={disabled}
          onClick={() => setPreviewOpen((v) => !v)}
        >
          预览
        </button>
      </div>

      {previewOpen ? (
        <div className="blog-block-editor__preview-wrap">
          <p className="blog-block-editor__preview-label">预览</p>
          <div
            className="blog-block-editor__preview blog-article__markdown"
            dangerouslySetInnerHTML={{
              __html: previewHtml || '<p class="blog-article__md-empty">暂无内容</p>',
            }}
          />
        </div>
      ) : null}

      <div className="blog-block-editor__tips">
        <span>行首输入 </span>
        <code>#</code> <code>##</code> <code>###</code> <code>-</code> <code>&gt;</code>
        <span> 后 </span>
        <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
        <span> 转为标题/列表/引用 · 选中文字后点工具栏加粗/斜体等 · </span>
        <kbd>Enter</kbd>
        <span> 新段落</span>
      </div>

      <div className="blog-block-editor__blocks">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`blog-block blog-block--${block.type}${activeBlockId === block.id ? ' is-focused' : ''}`}
          >
            <span className="blog-block__label">{TYPE_HINT[block.type] ?? '块'}</span>

            {block.type === 'image' ? (
              <div className="blog-block__image-wrap">
                {block.url ? (
                  <img src={block.url} alt={block.text} className="blog-block__image" />
                ) : (
                  <div className="blog-block__image-empty">图片</div>
                )}
                <input
                  className="blog-block__image-caption"
                  value={block.text}
                  placeholder="图片说明"
                  disabled={disabled}
                  onFocus={() => setActiveBlockId(block.id)}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                />
              </div>
            ) : (
              <textarea
                ref={(el) => bindTextareaRef(block.id, el)}
                className="blog-block__field"
                rows={1}
                value={block.text}
                placeholder={
                  block.type === 'p'
                    ? '写正文；选中文字后点上方 B 加粗，或输入 # 后 Ctrl+Enter 变标题…'
                    : '输入内容'
                }
                disabled={disabled}
                onFocus={() => setActiveBlockId(block.id)}
                onChange={(e) => handleTextChange(block.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, block)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="blog-block-editor__foot">
        <button
          type="button"
          className="mine-upload-btn mine-upload-btn--ghost"
          disabled={disabled}
          onClick={() => {
            const last = blocks[blocks.length - 1];
            if (last) {
              const nid = insertAfter(last.id, createBlock('p', ''));
              focusBlock(nid);
            } else {
              onChange([createBlock('p', '')]);
            }
          }}
        >
          + 段落
        </button>
        {onInsertImage && (
          <button
            type="button"
            className="mine-upload-btn mine-upload-btn--ghost"
            disabled={disabled}
            onClick={onInsertImage}
          >
            插入图片
          </button>
        )}
      </div>
    </div>
  );
}

export { blocksToMarkdown, markdownToBlocks } from './utils/blockEditorModel';
