const BLOG_ROUTE = '/editor/blog';

/** @param {string|number} postId @param {{ from?: 'mine', publicId?: string|number|null }} [opts] */
export function getBlogDetailPath(postId, opts) {
  const base = `${BLOG_ROUTE}/${postId}`;
  if (opts?.from !== 'mine') return base;
  const params = new URLSearchParams({ from: 'mine' });
  if (opts.publicId != null && opts.publicId !== '') {
    params.set('publicId', String(opts.publicId));
  }
  return `${base}?${params.toString()}`;
}

/** @param {string|number|null|undefined} publicId */
export function getMineProfilePath(publicId) {
  if (publicId != null && publicId !== '') {
    return `/editor/user/${publicId}`;
  }
  return '/editor/user';
}
