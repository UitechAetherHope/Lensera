/**
 * 阻尼弹簧动画：用于首页推荐槽位之间的纵向切换
 * @param {{ from: number, to: number, onUpdate: (v: number) => void, onComplete?: () => void }} opts
 * @returns {() => void} cancel
 */
export function runDampedSpring({ from, to, onUpdate, onComplete }) {
  let value = from;
  let velocity = 0;
  let raf = 0;
  /* 略提高阻尼、略降刚度，减少切换时回弹幅度 */
  const stiffness = 0.072;
  const damping = 0.88;

  const tick = () => {
    velocity = (velocity + (to - value) * stiffness) * damping;
    value += velocity;
    onUpdate(value);
    if (Math.abs(to - value) < 0.35 && Math.abs(velocity) < 0.04) {
      onUpdate(to);
      onComplete?.();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => {
    if (raf) cancelAnimationFrame(raf);
  };
}
