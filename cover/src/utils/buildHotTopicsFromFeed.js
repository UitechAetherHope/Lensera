/** 本周一 0:00（本地时区） */
export function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function parsePostDate(post) {
  const raw = post?.date;
  if (!raw) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isThisWeek(post) {
  const d = parsePostDate(post);
  if (!d) return false;
  return d >= getWeekStart();
}

import { parseCompactNumber } from './parseCompactNumber';

function truncate(text, maxLen) {
  const s = String(text ?? '').trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
}

function rankByDiscussionHeat(posts) {
  return [...posts].sort((a, b) => {
    const c = (b.comments ?? 0) - (a.comments ?? 0);
    if (c !== 0) return c;
    return parseCompactNumber(b.views) - parseCompactNumber(a.views);
  });
}

/**
 * 从博客卡片列表生成「热门话题」3 条（优先本周有更新的帖，按评论数排序）
 * @param {Array<object>} posts mapApiBlogToCard / 占位帖 结构
 * @returns {Array<{
 *   id: string,
 *   title: string,
 *   value: string,
 *   description: string,
 *   query: string,
 *   category: string,
 *   targetPostId: string|number,
 *   comments: number,
 * }>}
 */
export function buildHotTopicsFromPosts(posts) {
  const list = Array.isArray(posts) ? posts : [];
  const weekPosts = list.filter(isThisWeek);
  const pool = weekPosts.length > 0 ? weekPosts : list;
  const top = rankByDiscussionHeat(pool).slice(0, 3);

  return top.map((post) => {
    const comments = post.comments ?? 0;
    const tag = post.tags?.[0] ?? post.category ?? '讨论';
    const key = post.blogId != null ? post.blogId : post.id;
    return {
      id: `hot-${key}`,
      title: post.title ?? '热门讨论',
      value: comments > 0 ? `${comments} 条讨论` : '持续更新',
      description: truncate(post.excerpt || post.heroExcerpt || '', 52),
      query: tag,
      category: post.category ?? '技术分享',
      targetPostId: post.id,
      comments,
    };
  });
}

/**
 * 热度条 7 格高度百分比（与侧栏原样式 --topic-heat 一致）
 * @param {Array<object>} posts
 * @param {number} barCount
 * @returns {number[]}
 */
export function buildHotMeterHeights(posts, barCount = 7) {
  const list = Array.isArray(posts) ? posts : [];
  const weekPosts = list.filter(isThisWeek);
  const pool = weekPosts.length > 0 ? weekPosts : list;
  const ranked = rankByDiscussionHeat(pool).slice(0, barCount);
  const maxComments = Math.max(1, ...ranked.map((p) => p.comments ?? 0), 1);
  const heights = ranked.map((p) => {
    const ratio = (p.comments ?? 0) / maxComments;
    return Math.round(38 + ratio * 56);
  });
  const fallback = [58, 86, 72, 94, 64, 78, 68];
  while (heights.length < barCount) {
    heights.push(fallback[heights.length % fallback.length]);
  }
  return heights.slice(0, barCount);
}
