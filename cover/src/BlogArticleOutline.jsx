import { ChevronDownIcon, ChevronUpIcon } from '@primer/octicons-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @param {{
 *   items: Array<{ id: string, level: number, text: string }>,
 *   scrollRoot?: HTMLElement | null,
 * }} props
 */
export default function BlogArticleOutline({ items, scrollRoot = null }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? null);
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef(null);

  const scrollToHeading = useCallback((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  }, []);

  useEffect(() => {
    if (!items.length) return undefined;

    const headings = items.map((item) => document.getElementById(item.id)).filter(Boolean);
    if (!headings.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root: scrollRoot ?? null,
        rootMargin: '-80px 0px -65% 0px',
        threshold: [0, 1],
      },
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items, scrollRoot]);

  useEffect(() => {
    if (!activeId || !listRef.current) return;
    listRef.current.querySelector(`[data-toc-id="${activeId}"]`)?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [activeId]);

  if (!items.length) return null;

  return (
    <nav className={`blog-article-outline${collapsed ? ' is-collapsed' : ''}`} aria-label="文章目录">
      <div className="blog-article-outline__head">目录</div>
      {!collapsed && (
        <ol ref={listRef} className="blog-article-outline__list">
          {items.map((item) => (
            <li
              key={item.id}
              className={`blog-article-outline__item blog-article-outline__item--level-${item.level}`}
            >
              <button
                type="button"
                data-toc-id={item.id}
                className={`blog-article-outline__link${activeId === item.id ? ' is-active' : ''}`}
                onClick={() => scrollToHeading(item.id)}
                title={item.text}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        className="blog-article-outline__toggle"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <>
            展开
            <ChevronDownIcon size={14} />
          </>
        ) : (
          <>
            收起
            <ChevronUpIcon size={14} />
          </>
        )}
      </button>
    </nav>
  );
}
