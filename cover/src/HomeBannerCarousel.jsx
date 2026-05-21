import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HOME_BANNER_FALLBACK_IMAGE } from './utils/buildBannerSlidesFromFeed';

const AUTO_MS = 3000;

/** @param {{ direction: 'prev' | 'next' }} props */
function BannerChevron({ direction }) {
  return (
    <span className="banner-nav-icon" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d={direction === 'prev' ? 'M14.5 7.5L9 12l5.5 4.5' : 'M9.5 7.5L15 12l-5.5 4.5'}
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * @param {{
 *   slides: Array<{ workId: number, image: string, title?: string }>,
 *   fallbackImage?: string,
 * }} props
 */
export default function HomeBannerCarousel({ slides, fallbackImage = HOME_BANNER_FALLBACK_IMAGE }) {
  const items =
    slides.length > 0
      ? slides
      : [{ workId: 0, image: fallbackImage, title: '' }];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (next) => {
      setIndex(((next % items.length) + items.length) % items.length);
    },
    [items.length],
  );

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    setIndex((i) => (i >= items.length ? 0 : i));
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1 || paused) return undefined;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [items.length, paused]);

  const currentSlide = items[index];
  const exploreHref =
    currentSlide?.workId > 0 ? `/editor/works?work=${currentSlide.workId}` : '/editor/works';

  return (
    <section
      className="banner-section"
      aria-label="首页推荐轮播"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="banner-bg">
        <div className="banner-carousel-slides">
          {items.map((slide, i) => (
            <img
              key={slide.workId ?? `slide-${i}`}
              src={slide.image}
              alt={slide.title ? `${slide.title} 作品封面` : '推荐作品'}
              className={`banner-img${i === index ? ' is-active' : ''}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          ))}
        </div>
        <div className="banner-overlay" />
        {items.length > 1 && (
          <>
            <button
              type="button"
              className="banner-nav banner-nav--prev"
              aria-label="上一张"
              onClick={goPrev}
            >
              <BannerChevron direction="prev" />
            </button>
            <button
              type="button"
              className="banner-nav banner-nav--next"
              aria-label="下一张"
              onClick={goNext}
            >
              <BannerChevron direction="next" />
            </button>
          </>
        )}
        {items.length > 1 && (
          <div className="banner-dots" role="tablist" aria-label="轮播切换">
            {items.map((slide, i) => (
              <button
                key={slide.workId ?? `dot-${i}`}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`第 ${i + 1} 张`}
                className={`banner-dot${i === index ? ' is-active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        )}
      </div>
      <div className="banner-content">
        <h1 className="banner-title">
          用镜头记录世界
          <br />
          用影像讲述故事
        </h1>
        <p className="banner-desc">探索光影的魅力，定格每一个值得铭记的瞬间。</p>
        <Link
          key={exploreHref}
          to={exploreHref}
          className="banner-cta"
          aria-label={
            currentSlide?.workId > 0 && currentSlide?.title
              ? `查看作品：${currentSlide.title}`
              : '探索作品'
          }
        >
          探索作品
          <span className="banner-cta-arrow" aria-hidden>
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
