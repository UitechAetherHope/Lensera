import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Mine.css';
import { clearAuth, fetchCurrentUser, readStoredUser } from './api/auth';
import { fetchWorksByPublicId } from './api/works';
import { fetchPublicProfile, followUser, unfollowUser } from './api/users';
import MineBlogPanel from './MineBlogPanel';
import MineEditProfileModal from './MineEditProfileModal';
import MineUploadHubModal from './MineUploadHubModal';
import TiltWorksPanel from './TiltWorksPanel';
import { coverObjectPosition, parseProfileCoverFocus } from './utils/coverFocus';

function formatStat(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function apiErrMessage(err) {
  return err?.response?.data?.message || err?.message || '请求失败';
}

/** 未配置主页背景时的占位图（后续可换为 profile.coverUrl 等字段） */
const MINE_DEFAULT_COVER_URL =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1800&q=80';

/** 拉满时封面区约占主滚动区高度（≥ 2/3 视窗） */
const HERO_VIEWPORT_FRACTION = 0.72;
const HERO_BASE_MIN = 200;
const HERO_BASE_MAX = 300;
const HERO_BASE_VH_FACTOR = 0.34;
const HERO_PULL_MIN = 300;
const HERO_PULL_MAX_FALLBACK = 420;
/** 判定背景交互是否已结束（目标/显示均回到原位） */
const HERO_IDLE_EPSILON = 0.4;
/** 显示值跟随目标的角频率（越大越跟手，仍保持平滑） */
const HERO_SMOOTH_OMEGA = 16;
const WHEEL_PULL_GAIN = 0.38;
const WHEEL_RELEASE_GAIN = 0.5;
const TOUCH_PULL_GAIN = 0.58;
/** 未锁定时停手后缓慢收回 */
const IDLE_PARTIAL_MS = 420;
const IDLE_RETRACT_K = 0.965;
/** 点击展开/收起：总时长与显示层跟随速度（越小越丝滑） */
const HERO_CLICK_ANIM_MS = 1680;
const HERO_CLICK_ANIM_DISPLAY_OMEGA = 5.2;

function easeOutQuint(t) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 5;
}

function computeHeroLayoutMetrics(scrollHeight) {
  const h = Math.max(480, scrollHeight || 800);
  const base = Math.round(Math.min(HERO_BASE_MAX, Math.max(HERO_BASE_MIN, h * HERO_BASE_VH_FACTOR)));
  const pullMax = Math.max(HERO_PULL_MIN, Math.round(h * HERO_VIEWPORT_FRACTION - base));
  return { base, pullMax };
}

function resolveMineScrollEl(root) {
  if (!root) return null;
  return root.closest('.editor-content') || null;
}

/** 弹窗层内的事件不应触发主页背景过滚逻辑 */
function isEventInsideMineModal(event) {
  const t = event.target;
  return t instanceof Element && !!t.closest('.mine-upload-overlay, .cover-crop-overlay');
}

/** 越接近上限阻力越大，整体仍连续可导感 */
function heroRubberFactor(pull, max) {
  const x = Math.min(1, Math.max(0, pull / max));
  const t = x * x * (3 - 2 * x);
  return 0.12 + 0.88 * (1 - t) * (1 - t);
}

/** 底部蒙版：随 pullT 连续插值，避免类名切换导致卡顿 */
function computeHeroScrimStyle(pullT) {
  const t = Math.min(1, Math.max(0, pullT));
  const u = t * t * (3 - 2 * t);
  const bottomA = 0.9 * (1 - u) + 0.05 * u;
  const midA = 0.36 * (1 - u) + 0.02 * u;
  const heightPct = 56 - u * 22;
  return {
    height: `${heightPct}%`,
    background: `linear-gradient(to top, rgba(8, 8, 12, ${bottomA.toFixed(3)}) 0%, rgba(8, 8, 12, ${midA.toFixed(3)}) 52%, transparent 100%)`,
    opacity: 1,
  };
}

