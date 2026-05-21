import client from './client';

/** @param {string|number} workId */
export async function fetchWorkComments(workId) {
  const { data } = await client.get(`/api/works/${workId}/comments`);
  return data?.data ?? [];
}

/**
 * @param {string|number} workId
 * @param {{ content: string, parentId?: number|null }} payload
 */
export async function postWorkComment(workId, payload) {
  const { data } = await client.post(`/api/works/${workId}/comments`, payload);
  return data?.data ?? null;
}

/** @param {string|number} workId @param {string|number} commentId */
export async function likeWorkComment(workId, commentId) {
  const { data } = await client.post(`/api/works/${workId}/comments/${commentId}/like`);
  return data?.data ?? null;
}

/** @param {string|number} workId @param {string|number} commentId */
export async function unlikeWorkComment(workId, commentId) {
  const { data } = await client.delete(`/api/works/${workId}/comments/${commentId}/like`);
  return data?.data ?? null;
}

/** @param {string|number} workId @param {string|number} commentId */
export async function deleteWorkComment(workId, commentId) {
  await client.delete(`/api/works/${workId}/comments/${commentId}`);
}
