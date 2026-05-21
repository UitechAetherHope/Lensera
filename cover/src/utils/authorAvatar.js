/**
 * 作者展示头像：优先使用后端根据 tb_user.avatar_path 拼好的 URL；无头像时用内联 SVG 首字占位（不依赖外站图床）。
 * @param {string|null|undefined} authorAvatarUrl
 * @param {string|null|undefined} authorName
 * @returns {string}
 */
export function authorAvatarSrc(authorAvatarUrl, authorName) {
  if (authorAvatarUrl && String(authorAvatarUrl).trim()) {
    return String(authorAvatarUrl).trim();
  }
  return placeholderAvatarDataUrl(authorName);
}

function placeholderAvatarDataUrl(authorName) {
  const raw = (authorName && String(authorName).trim()) || '用户';
  const ch = [...raw][0] || '?';
  const safe = ch
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect fill="#3f3f46" width="96" height="96"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#fafafa" font-size="34" font-family="system-ui,Segoe UI,sans-serif">${safe}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
