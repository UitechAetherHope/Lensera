import client from './client';

/** @param {string|number} publicId */
export async function fetchWorksByPublicId(publicId) {
  const { data } = await client.get('/api/works', { params: { publicId } });
  return data?.data ?? [];
}

/**
 * 全站作品流（WorkFeedCardResponse）；不传 category 为全部。
 * @param {string|undefined|null} category
 */
export async function fetchWorksFeed(category) {
  const params = {};
  if (category != null && String(category).trim()) {
    params.category = String(category).trim();
  }
  const { data } = await client.get('/api/works/feed', { params });
  return data?.data ?? [];
}

/**
 * @param {{ file: File, title: string, caption?: string, category?: string|null, aiClassify?: boolean }} payload
 * @returns {Promise<object|null>}
 */
export async function uploadWork({ file, title, caption, category, aiClassify = false }) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', title.trim());
  if (caption != null && String(caption).trim()) fd.append('caption', String(caption).trim());
  if (category != null && String(category).trim()) {
    fd.append('category', String(category).trim());
  }
  fd.append('aiClassify', aiClassify ? 'true' : 'false');
  const { data } = await client.post('/api/works', fd);
  return data?.data ?? null;
}

export async function likeWork(workId) {
  const { data } = await client.post(`/api/works/${workId}/like`);
  return data?.data ?? null;
}

export async function unlikeWork(workId) {
  const { data } = await client.delete(`/api/works/${workId}/like`);
  return data?.data ?? null;
}

/** 删除作品（须登录且为作者本人） */
export async function deleteWork(workId) {
  await client.delete(`/api/works/${workId}`);
}

/** @param {string|number} workId */
export async function fetchWork(workId) {
  const { data } = await client.get(`/api/works/${workId}`);
  return data?.data ?? null;
}

/**
 * @param {string|number} workId
 * @param {{ file?: File|null, title: string, caption?: string, category?: string|null, aiClassify?: boolean }} payload
 */
export async function updateWork(workId, { file, title, caption, category, aiClassify = false }) {
  const fd = new FormData();
  fd.append('title', title.trim());
  if (caption != null && String(caption).trim()) fd.append('caption', String(caption).trim());
  if (category != null && String(category).trim()) {
    fd.append('category', String(category).trim());
  }
  fd.append('aiClassify', aiClassify ? 'true' : 'false');
  if (file) fd.append('file', file);
  const { data } = await client.patch(`/api/works/${workId}`, fd);
  return data?.data ?? null;
}
