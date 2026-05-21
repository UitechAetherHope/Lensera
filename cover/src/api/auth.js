import client from './client';

/** 登录成功后写入本地（供后续受保护接口使用） */
export function persistAuth(payload) {
  if (!payload?.token) return;
  localStorage.setItem('token', payload.token);
  localStorage.setItem(
    'user',
    JSON.stringify({
      userId: payload.userId,
      publicId: payload.publicId ?? null,
      userName: payload.userName,
      email: payload.email,
    })
  );
}

/** 退出登录：清除本地 token 与用户信息 */
export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/** 读取本地缓存的用户信息（无 token 时可能为 null） */
export function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 合并写入本地 user 缓存（如编辑主页后更新昵称等） */
export function mergeStoredUser(partial) {
  if (partial == null || typeof partial !== 'object') return;
  const prev = readStoredUser() || {};
  localStorage.setItem('user', JSON.stringify({ ...prev, ...partial }));
}

/** 拉取当前用户资料（需已登录，走 Bearer 拦截器） */
export async function fetchCurrentUser() {
  const { data } = await client.get('/api/user/me');
  return data?.data ?? null;
}

export async function loginAccount(identifier, password) {
  const { data } = await client.post('/api/auth/login', { identifier, password });
  return data;
}

/** scene: REGISTER | LOGIN */
export async function sendEmailCode(email, scene) {
  const { data } = await client.post('/api/auth/email/send-code', { email, scene });
  return data;
}

export async function loginEmailCode(email, emailCode) {
  const { data } = await client.post('/api/auth/login-email-code', { email, emailCode });
  return data;
}

export async function registerAccount(userName, email, password, confirmPassword, emailCode) {
  const { data } = await client.post('/api/auth/register', {
    userName,
    email,
    password,
    confirmPassword,
    emailCode,
  });
  return data;
}
