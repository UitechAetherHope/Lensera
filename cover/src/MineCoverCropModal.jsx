import { useCallback, useEffect, useRef, useState } from 'react';
import './MineCoverCropModal.css';
import { clampFocus, COVER_FOCUS_DEFAULT_Y, coverObjectPosition } from './utils/coverFocus';

const DRAG_SENSITIVITY = 0.22;

/**
 * @param {{
 *   open: boolean,
 *   imageSrc: string,
 *   imageFile?: File | null,
 *   initialFocus?: { x?: number, y?: number },
 *   onConfirm: (result: { file: File | null, focusX: number, focusY: number }) => void,
 *   onClose: () => void,
 * }} props
 */
export default function MineCoverCropModal({
  open,
  imageSrc,
  imageFile = null,
  initialFocus,
  onConfirm,
  onClose,
}) {
  const [focusX, setFocusX] = useState(50);
  const [focusY, setFocusY] = useState(COVER_FOCUS_DEFAULT_Y);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setFocusX(clampFocus(initialFocus?.x, 50));
    setFocusY(clampFocus(initialFocus?.y, COVER_FOCUS_DEFAULT_Y));
    dragRef.current = null;
  }, [open, imageSrc, initialFocus?.x, initialFocus?.y]);

  const applyDrag = useCallback((clientX, clientY) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    const w = Math.max(drag.rectW, 1);
    const h = Math.max(drag.rectH, 1);
    setFocusX(clampFocus(drag.startFocusX + (dx / w) * 100 * DRAG_SENSITIVITY));
    setFocusY(clampFocus(drag.startFocusY - (dy / h) * 100 * DRAG_SENSITIVITY));
  }, []);

  const onStagePointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startFocusX: focusX,
        startFocusY: focusY,
        rectW: rect.width,
        rectH: rect.height,
        pointerId: e.pointerId,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [focusX, focusY],
  );

  const onStagePointerMove = useCallback(
    (e) => {
      if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
      applyDrag(e.clientX, e.clientY);
    },
    [applyDrag],
  );

  const onStagePointerUp = useCallback((e) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* 已释放 */
    }
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm({
      file: imageFile ?? null,
      focusX: clampFocus(focusX),
      focusY: clampFocus(focusY),
    });
  }, [imageFile, focusX, focusY, onConfirm]);

  if (!open || !imageSrc) return null;

  const pos = coverObjectPosition(focusX, focusY);

  return (
    <div
      className="mine-upload-overlay cover-crop-overlay"
      role="presentation"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="mine-upload-dialog cover-crop-dialog"
        role="dialog"
        aria-labelledby="cover-crop-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mine-upload-dialog-head">
          <h2 id="cover-crop-title" className="mine-upload-dialog-title">
            调整背景显示区域
          </h2>
          <button type="button" className="mine-upload-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <p className="cover-crop-intro">
          拖动图片选定焦点区域；收起与拉满时保持同一对齐点，展开效果由主页下拉动画呈现。
        </p>

        <div className="cover-crop-main">
          <span className="cover-crop-frame__label">拉满时（主要调整）</span>
          <div
            className="cover-crop-stage cover-crop-stage--interactive"
            style={{ aspectRatio: '2.35 / 1' }}
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
            onPointerCancel={onStagePointerUp}
          >
            <img
              src={imageSrc}
              alt=""
              className="cover-crop-stage__img"
              style={{ objectPosition: pos }}
              draggable={false}
            />
            <span className="cover-crop-stage__hint">拖动图片调整位置</span>
          </div>
        </div>

        <div className="cover-crop-rest-row">
          <div>
            <span className="cover-crop-frame__label">收起时</span>
            <div className="cover-crop-stage cover-crop-stage--mini" style={{ aspectRatio: '4.2 / 1' }}>
              <img
                src={imageSrc}
                alt=""
                className="cover-crop-stage__img"
                style={{ objectPosition: pos }}
                draggable={false}
              />
            </div>
          </div>
          <div>
            <span className="cover-crop-frame__label">拉满时</span>
            <div className="cover-crop-stage cover-crop-stage--mini" style={{ aspectRatio: '2.35 / 1' }}>
              <img
                src={imageSrc}
                alt=""
                className="cover-crop-stage__img"
                style={{ objectPosition: pos }}
                draggable={false}
              />
            </div>
          </div>
        </div>

        <div className="cover-crop-sliders">
          <label className="cover-crop-slider">
            水平 {focusX}%
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={focusX}
              onChange={(e) => setFocusX(clampFocus(Number(e.target.value)))}
            />
          </label>
          <label className="cover-crop-slider">
            垂直 {focusY}%
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={focusY}
              onChange={(e) => setFocusY(clampFocus(Number(e.target.value)))}
            />
          </label>
        </div>

        <div className="cover-crop-actions mine-upload-actions">
          <button type="button" className="mine-upload-btn mine-upload-btn--ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" className="mine-upload-btn mine-upload-btn--primary" onClick={handleConfirm}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
