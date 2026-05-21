import client from './client';

function normalizeBlogId(blogId) {
  return String(blogId ?? '').replace(/^p-/, '');
}

/** @param {string|number} blogId */
export async function fetchBlogComments(blogId) {
  const id = normalizeBlogId(blogId);
  const { data } = await client.get(`/api/blog-posts/${id}/comments`);
  return data?.data ?? [];
}

/**
 * @param {string|number} blogId
 * @param {{ content: string, parentId?: number|null }} payload
 */
export async function postBlogComment(blogId, payload) {
  const id = normalizeBlogId(blogId);
  const { data } = await client.post(`/api/blog-posts/${id}/comments`, payload);
  return data?.data ?? null;
}

/** @param {string|number} blogId @param {string|number} commentId */
export async function likeBlogComment(blogId, commentId) {
  const id = normalizeBlogId(blogId);
  const { data } = await client.post(`/api/blog-posts/${id}/comments/${commentId}/like`);
  return data?.data ?? null;
}

/** @param {string|number} blogId @param {string|number} commentId */
export async function unlikeBlogComment(blogId, commentId) {
  const id = normalizeBlogId(blogId);
  const { data } = await client.delete(`/api/blog-posts/${id}/comments/${commentId}/like`);
  return data?.data ?? null;
}

/** @param {string|number} blogId @param {string|number} commentId */
export async function deleteBlogComment(blogId, commentId) {
  const id = normalizeBlogId(blogId);
  await client.delete(`/api/blog-posts/${id}/comments/${commentId}`);
}
