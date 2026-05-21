import client from './client';

/** @returns {Promise<{ publicId, userName, likesReceived, followingCount, followersCount, followedByMe }|null>} */
export async function fetchPublicProfile(publicId) {
  const { data } = await client.get(`/api/users/${publicId}`);
  return data?.data ?? null;
}

export async function followUser(publicId) {
  const { data } = await client.post(`/api/users/${publicId}/follow`);
  return data?.data ?? null;
}

export async function unfollowUser(publicId) {
  const { data } = await client.delete(`/api/users/${publicId}/follow`);
  return data?.data ?? null;
}
