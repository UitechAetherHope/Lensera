/** @typedef {{ id: string, level: number, text: string }} MarkdownOutlineItem */

function normalizeMarkdown(markdown) {
  return String(markdown ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function stripInlineMarkup(text) {
  return String(text ?? '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function uniqueHeadingId(text, counts) {
  const base =
    stripInlineMarkup(text)
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';
  const n = (counts[base] ?? 0) + 1;
  counts[base] = n;
  return n === 1 ? base : `${base}-${n}`;
}

/**
 * 从 Markdown 按文档顺序提取 # / ## / ### 标题
 * @param {string} markdown
 * @returns {MarkdownOutlineItem[]}
 */
export function parseMarkdownOutline(markdown) {
  const src = normalizeMarkdown(markdown);
  if (!src.trim()) return [];
  const outline = [];
  const counts = {};
  for (const line of src.split('\n')) {
    const trimmed = line.trim();
    const m = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (!m) continue;
    const level = m[1].length;
    const text = stripInlineMarkup(m[2]);
    if (!text) continue;
    outline.push({ id: uniqueHeadingId(text, counts), level, text });
  }
  return outline;
}

/**
 * @param {Array<{ title: string }>} sections
 * @returns {MarkdownOutlineItem[]}
 */
export function parseSectionsOutline(sections) {
  if (!Array.isArray(sections) || sections.length === 0) return [];
  return sections
    .filter((s) => s?.title?.trim())
    .map((s, i) => ({
      id: `section-${i}`,
      level: 2,
      text: String(s.title).trim(),
    }));
}

/**
 * 与原 simpleMarkdownToHtml 相同渲染规则；标题按出现顺序加 id 供目录跳转
 * @param {string} markdown
 * @returns {{ html: string, outline: MarkdownOutlineItem[] }}
 */
export function buildMarkdownArticle(markdown) {
  const src = normalizeMarkdown(markdown);
  const outline = parseMarkdownOutline(src);

  if (!src.trim()) {
    return { html: '<p class="blog-article__md-empty">暂无正文</p>', outline: [] };
  }

  let headingIndex = 0;

  const html = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^(#{1,3})\s+(.+)$/gm, (_, hashes, content) => {
      const level = hashes.length;
      const item = outline[headingIndex];
      headingIndex += 1;
      const id = item?.id ?? uniqueHeadingId(content, {});
      return `<h${level} id="${id}">${content}</h${level}>`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<figure class="blog-article__md-figure"><img alt="$1" src="$2" loading="lazy" /><figcaption>$1</figcaption></figure>',
    )
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');

  return { html, outline };
}