/** 下拉位移 → 各层视差（与早期版本一致：位移/缩放由 pull 驱动） */
function computeHeroParallax(pullPx, pullMax, focusX, focusY) {
  const max = Math.max(1, pullMax);
  const p = Math.max(0, pullPx);
  const pullT = Math.min(1, p / max);
  const coverScale = 1 + pullT * 0.062;
  const tyCover = -p * 0.158;
  const tyScrim = p * 0.06 * pullT;
  const tyFloat = -p * 0.041;
  const fgScale = 1 - pullT * 0.015;
  const scrimBase = computeHeroScrimStyle(pullT);
  const textShadowA = 0.52 * (1 - pullT) + 0.12 * pullT;
  return {
    coverTransform: `translate3d(0, ${tyCover}px, 0) scale(${coverScale})`,
    coverObjectPosition: coverObjectPosition(focusX, focusY),
    scrimStyle: {
      ...scrimBase,
      transform: `translate3d(0, ${tyScrim}px, 0)`,
    },
    floatStyle: {
      transform: `translate3d(0, ${tyFloat}px, 0) scale(${fgScale})`,
      transformOrigin: 'center bottom',
      filter: `drop-shadow(0 2px 14px rgba(0, 0, 0, ${textShadowA.toFixed(3)}))`,
    },
  };
}

