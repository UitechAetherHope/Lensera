/** 未保存焦点时的默认值（与原先 CSS object-position: center 42% 一致） */
export const COVER_FOCUS_DEFAULT_X = 50;
export const COVER_FOCUS_DEFAULT_Y = 42;

export function clampFocus(value, fallback = 50) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

/**
 * 裁切焦点：收起/拉满共用同一锚点，避免画面中心上下跳动。
 * 展开效果由容器增高 + translate/scale 视差完成（见 computeHeroParallax）。
 */
export function coverObjectPosition(focusX, focusY) {
  const fx = clampFocus(focusX, COVER_FOCUS_DEFAULT_X);
  const fy = clampFocus(focusY, COVER_FOCUS_DEFAULT_Y);
  return `${fx}% ${fy}%`;
}

export function parseProfileCoverFocus(profile) {
  return {
    x: clampFocus(profile?.coverFocusX ?? profile?.cover_focus_x, COVER_FOCUS_DEFAULT_X),
    y: clampFocus(profile?.coverFocusY ?? profile?.cover_focus_y, COVER_FOCUS_DEFAULT_Y),
  };
}
