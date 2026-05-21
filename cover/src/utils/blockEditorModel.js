/** @typedef {'p'|'h1'|'h2'|'h3'|'bullet'|'quote'|'image'} BlockType */

/** @typedef {{ id: string, type: BlockType, text: string, url?: string }} EditorBlock */

let blockSeq = 0;

export function newBlockId() {
  blockSeq += 1;
  return `b-${Date.now()}-${blockSeq}`;
}

/** @returns {EditorBlock} */
export function createBlock(type = 'p', text = '') {
  return { id: newBlockId(), type, text };
}

/**
 * 行首 Markdown 快捷语法 → 块类型（Ctrl+Enter 应用后去掉符号）
 * @returns {{ type: BlockType, text: string, url?: string } | null}
 */
export function parseBlockShortcut(raw) {
  const line = String(raw ?? '').trim();
  if (!line) return { type: 'p', text: '' };

  const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
  if (img) return { type: 'image', text: img[1] || '配图', url: img[2] };

  if (/^###\s+/.test(line)) return { type: 'h3', text: line.replace(/^###\s+/, '') };
  if (/^##\s+/.test(line)) return { type: 'h2', text: line.replace(/^##\s+/, '') };
  if (/^#\s+/.test(line)) return { type: 'h1', text: line.replace(/^#\s+/, '') };
  if (/^>\s+/.test(line)) return { type: 'quote', text: line.replace(/^>\s+/, '') };
  if (/^[-*]\s+/.test(line)) return { type: 'bullet', text: line.replace(/^[-*]\s+/, '') };

  return null;
}

/** @param {EditorBlock[]} blocks */
export function blocksToMarkdown(blocks) {
  return blocks
    .map((b) => {
      const t = (b.text ?? '').trim();
      switch (b.type) {
        case 'h1':
          return t ? `# ${t}` : '';
        case 'h2':
          return t ? `## ${t}` : '';
        case 'h3':
          return t ? `### ${t}` : '';
        case 'bullet':
          return t ? `- ${t}` : '';
        case 'quote':
          return t ? `> ${t}` : '';
        case 'image':
          return b.url ? `![${t || '配图'}](${b.url})` : '';
        default:
          return t;
      }
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * 将单行 Markdown 解析为结构化块（标题/列表/引用/图片）
 * @returns {EditorBlock | null}
 */
function lineToTypedBlock(line) {
  const trimmed = String(line ?? '').trim();
  if (!trimmed) return null;

  const img = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (img) {
    return { id: newBlockId(), type: 'image', text: img[1] || '配图', url: img[2] };
  }
  if (/^###\s+/.test(trimmed)) {
    return createBlock('h3', trimmed.replace(/^###\s+/, ''));
  }
  if (/^##\s+/.test(trimmed)) {
    return createBlock('h2', trimmed.replace(/^##\s+/, ''));
  }
  if (/^#\s+/.test(trimmed)) {
    return createBlock('h1', trimmed.replace(/^#\s+/, ''));
  }
  if (/^>\s+/.test(trimmed)) {
    return createBlock('quote', trimmed.replace(/^>\s+/, ''));
  }
  if (/^[-*]\s+/.test(trimmed)) {
    return createBlock('bullet', trimmed.replace(/^[-*]\s+/, ''));
  }
  return null;
}

/** @param {string} section */
function sectionToBlocks(section) {
  const lines = section.split(/\n/);
  /** @type {EditorBlock[]} */
  const blocks = [];
  /** @type {string[]} */
  let paraLines = [];

  const flushPara = () => {
    if (paraLines.length === 0) return;
    blocks.push(createBlock('p', paraLines.join('\n')));
    paraLines = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flushPara();
      continue;
    }
    const typed = lineToTypedBlock(line);
    if (typed) {
      flushPara();
      blocks.push(typed);
      continue;
    }
    paraLines.push(line);
  }

  flushPara();
  return blocks;
}

/** @param {string} markdown */
export function markdownToBlocks(markdown) {
  const src = String(markdown ?? '').trim();
  if (!src) return [createBlock('p', '')];

  /** @type {EditorBlock[]} */
  let blocks = [];

  // 旧稿常用单换行分段，无空行时按行拆成多个段落块
  if (!/\n{2,}/.test(src)) {
    for (const line of src.split(/\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const typed = lineToTypedBlock(line);
      blocks.push(typed ?? createBlock('p', line));
    }
  } else {
    for (const part of src.split(/\n{2,}/)) {
      const section = part.trim();
      if (!section) continue;
      blocks.push(...sectionToBlocks(section));
    }
  }

  return blocks.length > 0 ? blocks : [createBlock('p', '')];
}
