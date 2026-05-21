/**
 * 首页「精选作品」五分类推荐：封面由点赞 + 发布时间加权选取。
 * 数据来自 GET /api/works/feed；结果带本地缓存，定期刷新。
 */

export const HOME_FEATURED_CATEGORIES = ['风景', '人物', '动物', '街拍', '静物'];

/** 缓存有效期：6 小时（毫秒） */
export const HOME_FEATURED_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const CACHE_KEY = 'home:featured-works:v1';

/** 无作品时的占位图（保持原卡片视觉） */
const FALLBACK_BY_CATEGORY = {
  风景: 'https://picsum.photos/seed/home-scape/600/440',
  人物: 'https://picsum.photos/seed/home-portrait/600/440',
  动物: 'https://picsum.photos/seed/home-animal/600/440',
  街拍: 'https://picsum.photos/seed/home-street/600/440',
  静物: 'https://picsum.photos/seed/home-still/600/440',
};

/** 点赞权重 α（其余 1-α 给发布时间新鲜度） */
export const HOME_SPOTLIGHT_ALPHA = 0.6;

/** 时间半衰期（天） */
export const HOME_SPOTLIGHT_HALF_LIFE_DAYS = 30;

/** 超过该天数的作品时间分视为 0 */
export const HOME_SPOTLIGHT_MAX_AGE_DAYS = 90;

const MS_PER_DAY = 86400000;

/**
 * 时间新鲜度 R ∈ [0,1]，半衰期 30 天
 * @param {number} createdAtEpochMs
 * @param {number} nowMs
 */
export function recencyScore(createdAtEpochMs, nowMs = Date.now()) {
  if (!createdAtEpochMs || createdAtEpochMs <= 0) return 0.35;
  const ageDays = (nowMs - createdAtEpochMs) / MS_PER_DAY;
  if (ageDays >= HOME_SPOTLIGHT_MAX_AGE_DAYS) return 0;
  if (ageDays <= 0) return 1;
  return Math.exp((-Math.LN2 * ageDays) / HOME_SPOTLIGHT_HALF_LIFE_DAYS);
}

/**
 * 点赞热度 H ∈ [0,1]，对数归一化
 * @param {number} likeCount
 * @param {number} maxLikesInCategory
 */
export function likeHeatScore(likeCount, maxLikesInCategory) {
  const maxL = Math.max(1, maxLikesInCategory);
  return Math.log(1 + Math.max(0, likeCount)) / Math.log(1 + maxL);
}

/**
 * 综合得分 S = α·H + (1-α)·R
 * @param {number} likeCount
 * @param {number} maxLikes
 * @param {number} createdAtEpochMs
 * @param {number} nowMs
 */
export function spotlightScore(likeCount, maxLikes, createdAtEpochMs, nowMs = Date.now()) {
  const h = likeHeatScore(likeCount, maxLikes);
  const r = recencyScore(createdAtEpochMs, nowMs);
  return HOME_SPOTLIGHT_ALPHA * h + (1 - HOME_SPOTLIGHT_ALPHA) * r;
}

function pickCoverImage(row) {
  return row?.thumbnailUrl || row?.imageUrl || '';
}

/**
 * @param {Array<object>} feedRows WorkFeedCardResponse[]
 * @param {number} [nowMs]
 * @returns {Array<{ title: string, category: string, count: number, image: string, workId: number|null }>}
 */
export function buildFeaturedWorksFromFeed(feedRows, nowMs = Date.now()) {
  const rows = Array.isArray(feedRows) ? feedRows : [];
  const byCat = new Map();
  for (const cat of HOME_FEATURED_CATEGORIES) {
    byCat.set(cat, []);
  }
  for (const row of rows) {
    const cat = row?.category;
    if (!cat || !byCat.has(cat)) continue;
    byCat.get(cat).push(row);
  }

  return HOME_FEATURED_CATEGORIES.map((category) => {
    const list = byCat.get(category) ?? [];
    const count = list.length;
    const maxLikes = Math.max(1, ...list.map((w) => w.likeCount ?? 0));

    let best = null;
    let bestScore = -1;
    for (const w of list) {
      const img = pickCoverImage(w);
      if (!img) continue;
      const score = spotlightScore(w.likeCount ?? 0, maxLikes, w.createdAtEpochMs ?? 0, nowMs);
      if (score > bestScore) {
        bestScore = score;
        best = w;
      }
    }

    const image = best ? pickCoverImage(best) : FALLBACK_BY_CATEGORY[category];
    return {
      title: category,
      category,
      count,
      image,
      workId: best?.workId ?? null,
    };
  });
}

export function readFeaturedWorksCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || !Array.isArray(parsed.cards)) return null;
    if (Date.now() - parsed.savedAt > HOME_FEATURED_CACHE_TTL_MS) return null;
    return parsed.cards;
  } catch {
    return null;
  }
}

/** @param {ReturnType<typeof buildFeaturedWorksFromFeed>} cards */
export function writeFeaturedWorksCache(cards) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), cards }),
    );
  } catch {
    /* quota */
  }
}

/** 默认展示（首屏 / 接口失败） */
export function defaultFeaturedWorks() {
  return HOME_FEATURED_CATEGORIES.map((category) => ({
    title: category,
    category,
    count: 0,
    image: FALLBACK_BY_CATEGORY[category],
    workId: null,
  }));
}
