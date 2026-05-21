import './HomeEditor.css';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { fetchCurrentUser, mergeStoredUser, readStoredUser } from './api/auth';
import logo from './assets/blog-cover.jpg';
import { authorAvatarSrc } from './utils/authorAvatar';
import FlowingMenu from './components/FlowingMenu';
import menulcon1 from './assets/1.jpg';
import menulcon2 from './assets/2.jpg';
import menulcon3 from './assets/3.jpg';
import menulcon4 from './assets/4.jpg';
import menulcon5 from './assets/5.jpg';

const demoItems = [
  { link: '/editor/home', text: '首页', image: menulcon5 },
  { link: '/editor/works', text: '作品', image: menulcon1 },
  { link: '/editor/blog', text: '博客', image: menulcon2 },
  { link: '/editor/about', text: '关于', image: menulcon3 },
  { link: '/editor/contact', text: '联系', image: menulcon4 },
];

function isNavActive(pathname, href) {
  if (href === '/editor/home') {
    return pathname === '/editor/home' || pathname === '/editor';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function HomeEditor() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarUser, setSidebarUser] = useState(() => readStoredUser());

  const sidebarAvatarSrc = useMemo(
    () => authorAvatarSrc(sidebarUser?.avatarUrl, sidebarUser?.userName || '我'),
    [sidebarUser?.avatarUrl, sidebarUser?.userName],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSidebarUser() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setSidebarUser(readStoredUser());
        return;
      }
      try {
        const me = await fetchCurrentUser();
        if (cancelled || !me) {
          return;
        }
        setSidebarUser(me);
        mergeStoredUser({
          userName: me.userName,
          publicId: me.publicId,
          avatarUrl: me.avatarUrl,
        });
      } catch {
        if (!cancelled) {
          setSidebarUser(readStoredUser());
        }
      }
    }

    loadSidebarUser();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const menu = document.querySelector('.editor-sidebar .menu');
    if (!menu) {
      return undefined;
    }

    const onClick = (event) => {
      const anchor = event.target.closest('a.menu__item-link');
      if (!anchor) {
        return;
      }
      const href = anchor.getAttribute('href');
      if (href?.startsWith('/editor')) {
        event.preventDefault();
        navigate(href);
      }
    };

    menu.addEventListener('click', onClick);
    return () => menu.removeEventListener('click', onClick);
  }, [navigate]);

  useEffect(() => {
    document.querySelectorAll('.editor-sidebar .menu__item').forEach((item) => {
      const anchor = item.querySelector('a.menu__item-link');
      const href = anchor?.getAttribute('href');
      item.classList.toggle('is-route-active', href ? isNavActive(pathname, href) : false);
    });
  }, [pathname]);

  return (
    <div className="home-editor-page">
      <aside className="editor-sidebar">
        <div className="editor-sidebar__brand">
          <img src={logo} alt="" className="editor-sidebar__logo" />
          <div className="editor-sidebar__brand-text">
            <span className="editor-sidebar__site">Lensera</span>
            <span className="editor-sidebar__tagline">发现 · 分享 · 交流</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="主菜单">
          <div className="editor-flow-menu">
            <FlowingMenu
              items={demoItems}
              speed={15}
              textColor="rgba(237, 242, 255, 0.88)"
              bgColor="transparent"
              marqueeBgColor="#eef2ff"
              marqueeTextColor="#12141c"
              borderColor="transparent"
            />
          </div>
        </nav>

        <button type="button" className="editor-sidebar__user" onClick={() => navigate('/editor/user')}>
          <span className="editor-sidebar__avatar">
            <img src={sidebarAvatarSrc} alt="" className="editor-sidebar__avatar-img" />
          </span>
          <span className="editor-sidebar__user-label">我的</span>
        </button>
      </aside>

      <div className="editor-content">
        <Outlet />
      </div>
    </div>
  );
}
