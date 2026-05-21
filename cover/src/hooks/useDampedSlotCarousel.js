import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { runDampedSpring } from '../utils/dampedSpring';

/**
 * 单视窗槽位轮播：滚轮触发下一槽，带阻尼弹簧过渡
 * - axis y：按各槽内容高度取最大值为步长（首页竖向）
 * - axis x：按视窗宽度为步长（博客横向）
 */
export function useDampedSlotCarousel({ slotCount, axis = 'y', resetKey = '' }) {
  const viewportRef = useRef(null);
  const slotRefs = useRef([]);
  const springCancelRef = useRef(null);
  const animatingRef = useRef(false);
  const wheelAccumRef = useRef(0);
  const offsetRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [trackOffset, setTrackOffset] = useState(0);
  const [slotSize, setSlotSize] = useState(0);

  const measure = useCallback(() => {
    if (axis === 'y') {
      const heights = slotRefs.current.map((node) => node?.offsetHeight ?? 0);
      const max = heights.length ? Math.max(...heights) : 0;
      if (max > 0) setSlotSize(max);
      return;
    }

    const el = viewportRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (width > 0) setSlotSize(width);
  }, [axis]);

  useLayoutEffect(() => {
    measure();
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [slotCount, resetKey, measure]);

  useEffect(() => {
    const nodes = slotRefs.current.filter(Boolean);
    const el = viewportRef.current;
    if (!nodes.length && !el) return undefined;

    const ro = new ResizeObserver(() => measure());
    nodes.forEach((node) => ro.observe(node));
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [slotCount, resetKey, measure]);

  useEffect(() => {
    setActiveIndex(0);
    wheelAccumRef.current = 0;
    offsetRef.current = 0;
    setTrackOffset(0);
  }, [resetKey]);

  const goToIndex = useCallback(
    (index) => {
      if (slotSize <= 0 || slotCount === 0) return;
      const next = Math.max(0, Math.min(index, slotCount - 1));
      const target = next * slotSize;
      const from = offsetRef.current;

      if (Math.abs(target - from) < 0.5) {
        setActiveIndex(next);
        return;
      }

      springCancelRef.current?.();
      animatingRef.current = true;

      springCancelRef.current = runDampedSpring({
        from,
        to: target,
        onUpdate: (v) => {
          offsetRef.current = v;
          setTrackOffset(v);
        },
        onComplete: () => {
          offsetRef.current = target;
          setTrackOffset(target);
          setActiveIndex(next);
          animatingRef.current = false;
          springCancelRef.current = null;
        },
      });
    },
    [slotCount, slotSize],
  );

  useEffect(() => {
    if (slotSize <= 0) return;
    const target = activeIndex * slotSize;
    offsetRef.current = target;
    setTrackOffset(target);
  }, [slotSize]);

  useEffect(
    () => () => {
      springCancelRef.current?.();
    },
    [],
  );

  const handleWheel = useCallback(
    (e) => {
      if (slotCount <= 1 || slotSize <= 0) return;

      e.preventDefault();
      e.stopPropagation();

      if (animatingRef.current) return;

      wheelAccumRef.current += e.deltaY;
      const threshold = 36;
      if (Math.abs(wheelAccumRef.current) < threshold) return;

      const dir = wheelAccumRef.current > 0 ? 1 : -1;
      wheelAccumRef.current = 0;
      goToIndex(activeIndex + dir);
    },
    [activeIndex, goToIndex, slotCount, slotSize],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const trackStyle =
    axis === 'x'
      ? { transform: `translate3d(${-trackOffset}px, 0, 0)` }
      : { transform: `translate3d(0, ${-trackOffset}px, 0)` };

  const bindSlotRef = useCallback((index, node) => {
    slotRefs.current[index] = node;
  }, []);

  const slotStepStyle =
    slotSize > 0
      ? axis === 'x'
        ? { flex: `0 0 ${slotSize}px`, width: slotSize, minWidth: slotSize }
        : { flex: `0 0 ${slotSize}px`, minHeight: slotSize }
      : undefined;

  const viewportStyle =
    slotSize > 0
      ? axis === 'x'
        ? undefined
        : { height: slotSize }
      : axis === 'y'
        ? { minHeight: 220 }
        : undefined;

  return {
    viewportRef,
    trackStyle,
    activeIndex,
    goToIndex,
    slotSize,
    bindSlotRef,
    slotStepStyle,
    viewportStyle,
  };
}
