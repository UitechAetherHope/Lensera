/** 每槽严格只取该作者自己的两篇（按 publicId 二次校验） */
export function getAuthorSlotPosts(author, allApiPosts = []) {
  const pid = author?.publicId;

  if (author?.featuredPostIds?.length && allApiPosts.length) {
    const fromIds = author.featuredPostIds
      .map((postId) => allApiPosts.find((post) => post.id === postId))
      .filter(Boolean);
    if (fromIds.length > 0) return fromIds.slice(0, 2);
  }

  const fromFeatured = Array.isArray(author?.featuredPosts) ? author.featuredPosts : [];
  const own = fromFeatured.filter((post) => {
    if (pid == null) return true;
    if (post.authorPublicId == null) return post.author === author.name;
    return String(post.authorPublicId) === String(pid);
  });
  if (own.length > 0) return own.slice(0, 2);

  if (pid == null) return [];
  return allApiPosts
    .filter((post) => String(post.authorPublicId) === String(pid))
    .slice(0, 2);
}
