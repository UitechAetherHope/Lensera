import client from '../api/client';

const WATERMARK_TEXT = 'Lensera';

/**
 * @param {string} imageUrl
 * @returns {string}
 */
function toApiPath(imageUrl) {
  if (!imageUrl || !String(imageUrl).trim()) {
    throw new Error('无可用图片');
  }
  const raw = String(imageUrl).trim();
  if (raw.startsWith('/')) return raw;
  try {
    const u = new URL(raw);
    return u.pathname;
  } catch {
    return raw.startsWith('/') ? raw : `/${raw}`;
  }
}

/**
 * @param {string} name
 */
function sanitizeFilename(name) {
  const base = String(name || 'work')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return base || 'work';
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {string} text
 */
function drawLenseraWatermark(ctx, w, h, text) {
  const fontSize = Math.max(20, Math.round(Math.min(w, h) * 0.032));
  const padX = fontSize * 0.75;
  const padY = fontSize * 0.55;
  const margin = Math.max(16, Math.round(Math.min(w, h) * 0.02));

  ctx.save();
  ctx.font = `600 ${fontSize}px "Inter", "Segoe UI", "Microsoft Yahei", sans-serif`;
  const tw = ctx.measureText(text).width;
  const boxW = tw + padX * 2;
  const boxH = fontSize + padY * 2;
  const x = w - boxW - margin;
  const y = h - boxH - margin;

  ctx.fillStyle = 'rgba(8, 10, 16, 0.52)';
  ctx.beginPath();
  const r = Math.min(10, boxH * 0.22);
  ctx.roundRect(x, y, boxW, boxH, r);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + boxH / 2);
  ctx.restore();
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * 拉取作品原图、绘制水印并触发浏览器下载。
 * @param {string} imageUrl 大图 URL（/files/... 或完整地址）
 * @param {{ filename?: string, watermark?: string }} [options]
 */
export async function downloadWorkWithWatermark(imageUrl, options = {}) {
  const watermark = options.watermark ?? WATERMARK_TEXT;
  const path = toApiPath(imageUrl);
  const { data: blob } = await client.get(path, { responseType: 'blob', timeout: 120000 });
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('图片加载失败');
  }

  const mime = blob.type || 'image/jpeg';
  const preferJpeg = mime.includes('jpeg') || mime.includes('jpg') || mime.includes('webp');
  const outMime = preferJpeg ? 'image/jpeg' : 'image/png';
  const ext = outMime === 'image/jpeg' ? 'jpg' : 'png';

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    throw new Error('无法处理图片');
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  drawLenseraWatermark(ctx, canvas.width, canvas.height, watermark);

  const outBlob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('导出失败'))),
      outMime,
      outMime === 'image/jpeg' ? 0.92 : undefined,
    );
  });

  const safe = sanitizeFilename(options.filename);
  triggerDownload(outBlob, `${safe}-lensera.${ext}`);
}
