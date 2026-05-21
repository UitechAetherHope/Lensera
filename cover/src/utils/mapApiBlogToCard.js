import { toApiBlogRouteId } from './blogPostIds';

/**
 * 将后端 BlogPostListItemResponse 转为博客卡片 UI 所需结构（与 Blog.jsx blogPosts 项一致）
 * @param {object} item
 */
export function mapApiBlogToCard(item) {
  return {
    id: toApiBlogRouteId(item.blogId),
    blogId: item.blogId,
    category: item.category,
    title: item.title,
    excerpt: item.excerpt ?? '',
    author: item.author,
    authorPublicId: item.authorPublicId ?? null,
    date: item.date,
    views: item.views ?? '0',
    comments: item.comments ?? 0,
    image: item.imageUrl || '',
    heroTone: item.category === '器材资讯' ? 'gear' : 'night',
    tags: Array.isArray(item.tags) ? item.tags : [],
    status: item.status,
    source: 'api',
  };
}
