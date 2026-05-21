/** 解析 "1.2k" / 数字字符串为整数 */
export function parseCompactNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 0;
  if (normalized.endsWith('k')) {
    return Math.round(Number.parseFloat(normalized.slice(0, -1)) * 1000) || 0;
  }
  return Number.parseInt(normalized, 10) || 0;
}

export function formatCompactCount(value) {
  if (value >= 1000) {
    const compact = value / 1000;
    return `${compact >= 10 ? compact.toFixed(0) : compact.toFixed(1)}k`;
  }
  return `${value}`;
}
