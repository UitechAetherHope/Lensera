import client from './client';

/**
 * 更新当前用户主页资料（multipart）
 * @param {{
 *   userName?: string,
 *   avatar?: File|null,
 *   cover?: File|null,
 *   coverFocusX?: number,
 *   coverFocusY?: number,
 *   bio?: string,
 * }} payload
 */
export async function patchUserProfile(payload) {
  const fd = new FormData();
  if (payload.userName != null && String(payload.userName).trim()) {
    fd.append('userName', String(payload.userName).trim());
  }
  if (payload.bio != null) {
    fd.append('bio', String(payload.bio).trim());
  }
  if (payload.avatar instanceof File) fd.append('avatar', payload.avatar);
  if (payload.cover instanceof File) fd.append('cover', payload.cover);
  if (payload.coverFocusX != null && Number.isFinite(Number(payload.coverFocusX))) {
    fd.append('coverFocusX', String(payload.coverFocusX));
  }
  if (payload.coverFocusY != null && Number.isFinite(Number(payload.coverFocusY))) {
    fd.append('coverFocusY', String(payload.coverFocusY));
  }
  const { data } = await client.patch('/api/user/me', fd);
  return data?.data ?? null;
}
