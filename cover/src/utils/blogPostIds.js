/** API 博客在路由中的 id 前缀，避免与占位数据 numeric id (1,2,3) 冲突 */
export const API_BLOG_ROUTE_PREFIX = 'p-';

export function toApiBlogRouteId(blogId) {
  return `${API_BLOG_ROUTE_PREFIX}${blogId}`;
}

/** @returns {number|null} */
export function parseApiBlogRouteId(routeId) {
  const raw = String(routeId ?? '');
  if (!raw.startsWith(API_BLOG_ROUTE_PREFIX)) return null;
  const n = Number.parseInt(raw.slice(API_BLOG_ROUTE_PREFIX.length), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
