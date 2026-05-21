import { parseCompactNumber, formatCompactCount } from './parseCompactNumber';

const FALLBACK_ROLES = '摄影师 · 内容创作者';

function avatarLabelFromName(name) {
  const s = String(name ?? '').trim();
  if (!s) return '作者';
  return s.length <= 2 ? s : s.slice(0, 2);
}

function parsePostDate(post) {
  const raw = post?.date;
  if (!raw) return 0;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function topTagsFromPosts(posts, limit = 3) {
  const freq = new Map();
  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      const t = String(tag).trim();
      if (!t) continue;
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

function bioLines(bio) {
  const text = String(bio ?? '').trim();
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function deriveRoles(posts, profile) {
  const cats = [...new Set(posts.map((p) => p.category).filter(Boolean))].slice(0, 2);
  if (cats.length > 0) {
    return cats.join(' · ');
  }
  return FALLBACK_ROLES;
}

function deriveQuote(bio, posts) {
  const lines = bioLines(bio);
  if (lines[0]) return lines[0].length > 48 ? `${lines[0].slice(0, 48)}…` : lines[0];
  const latest = posts[0];
  const ex = String(latest?.excerpt ?? '').trim();
  if (ex) return ex.length > 48 ? `${ex.slice(0, 48)}…` : ex;
  return '持续更新摄影经验与创作分享。';
}

/**
 * 按 博客总阅读 + 作品总点赞 + 博客评论总数 选出 Top3 作者（每人至少 2 篇已发布博客）
 * @param {{
 *   posts: Array<object>,
 *   works: Array<object>,
 *   profilesByPublicId?: Record<string, object>,
 * }} input
 */
export function buildFeaturedAuthors({ posts, works, profilesByPublicId = {} }) {
  const nameToPublicId = new Map();
  for (const w of works) {
    if (w.authorPublicId != null && w.authorName) {
      nameToPublicId.set(String(w.authorName).trim(), w.authorPublicId);
    }
  }

  /** @type {Map<string, object>} */
  const byKey = new Map();

  const ensureAuthor = (publicId, name, avatarUrl) => {
    const key = String(publicId);
    if (!byKey.has(key)) {
      byKey.set(key, {
        publicId,
        name: name || '社区作者',
        avatarUrl: avatarUrl || null,
        workLikes: 0,
        worksCount: 0,
        totalViews: 0,
        totalComments: 0,
        posts: [],
      });
    }
    const row = byKey.get(key);
    if (name && (!row.name || row.name === '社区作者')) row.name = name;
    if (avatarUrl && !row.avatarUrl) row.avatarUrl = avatarUrl;
    return row;
  };

  for (const w of works) {
    if (w.authorPublicId == null) continue;
    const row = ensureAuthor(w.authorPublicId, w.authorName, w.authorAvatarUrl);
    row.workLikes += w.likeCount ?? 0;
    row.worksCount += 1;
  }

  for (const post of posts) {
    let publicId = post.authorPublicId;
    if (publicId == null && post.author) {
      publicId = nameToPublicId.get(String(post.author).trim()) ?? null;
    }
    if (publicId == null) continue;

    const row = ensureAuthor(publicId, post.author, null);
    row.totalViews += parseCompactNumber(post.views);
    row.totalComments += post.comments ?? 0;
    row.posts.push(post);
  }

  const ranked = [...byKey.values()]
    .map((row) => {
      const blogCount = row.posts.length;
      const score = row.totalViews + row.workLikes + row.totalComments;
      return { ...row, blogCount, score };
    })
    .filter((row) => row.blogCount >= 2)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.blogCount - a.blogCount;
    })
    .slice(0, 3);

  return ranked.map((row) => {
    const profile = profilesByPublicId[String(row.publicId)] ?? null;
    const sortedPosts = [...row.posts].sort((a, b) => parsePostDate(b) - parsePostDate(a));
    const featuredPosts = sortedPosts.slice(0, 2);
    const bio = profile?.bio ?? '';
    const bioArr = bioLines(bio);
    const focusTags = topTagsFromPosts(sortedPosts);

    return {
      id: `author-${row.publicId}`,
      publicId: row.publicId,
      name: profile?.userName || row.name,
      roles: deriveRoles(sortedPosts, profile),
      bio:
        bioArr.length > 0
          ? bioArr
          : ['分享拍摄经验、器材心得与创作记录'],
      buttonLabel: '进入作者专栏',
      worksCount: row.worksCount,
      avatarUrl: profile?.avatarUrl || row.avatarUrl || null,
      avatarLabel: avatarLabelFromName(profile?.userName || row.name),
      focusTags: focusTags.length > 0 ? focusTags : ['摄影创作'],
      quote: deriveQuote(bio, sortedPosts),
      featuredPosts,
      stats: {
        blogCount: row.blogCount,
        worksCount: row.worksCount,
        totalViews: row.totalViews,
        totalComments: row.totalComments,
      },
    };
  });
}

/** @param {ReturnType<buildFeaturedAuthors>[number]} author */
export function featuredAuthorStats(author) {
  const s = author?.stats ?? {};
  return [
    { label: '博客', value: `${s.blogCount ?? 0}` },
    { label: '作品', value: `${s.worksCount ?? 0}` },
    { label: '总阅读', value: formatCompactCount(s.totalViews ?? 0) },
    { label: '讨论', value: `${s.totalComments ?? 0}` },
  ];
}
