import client from './client';

/** @returns {Promise<Array<object>>} */
export async function fetchMyMessages() {
  const { data } = await client.get('/api/user/me/messages');
  return data?.data ?? [];
}
