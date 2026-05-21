import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchWorksFeed } from './api/works';
import HomeBannerCarousel from './HomeBannerCarousel';
import {
  buildBannerSlidesFromFeed,
  HOME_BANNER_FALLBACK_IMAGE,
} from './utils/buildBannerSlidesFromFeed';
import {
  buildFeaturedWorksFromFeed,
  defaultFeaturedWorks,
  readFeaturedWorksCache,
  writeFeaturedWorksCache,
} from './utils/homeFeaturedWorks';
import HomeFeaturedBlogSection from './HomeFeaturedBlogSection';
import './Home.css';

function worksCategoryHref(category) {
  return `/editor/works?cat=${encodeURIComponent(category)}`;
}

export default function Home() {
  const [featuredWorks, setFeaturedWorks] = useState(() => readFeaturedWorksCache() ?? defaultFeaturedWorks());
  const [bannerSlides, setBannerSlides] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchWorksFeed()
      .then((rows) => {
        if (cancelled) return;
        const cards = buildFeaturedWorksFromFeed(rows);
        setFeaturedWorks(cards);
        writeFeaturedWorksCache(cards);
        setBannerSlides(buildBannerSlidesFromFeed(rows, 5));
      })
      .catch(() => {
        if (!cancelled) {
          const cached = readFeaturedWorksCache();
          if (cached) setFeaturedWorks(cached);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home-container">
      <HomeBannerCarousel slides={bannerSlides} fallbackImage={HOME_BANNER_FALLBACK_IMAGE} />

      <section className="featured-works">
        <div className="section-header">
          <h2>精选作品</h2>
          <Link to="/editor/works" className="view-all">
            查看全部 →
          </Link>
        </div>
        <div className="works-grid">
          {featuredWorks.map((work) => (
            <Link
              key={work.category}
              to={worksCategoryHref(work.category)}
              className="work-card work-card--link"
              aria-label={`查看${work.title}分类作品`}
            >
              <img src={work.image} alt="" className="work-img" loading="lazy" decoding="async" />
              <div className="work-info">
                <h3>{work.title}</h3>
                <p>{work.count > 0 ? `${work.count} 张作品` : '暂无作品'}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <HomeFeaturedBlogSection />
    </div>
  );
}
