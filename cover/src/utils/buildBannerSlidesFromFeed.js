/**
 * 首页 Banner：从全站作品流（图片库）按点赞数取 Top N 作为轮播图。
 * @param {Array<object>} feedRows WorkFeedCardResponse[]
 * @param {number} [limit]
 * @returns {Array<{ workId: number, image: string, likeCount: number, title: string }>}
 */
export function buildBannerSlidesFromFeed(feedRows, limit = 5) {
  const rows = Array.isArray(feedRows) ? feedRows : [];
  const slides = rows
    .map((row) => {
      const image = row?.thumbnailUrl || row?.imageUrl || '';
      if (!image || row?.workId == null) return null;
      return {
        workId: row.workId,
        image,
        likeCount: row.likeCount ?? 0,
        title: row.title ?? '',
      };
    })
    .filter(Boolean);

  slides.sort((a, b) => b.likeCount - a.likeCount || b.workId - a.workId);
  return slides.slice(0, limit);
}

export const HOME_BANNER_FALLBACK_IMAGE = 'https://picsum.photos/seed/photographer/1920/600';