export default function Mine() {
  const { publicId: publicIdParam } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('works');
  const tabContentRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followBusy, setFollowBusy] = useState(false);
  /** @type {[{ tab?: 'works'|'blog', editBlogId?: number, editWorkId?: number } | null]} */
  const [uploadHub, setUploadHub] = useState(null);

  const openUploadHub = useCallback((opts = {}) => {
    setUploadHub({
      tab: opts.tab ?? 'works',
      editBlogId: opts.editBlogId ?? null,
      editWorkId: opts.editWorkId ?? null,
    });
  }, []);

  const closeUploadHub = useCallback(() => setUploadHub(null), []);
  const [blogListVersion, setBlogListVersion] = useState(0);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [worksList, setWorksList] = useState([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [heroPullPx, setHeroPullPx] = useState(0);
  const [heroLayout, setHeroLayout] = useState(() => computeHeroLayoutMetrics(800));
  const [heroClickAnimating, setHeroClickAnimating] = useState(false);

  const mineRootRef = useRef(null);
  const mineModalOpenRef = useRef(false);
  mineModalOpenRef.current = !!uploadHub || editProfileOpen;
  const clearHeroStretchRef = useRef(null);
  const heroPullMaxRef = useRef(HERO_PULL_MAX_FALLBACK);
  const heroTargetRef = useRef(0);
  const heroDisplayRef = useRef(0);
  const heroLockedRef = useRef(false);
  const heroLoopRef = useRef(null);
  const heroLastTRef = useRef(0);
  const idlePartialTimerRef = useRef(null);
  const idleRetractRef = useRef(false);
  const touchLastYRef = useRef(0);
  const heroScrollElRef = useRef(null);
  const heroExpandRef = useRef(null);
  const heroCollapseRef = useRef(null);
  const heroClickAnimRef = useRef(null);
  const setHeroClickAnimatingRef = useRef(setHeroClickAnimating);
  setHeroClickAnimatingRef.current = setHeroClickAnimating;

  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'blog') {
      requestAnimationFrame(() => {
        tabContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, []);

  const tokenPresent = typeof window !== 'undefined' && !!localStorage.getItem('token');
  const stored = readStoredUser();

  const isSelf = useMemo(() => {
    if (!publicIdParam) return true;
    if (stored?.publicId == null) return false;
    return String(stored.publicId) === String(publicIdParam);
  }, [publicIdParam, stored?.publicId]);

  const loadWorks = useCallback(async () => {
    const pid = profile?.publicId;
    if (pid == null) return;
    setWorksLoading(true);
    try {
      const list = await fetchWorksByPublicId(pid);
      setWorksList(Array.isArray(list) ? list : []);
    } catch {
      setWorksList([]);
    } finally {
      setWorksLoading(false);
    }
  }, [profile?.publicId]);

  /** 顶部获赞/关注/粉丝与后端对齐（点赞、取消赞、上传后调用） */
  const refreshProfileStats = useCallback(async () => {
    const pid = profile?.publicId;
    if (pid == null) return;
    try {
      const pub = await fetchPublicProfile(pid);
      setProfile((prev) => (prev ? { ...prev, ...pub } : prev));
    } catch {
      /* 静默 */
    }
  }, [profile?.publicId]);

  const refreshWorksAndProfile = useCallback(async () => {
    await loadWorks();
    await refreshProfileStats();
  }, [loadWorks, refreshProfileStats]);

  /** AI 打标签为异步，上传后轮询列表直至出现 category 或超时 */
  const pollWorksAfterAiTag = useCallback(async () => {
    const pid = profile?.publicId;
    if (pid == null) return;
    const delays = [2000, 4000, 6000, 10000, 15000, 25000];
    for (const ms of delays) {
      await new Promise((r) => setTimeout(r, ms));
      try {
        const list = await fetchWorksByPublicId(pid);
        const rows = Array.isArray(list) ? list : [];
        setWorksList(rows);
        if (rows.some((w) => w?.category)) return;
      } catch {
        /* 继续轮询 */
      }
    }
  }, [profile?.publicId]);

  /** 编辑主页保存后：同步公开资料与 /api/user/me */
  const refreshProfileAfterEdit = useCallback(async () => {
    const pid = profile?.publicId;
    if (pid == null) return;
    try {
      const pub = await fetchPublicProfile(Number(pid));
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ...pub,
              userName: pub?.userName ?? prev.userName,
              avatarUrl: pub?.avatarUrl ?? prev.avatarUrl,
              coverImageUrl: pub?.coverUrl ?? prev.coverImageUrl,
              coverUrl: pub?.coverUrl ?? prev.coverUrl,
              coverFocusX: pub?.coverFocusX ?? prev.coverFocusX,
              coverFocusY: pub?.coverFocusY ?? prev.coverFocusY,
              bio: pub?.bio ?? prev.bio,
            }
          : pub,
      );
    } catch {
      /* 静默 */
    }
    if (tokenPresent) {
      try {
        const me = await fetchCurrentUser();
        if (me) {
          setProfile((prev) => (prev ? { ...prev, ...me, email: me.email ?? prev.email } : prev));
        }
      } catch {
        /* 静默 */
      }
    }
  }, [profile?.publicId, tokenPresent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        if (publicIdParam) {
          const pid = Number(publicIdParam);
          if (!Number.isFinite(pid) || pid < 1) {
            setError('无效的用户号');
            setProfile(null);
            return;
          }
          const pub = await fetchPublicProfile(pid);
          if (cancelled) return;
          setProfile(pub);
        } else if (tokenPresent) {
          const me = await fetchCurrentUser();
          if (cancelled) return;
          if (!me?.publicId) {
            setProfile({ ...me, likesReceived: 0, followingCount: 0, followersCount: 0, followedByMe: false });
            return;
          }
          const pub = await fetchPublicProfile(Number(me.publicId));
          if (cancelled) return;
          setProfile({ ...me, ...pub, email: me.email });
          const prev = readStoredUser() || {};
          localStorage.setItem(
            'user',
            JSON.stringify({
              ...prev,
              publicId: pub.publicId ?? me.publicId,
              userName: pub.userName ?? me.userName,
              email: me.email,
            }),
          );
        } else {
          setProfile(readStoredUser());
        }
      } catch (err) {
        if (!cancelled) {
          setError(apiErrMessage(err));
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicIdParam, tokenPresent]);

  useEffect(() => {
    if (profile?.publicId == null) {
      setWorksList([]);
      return;
    }
    void loadWorks();
  }, [loadWorks, profile?.publicId]);

  useLayoutEffect(() => {
    const root = mineRootRef.current;
    if (!root) return undefined;
    const scrollEl = resolveMineScrollEl(root);
    if (!scrollEl) return undefined;

    const applyHeroLayout = () => {
      const { base, pullMax } = computeHeroLayoutMetrics(scrollEl.clientHeight);
      heroPullMaxRef.current = pullMax;
      setHeroLayout({ base, pullMax });
      root.style.setProperty('--mine-hero-base', `${base}px`);
      if (heroTargetRef.current > pullMax) {
        heroTargetRef.current = pullMax;
      }
      if (heroDisplayRef.current > pullMax) {
        heroDisplayRef.current = pullMax;
        setHeroPullPx(pullMax);
      }
    };

    applyHeroLayout();
    const ro = new ResizeObserver(applyHeroLayout);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const root = mineRootRef.current;
    if (!root) return undefined;

    const scrollEl = resolveMineScrollEl(root);
    if (!scrollEl) return undefined;
    heroScrollElRef.current = scrollEl;

    const pullMax = () => heroPullMaxRef.current;
    const lockThreshold = () => pullMax() - 2;
    const unlockBelow = () => pullMax() * 0.86;

    const scrollTop = () => scrollEl.scrollTop;

    /** 顶部背景过滚/收回未完全结束时不把滚轮交给页面 */
    const isHeroInteractionActive = () =>
      heroClickAnimRef.current != null ||
      heroLockedRef.current ||
      heroTargetRef.current > HERO_IDLE_EPSILON ||
      heroDisplayRef.current > HERO_IDLE_EPSILON ||
      idleRetractRef.current ||
      heroLoopRef.current != null;

    const stopLoop = () => {
      if (heroLoopRef.current != null) {
        window.cancelAnimationFrame(heroLoopRef.current);
        heroLoopRef.current = null;
      }
    };

    const clearIdlePartial = () => {
      if (idlePartialTimerRef.current != null) {
        window.clearTimeout(idlePartialTimerRef.current);
        idlePartialTimerRef.current = null;
      }
      idleRetractRef.current = false;
    };

    const clearStretch = () => {
      clearIdlePartial();
      stopLoop();
      heroClickAnimRef.current = null;
      setHeroClickAnimatingRef.current(false);
      heroTargetRef.current = 0;
      heroDisplayRef.current = 0;
      heroLockedRef.current = false;
      setHeroPullPx(0);
    };

    const scheduleIdlePartial = () => {
      clearIdlePartial();
      idlePartialTimerRef.current = window.setTimeout(() => {
        idlePartialTimerRef.current = null;
        if (!heroLockedRef.current && heroTargetRef.current > 4) {
          idleRetractRef.current = true;
          startLoop();
        }
      }, IDLE_PARTIAL_MS);
    };

    const startLoop = () => {
      if (heroLoopRef.current != null) return;
      heroLastTRef.current = performance.now();
      const tick = (now) => {
        const dt = Math.min(48, now - heroLastTRef.current) / 1000;
        heroLastTRef.current = now;

        let displayOmega = HERO_SMOOTH_OMEGA;
        const clickAnim = heroClickAnimRef.current;
        if (clickAnim) {
          const max = pullMax();
          const elapsed = now - clickAnim.startTime;
          const t = Math.min(1, elapsed / HERO_CLICK_ANIM_MS);
          const eased = easeOutQuint(t);
          displayOmega = HERO_CLICK_ANIM_DISPLAY_OMEGA;
          if (clickAnim.mode === 'expand') {
            heroTargetRef.current = clickAnim.fromPull + (max - clickAnim.fromPull) * eased;
            if (t >= 1) {
              heroClickAnimRef.current = null;
              setHeroClickAnimatingRef.current(false);
              heroLockedRef.current = true;
              heroTargetRef.current = max;
            }
          } else {
            heroLockedRef.current = false;
            heroTargetRef.current = clickAnim.fromPull * (1 - eased);
            if (t >= 1) {
              heroClickAnimRef.current = null;
              setHeroClickAnimatingRef.current(false);
              heroTargetRef.current = 0;
              heroDisplayRef.current = 0;
              setHeroPullPx(0);
            }
          }
        } else if (heroLockedRef.current) {
          heroTargetRef.current = pullMax();
        }

        if (idleRetractRef.current && !heroLockedRef.current && !clickAnim) {
          heroTargetRef.current *= IDLE_RETRACT_K;
          if (heroTargetRef.current < 1.2) {
            heroTargetRef.current = 0;
            idleRetractRef.current = false;
          }
        }

        let display = heroDisplayRef.current;
        const target = heroTargetRef.current;
        const alpha = 1 - Math.exp(-displayOmega * dt);
        display += (target - display) * alpha;
        const snapEpsilon = clickAnim ? 0.35 : 0.06;
        if (
          !clickAnim &&
          heroLockedRef.current &&
          display >= pullMax() - 0.75
        ) {
          display = pullMax();
        } else if (Math.abs(target - display) < snapEpsilon) {
          display = target;
        }
        heroDisplayRef.current = display;
        setHeroPullPx(display);

        const err = Math.abs(heroTargetRef.current - display);
        const needsFrame =
          clickAnim != null ||
          idleRetractRef.current ||
          err > 0.1 ||
          (heroLockedRef.current && err > 0.028) ||
          (!heroLockedRef.current && err > 0.055 && (heroTargetRef.current > 0.08 || display > 0.08));

        if (needsFrame) {
          heroLoopRef.current = window.requestAnimationFrame(tick);
        } else {
          heroLoopRef.current = null;
          if (
            !heroLockedRef.current &&
            heroTargetRef.current <= HERO_IDLE_EPSILON &&
            display <= HERO_IDLE_EPSILON
          ) {
            heroTargetRef.current = 0;
            heroDisplayRef.current = 0;
            setHeroPullPx(0);
          }
        }
      };
      heroLoopRef.current = window.requestAnimationFrame(tick);
    };

    const expandHeroToFull = () => {
      if (scrollTop() > 10) return;
      const max = pullMax();
      if (heroClickAnimRef.current) return;
      if (heroLockedRef.current && heroDisplayRef.current >= max - 2) {
        return;
      }
      clearIdlePartial();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        heroLockedRef.current = true;
        heroTargetRef.current = max;
        heroDisplayRef.current = max;
        setHeroPullPx(max);
        return;
      }
      heroLockedRef.current = false;
      setHeroClickAnimatingRef.current(true);
      heroClickAnimRef.current = {
        mode: 'expand',
        startTime: performance.now(),
        fromPull: heroDisplayRef.current,
      };
      heroTargetRef.current = heroDisplayRef.current;
      startLoop();
    };

    const collapseHeroToFolded = () => {
      if (scrollTop() > 10) return;
      const max = pullMax();
      if (heroClickAnimRef.current) return;
      if (!heroLockedRef.current && heroDisplayRef.current < max * 0.35) {
        return;
      }
      clearIdlePartial();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        heroLockedRef.current = false;
        heroTargetRef.current = 0;
        heroDisplayRef.current = 0;
        setHeroPullPx(0);
        return;
      }
      heroLockedRef.current = false;
      setHeroClickAnimatingRef.current(true);
      heroClickAnimRef.current = {
        mode: 'collapse',
        startTime: performance.now(),
        fromPull: heroDisplayRef.current,
      };
      heroTargetRef.current = heroDisplayRef.current;
      startLoop();
    };

    heroExpandRef.current = expandHeroToFull;
    heroCollapseRef.current = collapseHeroToFolded;
    clearHeroStretchRef.current = clearStretch;

    const onScroll = () => {
      if (mineModalOpenRef.current) return;
      if (scrollTop() > 10 && (heroDisplayRef.current > 0 || heroLockedRef.current)) {
        clearStretch();
      }
    };

    const onWheel = (e) => {
      if (mineModalOpenRef.current || isEventInsideMineModal(e)) return;

      const st = scrollTop();
      const dy = e.deltaY;

      if (dy < 0 && st <= 0) {
        e.preventDefault();
        clearIdlePartial();
        if (heroLockedRef.current) {
          startLoop();
          return;
        }
        const max = pullMax();
        const imp = -dy * WHEEL_PULL_GAIN * heroRubberFactor(heroTargetRef.current, max);
        let next = heroTargetRef.current + imp;
        if (next >= lockThreshold()) {
          heroLockedRef.current = true;
          heroTargetRef.current = max;
        } else {
          heroTargetRef.current = Math.max(0, Math.min(max, next));
        }
        startLoop();
        scheduleIdlePartial();
        return;
      }

      if (dy > 0 && st <= 0) {
        if (!isHeroInteractionActive()) {
          return;
        }
        e.preventDefault();
        clearIdlePartial();
        heroLockedRef.current = false;
        const max = pullMax();
        heroTargetRef.current = Math.max(
          0,
          heroTargetRef.current -
            dy * WHEEL_RELEASE_GAIN * (1 + heroTargetRef.current / max) * 0.55,
        );
        if (heroTargetRef.current < unlockBelow()) {
          heroLockedRef.current = false;
        }
        startLoop();
        scheduleIdlePartial();
      }
    };

    const onTouchStart = (e) => {
      if (mineModalOpenRef.current || isEventInsideMineModal(e)) return;
      if (e.touches.length !== 1) return;
      touchLastYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (mineModalOpenRef.current || isEventInsideMineModal(e)) return;
      if (e.touches.length !== 1) return;
      const st = scrollTop();
      const y = e.touches[0].clientY;
      const delta = y - touchLastYRef.current;
      touchLastYRef.current = y;
      if (st <= 0 && delta > 0) {
        e.preventDefault();
        clearIdlePartial();
        if (heroLockedRef.current) {
          heroLockedRef.current = false;
          heroTargetRef.current = Math.max(0, pullMax() - delta * TOUCH_PULL_GAIN * 1.25);
          startLoop();
          scheduleIdlePartial();
          return;
        }
        const max = pullMax();
        const imp = delta * TOUCH_PULL_GAIN * heroRubberFactor(heroTargetRef.current, max);
        let next = heroTargetRef.current + imp;
        if (next >= lockThreshold()) {
          heroLockedRef.current = true;
          heroTargetRef.current = max;
        } else {
          heroTargetRef.current = Math.max(0, Math.min(max, next));
        }
        startLoop();
        scheduleIdlePartial();
      }
      if (st <= 0 && delta < 0) {
        if (!isHeroInteractionActive()) {
          return;
        }
        e.preventDefault();
        clearIdlePartial();
        heroLockedRef.current = false;
        heroTargetRef.current = Math.max(0, heroTargetRef.current + delta * TOUCH_PULL_GAIN * 0.45);
        if (heroTargetRef.current < unlockBelow()) {
          heroLockedRef.current = false;
        }
        startLoop();
        scheduleIdlePartial();
      }
    };

    scrollEl.addEventListener('wheel', onWheel, { passive: false });
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      scrollEl.removeEventListener('wheel', onWheel);
      scrollEl.removeEventListener('scroll', onScroll);
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchmove', onTouchMove);
      heroScrollElRef.current = null;
      heroExpandRef.current = null;
      heroCollapseRef.current = null;
      clearStretch();
    };
  }, []);

  useEffect(() => {
    if (!uploadHub && !editProfileOpen) return undefined;
    clearHeroStretchRef.current?.();

    const root = mineRootRef.current;
    const scrollEl = root ? resolveMineScrollEl(root) : null;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPad = document.body.style.paddingRight;
    const prevScrollOverflow = scrollEl?.style.overflow ?? '';
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarW > 0) {
      document.body.style.paddingRight = `${scrollbarW}px`;
    }
    document.body.style.overflow = 'hidden';
    if (scrollEl) scrollEl.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.paddingRight = prevBodyPad;
      if (scrollEl) scrollEl.style.overflow = prevScrollOverflow;
    };
  }, [uploadHub, editProfileOpen]);

  const handleHeroCoverClick = useCallback(() => {
    if (mineModalOpenRef.current) return;
    const scrollEl = heroScrollElRef.current;
    if (scrollEl && scrollEl.scrollTop > 10) return;
    const max = heroPullMaxRef.current;
    const locked =
      heroLockedRef.current || heroDisplayRef.current >= max - 4;
    if (locked) {
      heroCollapseRef.current?.();
    } else {
      heroExpandRef.current?.();
    }
  }, []);

  const onFollowToggle = useCallback(async () => {
    if (!profile?.publicId || isSelf || !tokenPresent) return;
    setFollowBusy(true);
    setError('');
    try {
      const next = profile.followedByMe ? await unfollowUser(profile.publicId) : await followUser(profile.publicId);
      if (next) setProfile((prev) => ({ ...(prev || {}), ...next }));
    } catch (err) {
      setError(apiErrMessage(err));
    } finally {
      setFollowBusy(false);
    }
  }, [profile, isSelf, tokenPresent]);

  const userName = profile?.userName ?? (loading ? '加载中…' : '未登录');
  const userIdDisplay = profile?.publicId ?? profile?.userId ?? '—';
  const likes = formatStat(profile?.likesReceived ?? 0);
  const following = formatStat(profile?.followingCount ?? 0);
  const fans = formatStat(profile?.followersCount ?? 0);

  const coverImageUrl = profile?.coverImageUrl || profile?.coverUrl || MINE_DEFAULT_COVER_URL;

  /** 头像：接口 avatarUrl 优先，否则占位图 */
  const avatarPlaceholderSrc = useMemo(() => {
    if (profile?.avatarUrl) return profile.avatarUrl;
    const seed =
      profile?.publicId != null
        ? `u${profile.publicId}`
        : profile?.userId != null
          ? `uid${profile.userId}`
          : (profile?.userName && String(profile.userName).trim()) || 'guest';
    const safe = encodeURIComponent(String(seed).replace(/\s+/g, '-').slice(0, 48));
    return `https://picsum.photos/seed/mine-avatar-${safe}/200/200`;
  }, [profile?.avatarUrl, profile?.publicId, profile?.userId, profile?.userName]);

  const coverFocus = useMemo(() => parseProfileCoverFocus(profile), [profile]);

  const heroParallax = useMemo(
    () => computeHeroParallax(heroPullPx, heroLayout.pullMax, coverFocus.x, coverFocus.y),
    [heroPullPx, heroLayout.pullMax, coverFocus.x, coverFocus.y],
  );
  const heroIsLocked = heroPullPx >= heroLayout.pullMax - 4;
  const heroIsFolded = !heroIsLocked && heroPullPx < heroLayout.pullMax * 0.12;
  const mineModalOpen = !!uploadHub || editProfileOpen;
  const heroCanClickCover =
    !mineModalOpen && !heroClickAnimating && (heroIsFolded || heroIsLocked);
  const heroCoverClickLabel = heroIsLocked ? '收起背景大图' : '展开背景大图';
  const heroExtraClass = `${heroPullPx > 0.25 ? ' mine-hero-mine--pulling' : ''}${
    heroIsLocked ? ' mine-hero-mine--locked' : ''
  }${heroCanClickCover ? ' mine-hero-mine--clickable' : ''}`;

  return (
    <div
      className={`mine-page-mine${mineModalOpen ? ' mine-page-mine--modal-open' : ''}`}
      id="mine-page-mine"
      ref={mineRootRef}
    >
      <MineUploadHubModal
        open={!!uploadHub}
        initialTab={uploadHub?.tab ?? 'works'}
        editBlogId={uploadHub?.editBlogId ?? null}
        editWorkId={uploadHub?.editWorkId ?? null}
        onClose={closeUploadHub}
        onWorkSuccess={(opts) => {
          void refreshWorksAndProfile();
          if (opts?.waitForAiTag) void pollWorksAfterAiTag();
        }}
        onBlogSuccess={() => {
          setBlogListVersion((v) => v + 1);
        }}
      />

      <MineEditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={profile}
        onSaved={() => {
          void refreshProfileAfterEdit();
        }}
        onLogout={() => {
          clearAuth();
          setEditProfileOpen(false);
          navigate('/login', { replace: true });
        }}
      />

      <section
        className={`mine-hero-mine${heroExtraClass}`}
        id="mine-hero-mine"
        aria-label="主页顶部背景"
        style={{ ['--mine-hero-pull']: `${heroPullPx}px` }}
      >
        <img
          className="mine-hero-cover"
          src={coverImageUrl}
          alt=""
          decoding="async"
          fetchPriority="high"
          style={{
            objectPosition: heroParallax.coverObjectPosition,
            transform: heroParallax.coverTransform,
          }}
        />
        {heroCanClickCover && (
          <button
            type="button"
            className="mine-hero-cover-hit"
            aria-label={heroCoverClickLabel}
            onClick={handleHeroCoverClick}
          />
        )}
        <div className="mine-hero-scrim" style={heroParallax.scrimStyle} aria-hidden="true" />
        <div className="mine-hero-floating" style={heroParallax.floatStyle}>
          <div className="avatar-wrap-mine" id="avatar-wrap-mine">
            <img
              id="avatar-mine"
              className="avatar-mine"
              src={avatarPlaceholderSrc}
              alt=""
              width={100}
              height={100}
              decoding="async"
            />
          </div>
          <div className="profile-text-mine">
            <h2 className="nick-name-mine nick-name-mine--on-cover" id="nick-name-mine">
              {userName}
            </h2>
            <p className="profile-id-mine profile-id-mine--on-cover">ID：{userIdDisplay}</p>
          </div>
        </div>
      </section>

      <div className="mine-profile-surface" id="mine-profile-surface">
        {error && (
          <div className="mine-profile-error" role="alert">
            {error}
          </div>
        )}

        <div className="stats-row-mine" id="stats-row-mine">
          <div className="stats-row-mine__metrics">
            <div className="stat-item-mine" id="stat-like-mine">
              <div className="stat-number-mine">{likes}</div>
              <div className="stat-text-mine">获赞</div>
            </div>
            <div className="stat-item-mine" id="stat-follow-mine">
              <div className="stat-number-mine">{following}</div>
              <div className="stat-text-mine">关注</div>
            </div>
            <div className="stat-item-mine" id="stat-fans-mine">
              <div className="stat-number-mine">{fans}</div>
              <div className="stat-text-mine">粉丝</div>
            </div>
          </div>
          {profile?.bio?.trim() ? (
            <p className="mine-bio-mine">{profile.bio.trim()}</p>
          ) : isSelf ? (
            <p className="mine-bio-mine mine-bio-mine--empty">写一句个人签名，让大家更了解你</p>
          ) : null}
        </div>

        <div className="action-btn-row-mine" id="action-btn-row-mine">
          {isSelf ? (
            <div className="action-btn-row-mine--dual">
              <button
                type="button"
                className="edit-profile-btn-mine"
                id="edit-profile-btn-mine"
                onClick={() => {
                  if (!tokenPresent) {
                    navigate('/login');
                    return;
                  }
                  setEditProfileOpen(true);
                }}
              >
                设置
              </button>
              {tokenPresent ? (
                <button type="button" className="upload-work-btn-mine" onClick={() => openUploadHub()}>
                  上传作品
                </button>
              ) : (
                <button type="button" className="upload-work-btn-mine upload-work-btn-mine--muted" onClick={() => navigate('/login')}>
                  登录后上传
                </button>
              )}
            </div>
          ) : (
            <div className="profile-visitor-actions-mine">
              {tokenPresent ? (
                <button
                  type="button"
                  className={profile?.followedByMe ? 'following-btn-mine' : 'follow-btn-mine'}
                  onClick={onFollowToggle}
                  disabled={followBusy || loading || !profile}
                >
                  {profile?.followedByMe ? '已关注' : '+ 关注'}
                </button>
              ) : (
                <button type="button" className="edit-profile-btn-mine" onClick={() => navigate('/login')}>
                  登录后关注
                </button>
              )}
            </div>
          )}
        </div>

        <div className="tab-nav-mine" id="tab-nav-mine">
          <div
            className={`tab-item-mine ${activeTab === 'works' ? 'active-mine' : ''}`}
            id="tab-works-mine"
            onClick={() => switchTab('works')}
            onKeyDown={(e) => e.key === 'Enter' && switchTab('works')}
            role="tab"
            tabIndex={0}
          >
            作品
          </div>
          <div className="tab-divider-mine" id="tab-divider-mine" />
          <div
            className={`tab-item-mine ${activeTab === 'blog' ? 'active-mine' : ''}`}
            id="tab-blog-mine"
            onClick={() => switchTab('blog')}
            onKeyDown={(e) => e.key === 'Enter' && switchTab('blog')}
            role="tab"
            tabIndex={0}
          >
            博客
          </div>
        </div>
      </div>

      <div
        ref={tabContentRef}
        className={`tab-content-area-mine${activeTab === 'blog' ? ' tab-content-area-mine--blog' : ''}`}
        id="tab-content-area-mine"
      >
        {activeTab === 'works' ? (
          profile?.publicId != null ? (
            <TiltWorksPanel
              ownerPublicId={Number(profile.publicId)}
              ownerName={profile.userName}
              apiMode
              apiLoading={worksLoading}
              apiItems={worksList}
              tokenPresent={tokenPresent}
              canManageWorks={isSelf && tokenPresent}
              onWorkInteract={refreshProfileStats}
              onWorkDeleted={refreshWorksAndProfile}
              onWorkEdit={(workId) => openUploadHub({ editWorkId: workId })}
            />
          ) : (
            <div className="mine-tab-placeholder">{loading ? '加载作品…' : '登录后可查看自己的作品展示'}</div>
          )
        ) : (
          <MineBlogPanel
            publicId={profile?.publicId}
            isSelf={isSelf}
            tokenPresent={tokenPresent}
            showCompose={isSelf && tokenPresent}
            refreshKey={blogListVersion}
            onEditBlog={(post) => openUploadHub({ tab: 'blog', editBlogId: post.blogId })}
          />
        )}
      </div>
    </div>
  );
}
