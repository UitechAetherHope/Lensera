import client from './client';

/**
 * 上传 Markdown 正文内嵌图
 * @param {File} file
 * @returns {Promise<{ relativePath: string, url: string }>}
 */
/**
 * 纯文本 / AI 文稿 → Markdown（需登录）
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function convertPlainTextToMarkdown(text) {
  const { data } = await client.post('/api/blog-posts/convert-markdown', { text: text ?? '' });
  return data?.data?.markdown ?? '';
}

export async function uploadBlogAsset(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await client.post('/api/blog-posts/assets', fd);
  return data?.data ?? null;
}

/**
 * @param {{
 *   title: string,
 *   category?: string,
 *   tags?: string,
 *   excerpt?: string,
 *   bodyMarkdown?: string,
 *   status?: 'draft' | 'pending' | 'published',
 *   cover?: File | null,
 * }} payload
 */
export async function createBlogPost(payload) {
  const fd = new FormData();
  fd.append('title', payload.title.trim());
  if (payload.category) fd.append('category', payload.category);
  if (payload.tags) fd.append('tags', payload.tags);
  if (payload.excerpt) fd.append('excerpt', payload.excerpt);
  if (payload.bodyMarkdown) fd.append('bodyMarkdown', payload.bodyMarkdown);
  fd.append('status', payload.status ?? 'draft');
  if (payload.cover) fd.append('cover', payload.cover);
  const { data } = await client.post('/api/blog-posts', fd);
  return data?.data ?? null;
}

/**
 * 全站已发布博客（博客页卡片流）
 * @param {'latest'|'popular'|'discussed'} [sort] 最新发布 | 浏览最多 | 讨论最热
 */
export async function fetchBlogFeed(sort = 'latest') {
  const { data } = await client.get('/api/blog-posts/feed', { params: { sort } });
  return data?.data ?? [];
}

/** @param {string|number} publicId */
export async function fetchBlogPostsByPublicId(publicId) {
  const { data } = await client.get('/api/blog-posts', { params: { publicId } });
  return data?.data ?? [];
}

export async function fetchMyBlogPosts() {
  const { data } = await client.get('/api/blog-posts/mine');
  return data?.data ?? [];
}

/** @param {string|number} blogId 纯数字 blogId */
export async function fetchBlogPost(blogId) {
  const id = String(blogId).replace(/^p-/, '');
  const { data } = await client.get(`/api/blog-posts/${id}`);
  return data?.data ?? null;
}

/** 记录博客阅读（与打开详情并行调用，GET 详情内也会计一次） */
export async function recordBlogView(blogId) {
  const id = String(blogId).replace(/^p-/, '');
  try {
    await client.post(`/api/blog-posts/${id}/view`);
  } catch {
    /* 统计失败不影响阅读 */
  }
}

/**
 * @param {string|number} blogId
 * @param {{
 *   title: string,
 *   category?: string,
 *   tags?: string,
 *   excerpt?: string,
 *   bodyMarkdown?: string,
 *   status?: 'draft' | 'pending' | 'published',
 *   cover?: File | null,
 * }} payload
 */
export async function updateBlogPost(blogId, payload) {
  const id = String(blogId).replace(/^p-/, '');
  const fd = new FormData();
  fd.append('title', payload.title.trim());
  if (payload.category) fd.append('category', payload.category);
  if (payload.tags) fd.append('tags', payload.tags);
  if (payload.excerpt) fd.append('excerpt', payload.excerpt);
  if (payload.bodyMarkdown) fd.append('bodyMarkdown', payload.bodyMarkdown);
  fd.append('status', payload.status ?? 'draft');
  if (payload.cover) fd.append('cover', payload.cover);
  const { data } = await client.patch(`/api/blog-posts/${id}`, fd);
  return data?.data ?? null;
}
