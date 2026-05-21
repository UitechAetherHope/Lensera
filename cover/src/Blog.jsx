import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionList,
  ActionMenu,
  BaseStyles,
  Button,
  CounterLabel,
  Label,
  SegmentedControl,
  StateLabel,
  TextInput,
  ThemeProvider,
  UnderlineNav,
} from '@primer/react';
import {
  ColumnsIcon,
  BookmarkIcon,
  CalendarIcon,
  ChevronRightIcon,
  CommentDiscussionIcon,
  EyeIcon,
  GraphIcon,
  HeartIcon,
  PersonIcon,
  PulseIcon,
  RowsIcon,
  SearchIcon,
  ShareIcon,
  SlidersIcon,
  XIcon,
  ZapIcon,
} from '@primer/octicons-react';
import '@primer/primitives/dist/css/functional/themes/light.css';
import '@primer/primitives/dist/css/functional/themes/dark-dimmed.css';
import './Blog.css';
import { fetchBlogFeed } from './api/blogs';
import { fetchWorksFeed } from './api/works';
import { fetchPublicProfile } from './api/users';
import ApiBlogDetail from './ApiBlogDetail';
import BlogArticleView from './BlogArticleView';
import { parseSectionsOutline } from './utils/simpleMarkdownHtml';
import BlogFeedCard from './BlogFeedCard';
import BlogHeroAuthorCarousel from './BlogHeroAuthorCarousel';
import { buildHotMeterHeights, buildHotTopicsFromPosts } from './utils/buildHotTopicsFromFeed';
import { buildFeaturedAuthors, featuredAuthorStats } from './utils/buildFeaturedAuthors';
import { mapApiBlogToCard } from './utils/mapApiBlogToCard';
import { parseApiBlogRouteId } from './utils/blogPostIds';
import { parseCompactNumber, formatCompactCount } from './utils/parseCompactNumber';
import { getMineProfilePath } from './utils/blogRoutes';
import { getAuthorSlotPosts } from './utils/getAuthorSlotPosts';

const professionalCoverImages = [
  'https://images.unsplash.com/photo-1627126974256-54254f660e3b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1712493706555-c74706ed3618?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?auto=format&fit=crop&w=1200&q=80',
];

const BLOG_ROUTE = '/editor/blog';
const BLOG_PUBLISH_ROUTE = `${BLOG_ROUTE}/publish`;
const MANAGED_ARTICLES_STORAGE_KEY = 'cover-blog-managed-articles';

const blogPosts = [
  {
    id: 1,
    category: '技术分享',
    title: '夜景拍摄流程拆解：如何把暗光街头拍出层次感',
    excerpt:
      '从机位选择、快门控制到噪点处理，把一次完整的夜景拍摄流程拆成可复用的步骤，适合摄影论坛里的经验交流和技术讨论。',
    heroExcerpt:
      '从机位选择、快门控制到噪点处理，拆解一套适合城市夜拍的完整思路。',
    author: '光圈实验室',
    date: '2026-04-25',
    views: '1.2k',
    comments: 26,
    image: professionalCoverImages[0],
    heroTone: 'night',
    tags: ['夜景摄影', '参数设置', '经验贴'],
    readMinutes: 9,
    aiSummary: {
      status: 'placeholder',
      oneLiner:
        '城市夜景要层次：到场先判光源与高光风险，拍摄保稳快门与窗光高光，后期用「压高光 → 轻提阴影 → 局部分层」而不是整图提亮。',
      bullets: [
        '机位：避开灯牌死白角度，用街线带出纵深，给行人留进入画面的等待时间',
        '曝光：参考图 + 微调；快门优先保主体清晰，ISO 可略让位于稳定',
        '后期：全局反差后做局部，人物 / 路面反光 / 远景灯光分三层处理',
        '讨论焦点：保高光保细节，还是保人物肤色再补环境（见文末评论）',
      ],
      keywords: ['夜景层次', '安全快门', '局部调整', '高光控制'],
    },
    discussionTitle: '讨论区：夜景拍摄时你更优先保高光还是保暗部？',
    discussionSummary:
      '这篇内容的重点不是单张成片，而是把拍摄过程变成可以交流的方案。大家可以围绕参数、构图和后期思路继续讨论。',
    contentBlocks: [
      {
        title: '一、到场先做的现场判断（约 5 分钟）',
        body:
          '夜景最容易翻车的不是机身不够强，而是没把现场光比摸清楚。我会绕点位走半圈：主光源从哪来、有没有霓虹/路灯直射镜头、行人会不会长时间挡在构图中心。',
        callout:
          '实操口诀：先找最亮的高光点在哪里，再决定站哪、朝哪拍——比先拧 ISO 更省后期时间。',
        points: [
          '灯牌/橱窗正对镜头时，要么侧 15°–30° 站位，要么等行人挡一下高光',
          '有纵深的街道优先站低机位或略俯，让路面反光参与构图',
          '预拍一张 JPEG 参考，只看直方图右侧是否顶死',
        ],
      },
      {
        title: '二、参数：参考图 + 微调，不要一次拧满',
        body:
          '以我常用的 35mm 扫街为例：先设安全快门（约 1/60s 手持、有主体时可 1/125s），光圈 f/2–f/2.8，ISO 800–3200 视现场而定。第一张只验证高光是否保住、暗部是否死黑。',
        callout:
          '若主体是行人：快门优先；若环境光斑是主角：可略降快门换更小 ISO，但要接受轻微拖影。',
        points: [
          '白平衡偏冷 3800–4500K，后期再微调，比现场偏暖更好拉回夜色',
          '曝光补偿：高光场景 -0.3～-0.7 EV，避免灯牌死白',
          'RAW 必开，后期压高光比 JPEG 拉回余地大得多',
        ],
      },
      {
        title: '三、后期：把层次找回来，而不是把夜晚拍成白天',
        body:
          'Lightroom / Camera Raw 流程：先降 Highlights / 白场，再轻提 Shadows；用径向滤镜单独压路灯区域，用画笔提亮人物轮廓 0.3–0.5 档即可。最后统一降一点黑色色阶，保留夜景应有的黑位。',
        points: [
          '全局：对比度 +10～+15，清晰度 +5 以内，避免噪点被锐化放大',
          '局部：路面反光与远景灯光分两层蒙版，不要一次拉满',
          '导出：长边 2400–3000px、质量 85，论坛发帖足够且体积可控',
        ],
      },
    ],
    commentsList: [
      {
        author: '镜头捕手',
        content:
          '我一般先保高光，尤其是路灯和霓虹很多的时候，不然后期很难拉回来。',
      },
      {
        author: '阿曜',
        content:
          '如果人物是主体，我会让肤色先成立，再通过局部调整把环境亮度慢慢补出来。',
      },
      {
        author: '取景器日记',
        content:
          '感觉这类帖子最适合论坛讨论，大家拍摄环境差别大，参数经验特别值得互相参考。',
      },
    ],
  },
  {
    id: 2,
    category: '器材资讯',
    title: '春季器材观察：入门微单怎么选，预算该优先给机身还是镜头',
    excerpt:
      '把论坛里最常见的器材问题整理成一篇横向对比，适合做成像新闻流一样的博客卡片，左边看内容，右边看配图。',
    heroExcerpt:
      '把常见入门选择拆成不同预算段，帮助你先理清升级顺序。',
    author: '器材研究会',
    date: '2026-04-24',
    views: '1.8k',
    comments: 19,
    image: professionalCoverImages[1],
    heroTone: 'gear',
    tags: ['微单', '镜头搭配', '新手入门'],
    discussionTitle: '讨论区：预算固定时，你会先升级镜头还是先换机身？',
    discussionSummary:
      '论坛里的器材讨论很适合持续更新。把不同预算段、不同使用场景拆开聊，会比单纯列参数更有帮助。',
    commentsList: [
      {
        author: '半幅也能拍',
        content:
          '我站镜头优先，系统能继续用下去比一时的机身参数更重要。',
      },
      {
        author: '山海之间',
        content:
          '如果是拍视频的同学，机身对焦和防抖也很关键，还是要看用途。',
      },
    ],
  },
  {
    id: 3,
    category: '社区新闻',
    title: '本周城市扫街活动开放报名：路线、分组和作品交流规则都在这里',
    excerpt:
      '除了技术分享，博客页也能承担社区资讯功能。活动公告、报名说明和优秀作品推荐都可以用这种博客排版来承接。',
    author: '论坛运营组',
    date: '2026-04-23',
    views: '3.1k',
    comments: 41,
    image: professionalCoverImages[2],
    tags: ['活动公告', '城市扫街', '社区互动'],
    discussionTitle: '讨论区：线下扫街活动更想拍建筑、人像，还是街头纪实？',
    discussionSummary:
      '如果博客页后面要和论坛联动，这类帖子就很适合成为“资讯 + 讨论”的入口，点开后继续延伸评论和报名交流。',
    commentsList: [
      {
        author: '快门别抖',
        content:
          '建议按主题分组，不然大家拍摄目标不一样，最后交流的时候会有点散。',
      },
      {
        author: '余温',
        content:
          '如果能把每次活动精选照片再做成回顾博客，页面内容会更完整。',
      },
    ],
  },
  {
    id: 4,
    category: '器材资讯',
    title: '城市扫街前的轻量装备清单',
    excerpt:
      '一机一镜也能拍得从容，分享我最常用的出门搭配和取舍逻辑。',
    heroExcerpt:
      '一机一镜也能拍得从容，分享我最常用的出门搭配和取舍逻辑。',
    author: '光圈实验室',
    date: '2026-04-18',
    views: '856',
    comments: 18,
    image: professionalCoverImages[3],
    heroTone: 'gear',
    tags: ['扫街装备', '轻量出行', '出门搭配'],
    discussionTitle: '讨论区：扫街出门时，你更在意轻量机身还是焦段覆盖？',
    discussionSummary:
      '轻量装备并不等于妥协，关键在于你拍的题材和出门时长。欢迎分享你最常用的一机一镜组合。',
    contentBlocks: [
      {
        title: '轻量不是少带，而是少犹豫',
        body:
          '扫街时真正拖慢节奏的往往不是重量，而是每次看到画面都在纠结换不换镜头。我会把当天主题提前定窄：如果是城市光影，就带定焦；如果是路线记录，就带小变焦。',
        points: [
          '出门前只确认一个拍摄主题',
          '备用电池比第二支大镜头更常用',
          '包里留出水和随身物的位置',
        ],
      },
      {
        title: '一机一镜的常用搭配',
        body:
          '如果我只带一套组合，优先选择轻便机身加 35mm 或 40mm 等效焦段。它能兼顾环境、人和街道关系，不需要退太远，也不容易让画面显得太挤。',
        points: ['35mm 适合街头叙事', '50mm 适合压缩关系和人物细节', '小变焦适合不确定路线和旅行记录'],
      },
      {
        title: '现场取舍比装备清单更重要',
        body:
          '轻装出门最大的好处是让人更愿意走、更愿意等。错过一些焦段没关系，只要拍摄节奏保持在线，反而更容易形成一组气质统一的照片。',
        points: ['少换镜头，多观察人物关系', '把相机设置保持在随手可拍的状态', '收工后记录哪件装备真正被用到'],
      },
    ],
    commentsList: [
      {
        author: '慢门散步',
        content:
          '我现在最常带 35mm 定焦，轻便很多，走一天也不会觉得累。',
      },
      {
        author: '街头取景框',
        content:
          '如果知道会遇到远近题材混着拍，我还是会带一支小变焦，容错更高。',
      },
    ],
  },
  {
    id: 5,
    category: '后期教程',
    title: '一套轻量级调色工作流：从原片筛选到导出发布的完整步骤',
    excerpt:
      '从筛片、初调到导出，整理一套适合日常创作的轻量流程。',
    heroExcerpt:
      '从筛片、初调到导出，整理一套适合日常创作的轻量流程。',
    author: '调色手册',
    date: '2026-04-21',
    views: '2.7k',
    comments: 33,
    image: professionalCoverImages[4],
    heroTone: 'night',
    tags: ['Lightroom', '色彩统一', '工作流'],
    discussionTitle: '讨论区：你会先筛片再调色，还是边看边修？',
    discussionSummary:
      '先统一一组照片的基调，再处理重点画面，往往比逐张死抠细节更高效。欢迎分享你的后期顺序。',
    commentsList: [
      {
        author: '色彩观测者',
        content:
          '我一定先筛片，不然会把时间浪费在不需要保留的素材上。',
      },
      {
        author: '慢慢调',
        content:
          '如果是一组活动图，我会先统一白平衡和反差，再精修重点照片。',
      },
    ],
  },
  {
    id: 6,
    category: '器材资讯',
    title: '旅行拍摄的一机两镜组合怎么配更均衡',
    excerpt:
      '兼顾轻便、焦段覆盖和价格控制，给出更适合长时间出行的搭配思路。',
    heroExcerpt:
      '兼顾轻便、焦段覆盖和价格控制，给出更适合长时间出行的搭配思路。',
    author: '器材研究会',
    date: '2026-04-16',
    views: '1.6k',
    comments: 8,
    image: professionalCoverImages[5],
    heroTone: 'gear',
    tags: ['旅行微单', '焦段规划', '镜头组合'],
    discussionTitle: '讨论区：如果旅行只能带两支镜头，你会怎么选焦段？',
    discussionSummary:
      '两镜方案往往最考验取舍，欢迎聊聊你更偏向广角 + 定焦，还是标准变焦 + 长焦。',
    commentsList: [
      {
        author: '背包摄影师',
        content:
          '我最近越来越倾向于 24-70 加 35 定焦，旅行里覆盖面和轻便都还不错。',
      },
      {
        author: '镜头地图',
        content:
          '如果以城市记录为主，我会选广角变焦加一支人文定焦，切换更舒服。',
      },
    ],
  },
  {
    id: 7,
    category: '后期教程',
    title: '批量修图时，怎样保持一组照片的统一气质',
    excerpt:
      '先统一基调，再处理重点照片，避免整组图片风格散掉。',
    heroExcerpt:
      '先统一基调，再处理重点照片，避免整组图片风格散掉。',
    author: '调色手册',
    date: '2026-04-14',
    views: '1.3k',
    comments: 18,
    image: professionalCoverImages[6],
    heroTone: 'night',
    tags: ['批量修图', '统一风格', '后期效率'],
    discussionTitle: '讨论区：你会先做整组统一，还是先修出一张样片再同步？',
    discussionSummary:
      '批量修图最难的不是工具，而是顺序。先定风格还是先挑样片，每个人都有自己的节奏。',
    commentsList: [
      {
        author: '胶片色温',
        content:
          '我一般会先修一张基准图，再同步到整组，这样比较不容易跑偏。',
      },
      {
        author: '色阶笔记',
        content:
          '如果一组照片拍摄环境差太多，我会先按场景分组，再统一调色。',
      },
    ],
  },
];

const categories = ['全部', '技术分享', '器材资讯', '社区新闻', '后期教程', '行业动态'];

const categoryLabelVariants = {
  技术分享: 'accent',
  器材资讯: 'success',
  社区新闻: 'done',
  后期教程: 'attention',
  行业动态: 'severe',
};

const publishCategories = categories.filter((category) => category !== '全部');

const articleStatusMeta = {
  draft: {
    label: '草稿',
    variant: 'attention',
    hint: '还没提交，随时可以继续改。',
  },
  pending: {
    label: '待审核',
    variant: 'accent',
    hint: '管理员审核中，通过后进入博客列表。',
  },
  published: {
    label: '已发布',
    variant: 'success',
    hint: '正在公开展示。',
  },
  rejected: {
    label: '已驳回',
    variant: 'severe',
    hint: '需要修改后再提交。',
  },
};

const uploadStateMeta = {
  idle: { label: '未选择', variant: 'secondary' },
  uploading: { label: '处理中', variant: 'accent' },
  done: { label: '已就绪', variant: 'success' },
  error: { label: '失败', variant: 'severe' },
};

const initialArticleForm = {
  title: '',
  category: '技术分享',
  tags: '',
  excerpt: '',
  body: '',
  coverName: '',
  coverPreview: '',
  coverSize: '',
  coverType: '',
};

const sortOptions = {
  latest: {
    label: '最新发布',
    hint: '按日期排序，保持资讯流节奏',
    icon: CalendarIcon,
  },
  popular: {
    label: '浏览最多',
    hint: '优先显示阅读热度更高的内容',
    icon: GraphIcon,
  },
  discussed: {
    label: '讨论最热',
    hint: '优先显示评论更活跃的话题',
    icon: CommentDiscussionIcon,
  },
};

/** 接口数据不足时的展示兜底（样式演示） */
const FALLBACK_FEATURED_AUTHORS = [
  {
    id: 'aperture-lab',
    name: '光圈实验室',
    roles: '摄影师 · 城市观察者 · 内容创作者',
    profile: {
      location: '城市夜色 / 街头纪实',
      joinedAt: '2024-05',
      updateRhythm: '每周 2 篇深度拆解',
      signature: '把暗光里的层次和街头情绪留下来。',
      specialties: ['夜景流程', '扫街装备', '现场判断', '后期整理'],
    },
    bio: [
      '用镜头记录城市夜色与街头细节',
      '分享拍摄技巧、器材经验与创作心得',
    ],
    buttonLabel: '进入作者专栏',
    worksCount: 12,
    avatarLabel: '光圈',
    focusTags: ['夜景摄影', '街头观察', '轻量装备'],
    quote: '好的夜景不是更亮，而是更有层次。',
    featuredPostIds: [1, 4],
  },
  {
    id: 'gear-study',
    name: '器材研究会',
    roles: '摄影器材观察者 · 搭配控 · 测评写作者',
    bio: [
      '专注入门到进阶器材选择与镜头组合',
      '把复杂参数翻译成更好理解的购买建议',
    ],
    buttonLabel: '进入作者专栏',
    worksCount: 18,
    avatarLabel: '器研',
    focusTags: ['镜头搭配', '预算规划', '旅行微单'],
    quote: '器材升级不是买最贵，而是买最合适。',
    featuredPostIds: [2, 6],
  },
  {
    id: 'color-manual',
    name: '调色手册',
    roles: '后期流程设计者 · 色彩观察者 · 视觉整理控',
    bio: [
      '关注从筛片到导出的完整后期工作流',
      '分享更稳定、更省时间的调色方法和统一策略',
    ],
    buttonLabel: '进入作者专栏',
    worksCount: 15,
    avatarLabel: '调色',
    focusTags: ['Lightroom', '批量修图', '色彩统一'],
    quote: '调色不是加效果，而是把画面拉回你想表达的气氛。',
    featuredPostIds: [5, 7],
  },
];

function getReviewNoteForStatus(status, fallback = '') {
  if (status === 'published') {
    return '审核通过，文章已经展示在博客列表。';
  }

  if (status === 'rejected') {
    return '这篇还需要修改，调整后可以重新提交。';
  }

  if (status === 'pending') {
    return '已提交，正在等待审核。';
  }

  if (status === 'draft') {
    return '草稿已保存，改好后再提交审核。';
  }

  return fallback;
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function parseTags(tags) {
  if (Array.isArray(tags)) {
    return tags.filter(Boolean).slice(0, 5);
  }

  return tags
    .split(/[,，\n]/)
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 5);
}

function createManagedArticleId() {
  return `local-${Date.now()}`;
}

function getManagedArticleCounts(articles) {
  return articles.reduce(
    (counts, article) => {
      counts.all += 1;
      counts[article.status] = (counts[article.status] ?? 0) + 1;
      return counts;
    },
    { all: 0, draft: 0, pending: 0, published: 0, rejected: 0 },
  );
}

function filterManagedArticles(articles, statusFilter, searchValue) {
  const keyword = searchValue.trim().toLowerCase();

  return articles.filter((article) => {
    const statusMatched = statusFilter === 'all' || article.status === statusFilter;
    const keywordMatched =
      keyword.length === 0 ||
      [article.title, article.excerpt, article.category, article.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(keyword);

    return statusMatched && keywordMatched;
  });
}

function normalizeManagedArticle(article) {
  return {
    id: article.id,
    title: article.title ?? '',
    category: article.category ?? '技术分享',
    tags: parseTags(article.tags ?? ''),
    excerpt: article.excerpt ?? '',
    body: article.body ?? '',
    coverName: article.coverName ?? '',
    coverPreview: article.coverPreview ?? '',
    coverSize: article.coverSize ?? '',
    coverType: article.coverType ?? '',
    status: article.status ?? 'draft',
    reviewNote: article.reviewNote ?? '',
    author: article.author ?? '社区投稿',
    createdAt: article.createdAt ?? getTodayString(),
    updatedAt: article.updatedAt ?? article.createdAt ?? getTodayString(),
  };
}

function formatFileSize(size) {
  if (!size) {
    return '';
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function createContentBlocksFromText(text) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return [
      {
        title: '正文',
        body: '这篇文章还没有补充完整正文。',
      },
    ];
  }

  return blocks.map((block, index) => {
    const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
    const firstLine = lines[0] ?? '';
    const headingMatched = firstLine.startsWith('#');
    const title = headingMatched
      ? firstLine.replace(/^#+\s*/, '') || `正文 ${index + 1}`
      : index === 0
        ? '正文开篇'
        : `正文段落 ${index + 1}`;
    const body = headingMatched ? lines.slice(1).join('\n') : lines.join('\n');

    return {
      title,
      body: body || firstLine,
    };
  });
}

function readManagedArticles() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawArticles = window.localStorage.getItem(MANAGED_ARTICLES_STORAGE_KEY);
    const parsedArticles = rawArticles ? JSON.parse(rawArticles) : [];

    return Array.isArray(parsedArticles)
      ? parsedArticles.map((article) => normalizeManagedArticle(article))
      : [];
  } catch {
    return [];
  }
}

function writeManagedArticles(articles) {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    window.localStorage.setItem(MANAGED_ARTICLES_STORAGE_KEY, JSON.stringify(articles));
    return true;
  } catch {
    return false;
  }
}

function createManagedArticlePost(article) {
  const normalizedArticle = normalizeManagedArticle(article);

  return {
    id: `managed-${normalizedArticle.id}`,
    category: normalizedArticle.category,
    title: normalizedArticle.title,
    excerpt: normalizedArticle.excerpt,
    heroExcerpt: normalizedArticle.excerpt,
    author: normalizedArticle.author,
    date: normalizedArticle.updatedAt,
    views: '0',
    comments: 0,
    image: normalizedArticle.coverPreview || professionalCoverImages[0],
    heroTone: normalizedArticle.category === '器材资讯' ? 'gear' : 'night',
    tags: normalizedArticle.tags,
    source: 'publisher',
    status: normalizedArticle.status,
    reviewNote: normalizedArticle.reviewNote,
    coverMeta: {
      name: normalizedArticle.coverName,
      size: normalizedArticle.coverSize,
      type: normalizedArticle.coverType,
    },
    discussionTitle: `讨论区：${normalizedArticle.title}`,
    discussionSummary: '这篇文章来自社区投稿，欢迎在评论区继续补充经验和想法。',
    contentBlocks: createContentBlocksFromText(normalizedArticle.body),
    commentsList: [],
  };
}

function getPublishedManagedPosts(articles = readManagedArticles()) {
  return articles
    .filter((article) => article.status === 'published')
    .map((article) => createManagedArticlePost(article));
}

function getAllBlogPosts() {
  return [...blogPosts, ...getPublishedManagedPosts()];
}

function getBlogPostById(postId) {
  return getAllBlogPosts().find((post) => String(post.id) === String(postId)) ?? null;
}

function getBlogDetailPath(postId) {
  return `${BLOG_ROUTE}/${postId}`;
}

function resolveAuthorFeaturedPosts(author, postPool) {
  if (author.featuredPosts?.length) {
    return author.featuredPosts.slice(0, 2);
  }
  if (author.featuredPostIds?.length) {
    const fromIds = author.featuredPostIds
      .map((postId) => postPool.find((post) => post.id === postId))
      .filter(Boolean);
    if (fromIds.length > 0) return fromIds.slice(0, 2);
  }
  return [...postPool]
    .filter((post) => {
      if (author.publicId != null && post.authorPublicId != null) {
        return String(post.authorPublicId) === String(author.publicId);
      }
      return post.author === author.name;
    })
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 2);
}

function getAuthorPosts(authorName) {
  return [...getAllBlogPosts()]
    .filter((post) => post.author === authorName)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

function getAdjacentPosts(post) {
  const sortedPosts = [...getAllBlogPosts()].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
  const currentIndex = sortedPosts.findIndex((item) => item.id === post.id);

  return {
    previous: currentIndex > 0 ? sortedPosts[currentIndex - 1] : null,
    next: currentIndex >= 0 ? sortedPosts[currentIndex + 1] ?? null : null,
  };
}

function getArticleSections(post) {
  if (post.contentBlocks?.length > 0) {
    return post.contentBlocks;
  }

  return [
    {
      title: '创作背景',
      body: post.excerpt,
    },
    {
      title: '方法笔记',
      body:
        post.heroExcerpt ??
        '这篇内容会继续补充更完整的拍摄流程、现场判断和后期整理方式。',
    },
    {
      title: '讨论延伸',
      body: post.discussionSummary,
    },
  ];
}

function getRelatedPosts(post) {
  return getAllBlogPosts()
    .filter((item) => item.id !== post.id && item.category === post.category)
    .slice(0, 3);
}

function getSeedComments(post) {
  return (post?.commentsList ?? []).map((comment, index) => ({
    ...comment,
    id: `seed-${post.id}-${index}`,
  }));
}

export function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const apiBlogId = parseApiBlogRouteId(id);

  if (apiBlogId != null) {
    return <ApiBlogDetail blogId={apiBlogId} />;
  }

  const post = getBlogPostById(id);

  if (!post) {
    return (
      <ThemeProvider colorMode="night" nightScheme="dark_dimmed">
        <BaseStyles className="blog-board__base">
          <section className="blog-detail blog-detail--empty">
            <div className="blog-board__empty">
              没有找到这篇博客，可能链接已经更新。
              <Button className="blog-detail__empty-action" onClick={() => navigate(BLOG_ROUTE)}>
                返回博客列表
              </Button>
            </div>
          </section>
        </BaseStyles>
      </ThemeProvider>
    );
  }

  return <BlogDetailContent key={post.id} post={post} />;
}

function BlogDetailContent({ post }) {
  const navigate = useNavigate();
  const articleSections = useMemo(() => getArticleSections(post), [post]);
  const outline = useMemo(() => parseSectionsOutline(articleSections), [articleSections]);
  const [localComments, setLocalComments] = useState(() => getSeedComments(post));
  const [nextCommentId, setNextCommentId] = useState(1);
  const adjacentPosts = getAdjacentPosts(post);

  const handleLocalCommentAdd = (content) => {
    const text = content.trim();
    if (!text) return;
    setLocalComments((comments) => [
      ...comments,
      {
        id: `local-${post.id}-${nextCommentId}`,
        author: '我',
        content: text,
      },
    ]);
    setNextCommentId((value) => value + 1);
    document.getElementById('article-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <ThemeProvider colorMode="night" nightScheme="dark_dimmed">
      <BaseStyles className="blog-board__base">
        <BlogArticleView
          post={post}
          sections={articleSections}
          outline={outline}
          adjacentPosts={adjacentPosts}
          localComments={localComments}
          onLocalCommentAdd={handleLocalCommentAdd}
          onBack={() => navigate(BLOG_ROUTE)}
          onNavigatePost={(postId) => navigate(getBlogDetailPath(postId))}
        />
      </BaseStyles>
    </ThemeProvider>
  );
}


export function BlogPublisher() {
  const navigate = useNavigate();
  const publisherRef = useRef(null);
  const [managedArticles, setManagedArticles] = useState(() => readManagedArticles());
  const [articleForm, setArticleForm] = useState(initialArticleForm);
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');
  const [adminSearchValue, setAdminSearchValue] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState('idle');
  const [dragActive, setDragActive] = useState(false);
  const [publishMessage, setPublishMessage] = useState(
    '先把文章和封面整理好，保存草稿后可以慢慢改。',
  );

  const managedArticleCounts = useMemo(
    () => getManagedArticleCounts(managedArticles),
    [managedArticles],
  );
  const statusCards = useMemo(
    () =>
      Object.entries(articleStatusMeta).map(([status, meta]) => ({
        status,
        ...meta,
        count: managedArticleCounts[status],
      })),
    [managedArticleCounts],
  );
  const visibleManagedArticles = useMemo(() => {
    return filterManagedArticles(managedArticles, adminStatusFilter, adminSearchValue);
  }, [adminSearchValue, adminStatusFilter, managedArticles]);
  const currentUploadState = uploadStateMeta[uploadState] ?? uploadStateMeta.idle;

  const updateArticleForm = (field, value) => {
    setArticleForm((current) => ({ ...current, [field]: value }));
  };

  const commitManagedArticles = (nextArticles, successMessage) => {
    setManagedArticles(nextArticles);
    setPublishMessage(
      writeManagedArticles(nextArticles)
        ? successMessage
        : '保存失败，浏览器存储空间可能已满。',
    );
  };

  const resetArticleForm = () => {
    setArticleForm(initialArticleForm);
    setEditingArticleId(null);
    setUploadProgress(0);
    setUploadState('idle');
  };

  const handleCoverFile = (file) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadState('error');
      setUploadProgress(0);
      setPublishMessage('请选择图片格式的封面文件。');
      return;
    }

    setUploadState('uploading');
    setUploadProgress(18);
    setPublishMessage('正在读取封面图。');

    const reader = new FileReader();
    reader.onload = () => {
      setUploadProgress(68);
      updateArticleForm('coverName', file.name);
      updateArticleForm('coverPreview', String(reader.result));
      updateArticleForm('coverSize', formatFileSize(file.size));
      updateArticleForm('coverType', file.type);
      window.setTimeout(() => {
        setUploadProgress(100);
        setUploadState('done');
        setPublishMessage('封面图已准备好。');
      }, 240);
    };
    reader.onerror = () => {
      setUploadProgress(0);
      setUploadState('error');
      setPublishMessage('封面图读取失败，请重新选择一张图片。');
    };
    reader.readAsDataURL(file);
  };

  const handleCoverSelect = (event) => {
    handleCoverFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleCoverDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    handleCoverFile(event.dataTransfer.files?.[0]);
  };

  const clearCover = () => {
    updateArticleForm('coverName', '');
    updateArticleForm('coverPreview', '');
    updateArticleForm('coverSize', '');
    updateArticleForm('coverType', '');
    setUploadProgress(0);
    setUploadState('idle');
  };

  const handleSaveArticle = (status) => {
    const title = articleForm.title.trim();
    const excerpt = articleForm.excerpt.trim();
    const body = articleForm.body.trim();

    if (!title || !excerpt || !body) {
      setPublishMessage('标题、摘要和正文是必填项，先把这三项补齐再保存。');
      return;
    }

    const now = getTodayString();
    const existingArticle = managedArticles.find((article) => article.id === editingArticleId);
    const nextArticle = normalizeManagedArticle({
      ...articleForm,
      id: editingArticleId ?? createManagedArticleId(),
      title,
      excerpt,
      body,
      tags: parseTags(articleForm.tags),
      status,
      reviewNote: getReviewNoteForStatus(status, existingArticle?.reviewNote),
      author: existingArticle?.author ?? '社区投稿',
      createdAt: existingArticle?.createdAt ?? now,
      updatedAt: now,
    });
    const nextArticles = editingArticleId
      ? managedArticles.map((article) =>
          article.id === editingArticleId ? nextArticle : article,
        )
      : [nextArticle, ...managedArticles];

    commitManagedArticles(nextArticles, `文章已保存为“${articleStatusMeta[status].label}”。`);
    resetArticleForm();
  };

  const handleEditManagedArticle = (article) => {
    setEditingArticleId(article.id);
    setArticleForm({
      title: article.title,
      category: article.category,
      tags: article.tags.join('，'),
      excerpt: article.excerpt,
      body: article.body,
      coverName: article.coverName,
      coverPreview: article.coverPreview,
      coverSize: article.coverSize,
      coverType: article.coverType,
    });
    setUploadProgress(article.coverPreview ? 100 : 0);
    setUploadState(article.coverPreview ? 'done' : 'idle');
    setPublishMessage(`正在编辑《${article.title}》。`);
    window.setTimeout(() => {
      publisherRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleDeleteManagedArticle = (articleId) => {
    const nextArticles = managedArticles.filter((article) => article.id !== articleId);

    commitManagedArticles(nextArticles, '文章已删除。');

    if (editingArticleId === articleId) {
      resetArticleForm();
    }
  };

  const handleUpdateManagedStatus = (articleId, status) => {
    const now = getTodayString();
    const reviewNote = getReviewNoteForStatus(status);
    const nextArticles = managedArticles.map((article) =>
      article.id === articleId ? { ...article, status, reviewNote, updatedAt: now } : article,
    );

    commitManagedArticles(nextArticles, `文章状态已更新为“${articleStatusMeta[status].label}”。`);
  };

  return (
    <ThemeProvider colorMode="night" nightScheme="dark_dimmed">
      <BaseStyles className="blog-board__base">
        <section className="blog-board blog-board--publisher-page">
          <button
            type="button"
            className="blog-detail__back"
            onClick={() => navigate(BLOG_ROUTE)}
          >
            返回博客列表
          </button>

          <section
            ref={publisherRef}
            className="blog-board__publisher blog-board__publisher--page"
            aria-label="投稿管理"
          >
            <div className="blog-board__publisher-head">
              <div>
                <div className="blog-board__eyebrow">社区投稿</div>
                <h2>投稿管理</h2>
                <p>
                  写好文章，配好封面，再提交给管理员审核。草稿可以先放着，改完再发。
                </p>
              </div>
              <div className="blog-board__publisher-status">
                {Object.entries(articleStatusMeta).map(([status, meta]) => (
                  <button
                    key={status}
                    type="button"
                    className={`blog-board__status-chip${
                      adminStatusFilter === status ? ' is-active' : ''
                    }`}
                    onClick={() => setAdminStatusFilter(status)}
                  >
                    <Label size="small" variant={meta.variant}>
                      {meta.label}
                    </Label>
                    <span>{managedArticleCounts[status]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="blog-board__review-dashboard" aria-label="审核状态概览">
              {statusCards.map((item) => (
                <button
                  key={item.status}
                  type="button"
                  className={`blog-board__review-card${
                    adminStatusFilter === item.status ? ' is-active' : ''
                  }`}
                  onClick={() => setAdminStatusFilter(item.status)}
                >
                  <Label size="small" variant={item.variant}>
                    {item.label}
                  </Label>
                  <strong>{item.count}</strong>
                  <span>{item.hint}</span>
                </button>
              ))}
            </div>

            <div className="blog-board__publisher-grid">
              <form className="blog-board__publish-form" onSubmit={(event) => event.preventDefault()}>
                <div className="blog-board__form-row blog-board__form-row--split">
                  <label>
                    <span>标题</span>
                    <input
                      value={articleForm.title}
                      placeholder="请输入文章标题"
                      onChange={(event) => updateArticleForm('title', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>分类</span>
                    <select
                      value={articleForm.category}
                      onChange={(event) => updateArticleForm('category', event.target.value)}
                    >
                      {publishCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="blog-board__form-row">
                  <span>标签</span>
                  <input
                    value={articleForm.tags}
                    placeholder="用逗号分隔，例如：夜景摄影，参数设置"
                    onChange={(event) => updateArticleForm('tags', event.target.value)}
                  />
                </label>

                <label className="blog-board__form-row">
                  <span>摘要</span>
                  <textarea
                    value={articleForm.excerpt}
                    rows={3}
                    placeholder="列表卡片和详情页开头会展示这段摘要"
                    onChange={(event) => updateArticleForm('excerpt', event.target.value)}
                  />
                </label>

                <label className="blog-board__form-row">
                  <span>正文</span>
                  <textarea
                    value={articleForm.body}
                    rows={8}
                    placeholder="可以用空行分段；如果想加小标题，行首输入 # 标题"
                    onChange={(event) => updateArticleForm('body', event.target.value)}
                  />
                </label>

                <div
                  className={`blog-board__upload-box${
                    dragActive ? ' is-dragging' : ''
                  }${uploadState === 'done' ? ' is-uploaded' : ''}`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleCoverDrop}
                >
                  <div className="blog-board__upload-preview">
                    {articleForm.coverPreview ? (
                      <img src={articleForm.coverPreview} alt="封面预览" />
                    ) : (
                      <div>
                        <GraphIcon size={22} />
                        <span>封面预览</span>
                      </div>
                    )}
                  </div>
                  <div className="blog-board__upload-content">
                    <div className="blog-board__upload-title-row">
                      <strong>封面图</strong>
                      <Label size="small" variant={currentUploadState.variant}>
                        {currentUploadState.label}
                      </Label>
                    </div>
                    <p>
                      支持点击选择，也可以把图片拖到这里。建议使用横版封面。
                    </p>
                    <label className="blog-board__upload-button">
                      选择图片
                      <input type="file" accept="image/*" onChange={handleCoverSelect} />
                    </label>
                    {articleForm.coverName && (
                      <div className="blog-board__upload-meta">
                        <span>{articleForm.coverName}</span>
                        <small>{articleForm.coverSize}</small>
                        <button type="button" onClick={clearCover}>
                          删除重传
                        </button>
                      </div>
                    )}
                    <div className="blog-board__upload-progress" aria-label="上传进度">
                      <span style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <div className="blog-board__upload-foot">
                      <span>建议比例 16:9</span>
                      <span>{uploadProgress}%</span>
                    </div>
                  </div>
                </div>

                <div className="blog-board__publish-message">{publishMessage}</div>

                <div className="blog-board__publish-actions">
                  <Button type="button" onClick={() => handleSaveArticle('draft')}>
                    保存草稿
                  </Button>
                  <Button type="button" variant="primary" onClick={() => handleSaveArticle('pending')}>
                    提交审核
                  </Button>
                  <Button type="button" variant="invisible" onClick={resetArticleForm}>
                    {editingArticleId ? '取消编辑' : '清空表单'}
                  </Button>
                </div>
              </form>

              <div className="blog-board__admin-list">
                <div className="blog-board__admin-toolbar">
                  <button
                    type="button"
                    className={`blog-board__status-chip${
                      adminStatusFilter === 'all' ? ' is-active' : ''
                    }`}
                    onClick={() => setAdminStatusFilter('all')}
                  >
                    <span>全部</span>
                    <strong>{managedArticleCounts.all}</strong>
                  </button>
                  <TextInput
                    block
                    leadingVisual={SearchIcon}
                    placeholder="搜索投稿"
                    value={adminSearchValue}
                    onChange={(event) => setAdminSearchValue(event.target.value)}
                  />
                </div>

                <div className="blog-board__admin-items">
                  {visibleManagedArticles.length > 0 ? (
                    visibleManagedArticles.map((article) => {
                      const statusMeta = articleStatusMeta[article.status] ?? articleStatusMeta.draft;

                      return (
                        <article key={article.id} className="blog-board__admin-item">
                          <div className="blog-board__admin-thumb">
                            {article.coverPreview ? (
                              <img src={article.coverPreview} alt={`${article.title} 封面`} />
                            ) : (
                              <GraphIcon size={18} />
                            )}
                          </div>
                          <div className="blog-board__admin-main">
                            <div className="blog-board__admin-item-top">
                              <Label size="small" variant={statusMeta.variant}>
                                {statusMeta.label}
                              </Label>
                              <span>{article.updatedAt}</span>
                            </div>
                            <h3>{article.title}</h3>
                            <p>{article.excerpt}</p>
                            <div className="blog-board__admin-tags">
                              <Label size="small" variant="secondary">
                                {article.category}
                              </Label>
                              {article.tags.slice(0, 3).map((tag) => (
                                <Label key={tag} size="small" variant="secondary">
                                  #{tag}
                                </Label>
                              ))}
                            </div>
                            <div className="blog-board__admin-note">
                              {article.reviewNote || statusMeta.hint}
                            </div>
                            <div className="blog-board__admin-actions">
                              <Button size="small" onClick={() => handleEditManagedArticle(article)}>
                                编辑
                              </Button>
                              {article.status === 'draft' || article.status === 'rejected' ? (
                                <Button
                                  size="small"
                                  onClick={() => handleUpdateManagedStatus(article.id, 'pending')}
                                >
                                  提交审核
                                </Button>
                              ) : null}
                              {article.status === 'pending' ? (
                                <>
                                  <Button
                                    size="small"
                                    variant="primary"
                                    onClick={() =>
                                      handleUpdateManagedStatus(article.id, 'published')
                                    }
                                  >
                                    通过上架
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={() => handleUpdateManagedStatus(article.id, 'rejected')}
                                  >
                                    驳回
                                  </Button>
                                </>
                              ) : null}
                              {article.status === 'published' ? (
                                <Button
                                  size="small"
                                  onClick={() => navigate(getBlogDetailPath(`managed-${article.id}`))}
                                >
                                  预览详情
                                </Button>
                              ) : null}
                              {article.status === 'published' ? (
                                <Button
                                  size="small"
                                  onClick={() => handleUpdateManagedStatus(article.id, 'draft')}
                                >
                                  撤回草稿
                                </Button>
                              ) : null}
                              <Button
                                size="small"
                                variant="invisible"
                                onClick={() => handleDeleteManagedArticle(article.id)}
                              >
                                删除
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="blog-board__empty">
                      还没有投稿，先用左侧表单保存一篇试试。
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>
      </BaseStyles>
    </ThemeProvider>
  );
}

export default function Blog() {
  const toolbarRef = useRef(null);
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchValue, setSearchValue] = useState('');
  const [activePostId, setActivePostId] = useState(null);
  const [sortMode, setSortMode] = useState('latest');
  const [viewMode, setViewMode] = useState('spotlight');
  const [spotlightTopicId, setSpotlightTopicId] = useState(null);
  const [currentFeaturedAuthorIndex, setCurrentFeaturedAuthorIndex] = useState(0);
  const [toolbarHighlightKey, setToolbarHighlightKey] = useState(0);
  const [heroFocusState, setHeroFocusState] = useState({ id: null, token: 0 });
  const [surpriseCursor, setSurpriseCursor] = useState(0);
  const [apiFeedPosts, setApiFeedPosts] = useState([]);
  const [apiWorksFeed, setApiWorksFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [authorProfiles, setAuthorProfiles] = useState({});
  const goToFeaturedAuthorRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchWorksFeed()
      .then((workList) => {
        if (!cancelled) setApiWorksFeed(Array.isArray(workList) ? workList : []);
      })
      .catch(() => {
        if (!cancelled) setApiWorksFeed([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFeedLoading(true);
    fetchBlogFeed(sortMode)
      .then((blogList) => {
        if (cancelled) return;
        setApiFeedPosts(Array.isArray(blogList) ? blogList.map(mapApiBlogToCard) : []);
      })
      .catch(() => {
        if (!cancelled) setApiFeedPosts([]);
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sortMode]);

  /** 卡片流：接口真实数据 + localStorage 投稿；占位 blogPosts 仅用于演示详情 id=1,2… */
  const publicBlogPosts = useMemo(
    () => [...apiFeedPosts, ...getPublishedManagedPosts()],
    [apiFeedPosts],
  );

  /** 热门话题：/api/blog-posts/feed 数据，本周讨论热度 Top3 */
  const hotTopics = useMemo(
    () => buildHotTopicsFromPosts(publicBlogPosts),
    [publicBlogPosts],
  );

  const hotMeterHeights = useMemo(
    () => buildHotMeterHeights(publicBlogPosts),
    [publicBlogPosts],
  );

  const featuredAuthors = useMemo(() => {
    const built = buildFeaturedAuthors({
      posts: apiFeedPosts,
      works: apiWorksFeed,
      profilesByPublicId: authorProfiles,
    });
    return built.length > 0 ? built : FALLBACK_FEATURED_AUTHORS;
  }, [apiFeedPosts, apiWorksFeed, authorProfiles]);

  useEffect(() => {
    const ids = [
      ...new Set(
        buildFeaturedAuthors({ posts: apiFeedPosts, works: apiWorksFeed })
          .map((a) => a.publicId)
          .filter((id) => id != null),
      ),
    ];
    if (ids.length === 0) return undefined;

    let cancelled = false;
    Promise.all(ids.map((id) => fetchPublicProfile(id).catch(() => null))).then((profiles) => {
      if (cancelled) return;
      const map = {};
      profiles.forEach((p, index) => {
        if (p?.publicId != null) map[String(p.publicId)] = p;
        else if (p && ids[index] != null) map[String(ids[index])] = p;
      });
      setAuthorProfiles(map);
    });

    return () => {
      cancelled = true;
    };
  }, [apiFeedPosts, apiWorksFeed]);

  useEffect(() => {
    setCurrentFeaturedAuthorIndex((index) =>
      featuredAuthors.length === 0 ? 0 : Math.min(index, featuredAuthors.length - 1),
    );
  }, [featuredAuthors.length]);

  const currentFeaturedAuthor = featuredAuthors[currentFeaturedAuthorIndex] ?? featuredAuthors[0];
  const featuredAuthorPosts = useMemo(() => {
    if (!currentFeaturedAuthor) return [];
    return getAuthorSlotPosts(currentFeaturedAuthor, apiFeedPosts);
  }, [currentFeaturedAuthor, apiFeedPosts]);
  const featuredAuthorStatsRows = useMemo(
    () => (currentFeaturedAuthor ? featuredAuthorStats(currentFeaturedAuthor) : []),
    [currentFeaturedAuthor],
  );

  useEffect(() => {
    if (activePostId != null) return;
    const first = featuredAuthorPosts[0]?.id ?? publicBlogPosts[0]?.id ?? blogPosts[0]?.id ?? null;
    if (first != null) setActivePostId(first);
  }, [activePostId, featuredAuthorPosts, publicBlogPosts]);

  const keywordFilteredPosts = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return publicBlogPosts.filter((post) => {
      const keywordMatched =
        keyword.length === 0 ||
        [post.title, post.excerpt, post.author, post.category, (post.tags ?? []).join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(keyword);

      return keywordMatched;
    });
  }, [publicBlogPosts, searchValue]);

  const categoryCounts = useMemo(
    () =>
      categories.reduce((counts, category) => {
        counts[category] =
          category === '全部'
            ? keywordFilteredPosts.length
            : keywordFilteredPosts.filter((post) => post.category === category).length;
        return counts;
      }, {}),
    [keywordFilteredPosts],
  );

  const filteredPosts = useMemo(
    () =>
      [...keywordFilteredPosts]
        .filter((post) => activeCategory === '全部' || post.category === activeCategory)
        .sort((left, right) => {
          if (sortMode === 'popular') {
            return parseCompactNumber(right.views) - parseCompactNumber(left.views);
          }

          if (sortMode === 'discussed') {
            return right.comments - left.comments;
          }

          return new Date(right.date).getTime() - new Date(left.date).getTime();
        }),
    [activeCategory, keywordFilteredPosts, sortMode],
  );

  const activePost =
    filteredPosts.find((post) => post.id === activePostId) ?? filteredPosts[0] ?? null;
  const displayedPosts = useMemo(() => {
    if (viewMode !== 'spotlight' || activePost == null) {
      return filteredPosts;
    }

    return [activePost, ...filteredPosts.filter((post) => post.id !== activePost.id)];
  }, [activePost, filteredPosts, viewMode]);
  const spotlightTopic = hotTopics.find((topic) => topic.id === spotlightTopicId) ?? null;

  const pulseToolbar = () => {
    setToolbarHighlightKey((key) => key + 1);

    window.setTimeout(() => {
      const toolbar = toolbarRef.current;

      if (!toolbar) {
        return;
      }

      const top = toolbar.getBoundingClientRect().top + window.scrollY - 18;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 0);
  };

  const pulsePostCard = (postId) => {
    setHeroFocusState((current) => ({ id: postId, token: current.token + 1 }));
  };

  const openPostDetail = (post) => {
    navigate(getBlogDetailPath(post.id));
  };

  const handleViewAllBlogs = () => {
    pulseToolbar();
  };

  const handleAuthorExplore = () => {
    if (currentFeaturedAuthor?.publicId != null) {
      navigate(getMineProfilePath(currentFeaturedAuthor.publicId));
      return;
    }
    const featuredLeadPost = featuredAuthorPosts[0];
    if (!featuredLeadPost) return;
    setSpotlightTopicId(null);
    setActiveCategory('全部');
    setSearchValue(currentFeaturedAuthor?.name ?? '');
    setViewMode('spotlight');
    setActivePostId(featuredLeadPost.id);
    pulsePostCard(featuredLeadPost.id);
    pulseToolbar();
  };

  const handleTopicSelect = (topic) => {
    setSpotlightTopicId(topic.id);
    setActiveCategory('全部');
    setSearchValue('');
    setActivePostId(topic.targetPostId);
    setViewMode('spotlight');
    pulsePostCard(topic.targetPostId);
  };

  const handleSurprisePost = () => {
    if (filteredPosts.length === 0) {
      return;
    }

    const nextPost = filteredPosts[surpriseCursor % filteredPosts.length];
    setSurpriseCursor((cursor) => cursor + 1);
    setActivePostId(nextPost.id);
    setViewMode('spotlight');
    pulsePostCard(nextPost.id);
  };

  return (
    <ThemeProvider colorMode="night" nightScheme="dark_dimmed">
      <BaseStyles className="blog-board__base">
        <section className="blog-board">

          <div className="blog-board__hero">
            <div className="blog-board__hero-main">
              <div className="blog-board__eyebrow">推荐作者专栏</div>
              <div className="blog-board__hero-head">
                <h1>最新博客</h1>
              </div>

              <BlogHeroAuthorCarousel
                featuredAuthors={featuredAuthors}
                apiFeedPosts={apiFeedPosts}
                onIndexChange={setCurrentFeaturedAuthorIndex}
                onOpenPost={openPostDetail}
                goToIndexRef={goToFeaturedAuthorRef}
              />

              <div className="blog-board__hero-footer">
                <div className="blog-board__hero-footer-copy">
                  <strong>
                    {currentFeaturedAuthor.name} 正在更新 {Math.min(featuredAuthorPosts.length, 2)} 篇推荐内容
                  </strong>
                  <p>
                    最近在写 {currentFeaturedAuthor.focusTags.join('、')}，也可以切换其他作者看看。
                  </p>
                </div>

                <div className="blog-board__hero-footer-stack">
                  <div>
                    <div className="blog-board__hero-pagination" aria-label="推荐作者轮播">
                      {featuredAuthors.map((author, index) => (
                        <button
                          key={author.id}
                          type="button"
                          className={`blog-board__hero-dot${
                            currentFeaturedAuthorIndex === index ? ' is-active' : ''
                          }`}
                          aria-label={`切换到${author.name}`}
                          onClick={() => goToFeaturedAuthorRef.current?.(index)}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      className="blog-board__hero-link"
                      onClick={handleViewAllBlogs}
                    >
                      查看全部博客
                      <ChevronRightIcon size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <aside
              key={currentFeaturedAuthor?.id ?? currentFeaturedAuthorIndex}
              className="blog-board__hero-author"
            >
              <div className="blog-board__author-top">
                <div className="blog-board__author-avatar">
                  <div className="blog-board__author-avatar-core">
                    {currentFeaturedAuthor.avatarUrl ? (
                      <img
                        key={`${currentFeaturedAuthor.id}-${currentFeaturedAuthor.avatarUrl}`}
                        src={currentFeaturedAuthor.avatarUrl}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback instanceof HTMLElement) {
                            fallback.hidden = false;
                          }
                        }}
                      />
                    ) : null}
                    <span hidden={!!currentFeaturedAuthor.avatarUrl}>
                      {currentFeaturedAuthor.avatarLabel}
                    </span>
                  </div>
                </div>

                <div className="blog-board__author-identity">
                  <div className="blog-board__author-label">
                    <StateLabel size="small" status="open">
                      推荐作者
                    </StateLabel>
                  </div>
                  <h2 className="blog-board__author-name">{currentFeaturedAuthor.name}</h2>
                  <div className="blog-board__author-roles">{currentFeaturedAuthor.roles}</div>
                </div>
              </div>

              <div className="blog-board__author-bio">
                {currentFeaturedAuthor.bio.map((line, lineIndex) => (
                  <p key={`${currentFeaturedAuthor.id}-bio-${lineIndex}`}>{line}</p>
                ))}
              </div>

              <Button variant="primary" leadingVisual={PersonIcon} onClick={handleAuthorExplore}>
                {currentFeaturedAuthor.buttonLabel}
              </Button>

              <div className="blog-board__author-focus">
                <div className="blog-board__author-section-title">近期关注</div>
                <div className="blog-board__author-tags">
                  {currentFeaturedAuthor.focusTags.map((tag) => (
                    <Label
                      key={tag}
                      className="blog-board__author-tag"
                      size="small"
                      variant="secondary"
                    >
                      {tag}
                    </Label>
                  ))}
                </div>
              </div>

              <div className="blog-board__author-stats">
                {featuredAuthorStatsRows.map((stat) => (
                  <div key={stat.label} className="blog-board__author-stat">
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <section className="blog-board__publish-entry" aria-label="投稿管理入口">
            <div>
              <div className="blog-board__eyebrow">社区投稿</div>
              <h2>想发一篇？</h2>
              <p>
                把标题、正文和封面整理好，提交审核后，合适的内容会出现在博客列表里。
              </p>
            </div>
            <div className="blog-board__publish-entry-actions">
              <Label size="small" variant="success">
                {publicBlogPosts.length - blogPosts.length} 篇投稿已发布
              </Label>
              <Button
                variant="primary"
                leadingVisual={GraphIcon}
                onClick={() => navigate(BLOG_PUBLISH_ROUTE)}
              >
                去投稿管理
              </Button>
            </div>
          </section>

          <div className="blog-board__statusline">
            <div className="blog-board__status-copy">
              <StateLabel size="small" status={spotlightTopic ? 'open' : 'closed'}>
                {spotlightTopic ? '话题聚焦' : '浏览模式'}
              </StateLabel>
              <span>
                {spotlightTopic
                  ? `已聚焦：${spotlightTopic.title}`
                  : `${sortOptions[sortMode].label} · ${
                      viewMode === 'spotlight' ? '聚焦' : '网格'
                    }`}
              </span>
            </div>

            <div className="blog-board__status-actions">
              <Button
                leadingVisual={ZapIcon}
                size="small"
                disabled={filteredPosts.length === 0}
                onClick={handleSurprisePost}
              >
                换一篇
              </Button>
              {(spotlightTopic || searchValue.length > 0 || activeCategory !== '全部') && (
                <Button
                  variant="invisible"
                  size="small"
                  onClick={() => {
                    setSpotlightTopicId(null);
                    setSearchValue('');
                    setActiveCategory('全部');
                  }}
                >
                  重置
                </Button>
              )}
            </div>
          </div>

          <div
            key={toolbarHighlightKey}
            ref={toolbarRef}
            className={`blog-board__toolbar${
              toolbarHighlightKey > 0 ? ' is-highlighted' : ''
            }`}
          >
            <div className="blog-board__toolbar-row">
              <UnderlineNav className="blog-board__nav" aria-label="博客分类">
                {categories.map((category) => (
                  <UnderlineNav.Item
                    key={category}
                    href="#blog-feed"
                    aria-current={activeCategory === category ? 'page' : undefined}
                    counter={categoryCounts[category]}
                    onSelect={(event) => {
                      event.preventDefault();
                      setSpotlightTopicId(null);
                      setActiveCategory(category);
                    }}
                  >
                    {category}
                  </UnderlineNav.Item>
                ))}
              </UnderlineNav>
            </div>

            <div className="blog-board__toolbar-row">
              <div className="blog-board__controls">
                <ActionMenu>
                  <ActionMenu.Button leadingVisual={SlidersIcon} size="small">
                    {sortOptions[sortMode].label}
                  </ActionMenu.Button>
                  <ActionMenu.Overlay align="end">
                    <ActionList selectionVariant="single" showDividers>
                      {Object.entries(sortOptions).map(([key, option]) => {
                        const Icon = option.icon;

                        return (
                          <ActionList.Item
                            key={key}
                            selected={sortMode === key}
                            onSelect={() => setSortMode(key)}
                          >
                            <ActionList.LeadingVisual>
                              <Icon size={16} />
                            </ActionList.LeadingVisual>
                            {option.label}
                            <ActionList.Description>{option.hint}</ActionList.Description>
                          </ActionList.Item>
                        );
                      })}
                    </ActionList>
                  </ActionMenu.Overlay>
                </ActionMenu>

                <SegmentedControl
                  aria-label="博客展示模式"
                  onChange={(selectedIndex) =>
                    setViewMode(selectedIndex === 0 ? 'spotlight' : 'grid')
                  }
                  size="small"
                >
                  <SegmentedControl.Button
                    leadingVisual={RowsIcon}
                    selected={viewMode === 'spotlight'}
                  >
                    聚焦
                  </SegmentedControl.Button>
                  <SegmentedControl.Button
                    leadingVisual={ColumnsIcon}
                    selected={viewMode === 'grid'}
                  >
                    网格
                  </SegmentedControl.Button>
                </SegmentedControl>
              </div>

              <div className="blog-board__search">
                <TextInput
                  id="blog-search-input"
                  block
                  className="blog-board__search-input"
                  leadingVisual={SearchIcon}
                  trailingAction={
                    searchValue ? (
                      <TextInput.Action
                        aria-label="清空搜索"
                        icon={XIcon}
                        onClick={() => {
                          setSpotlightTopicId(null);
                          setSearchValue('');
                        }}
                      />
                    ) : undefined
                  }
                  placeholder="搜索标题、分类、作者或关键词..."
                  type="search"
                  value={searchValue}
                  onChange={(event) => {
                    setSpotlightTopicId(null);
                    setSearchValue(event.target.value);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="blog-board__layout">
            <div id="blog-feed" className={`blog-board__feed blog-board__feed--${viewMode}`}>
              {feedLoading && displayedPosts.length === 0 ? (
                <div className="blog-board__empty">加载博客列表…</div>
              ) : displayedPosts.length > 0 ? (
                displayedPosts.map((post) => (
                  <BlogFeedCard
                    key={`${post.id}-${heroFocusState.id === post.id ? heroFocusState.token : 'idle'}`}
                    post={post}
                    heroFocus={heroFocusState.id === post.id}
                    onOpen={openPostDetail}
                  />
                ))
              ) : (
                <div className="blog-board__empty">
                  没有找到匹配内容，试试更换分类或者输入更短一点的关键词。
                </div>
              )}
            </div>

            <aside className="blog-board__aside">
              <section className="blog-board__panel">
                <h3 className="blog-board__panel-title">
                  <CommentDiscussionIcon size={16} />
                  讨论区
                </h3>

                {activePost ? (
                  <>
                    <div className="blog-board__discussion-title">
                      {activePost.discussionTitle ?? `讨论区：${activePost.title}`}
                    </div>
                    <div className="blog-board__discussion-summary">
                      {activePost.discussionSummary ?? activePost.excerpt}
                    </div>

                    <div className="blog-board__discussion-list">
                      {(activePost.commentsList ?? []).map((item) => (
                        <div
                          key={`${activePost.id}-${item.author}`}
                          className="blog-board__comment"
                        >
                          <strong>{item.author}</strong>
                          <p>{item.content}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="blog-board__empty">
                    当前筛选下没有可联动的讨论内容。
                  </div>
                )}
              </section>

              <section className="blog-board__panel blog-board__panel--hot-topics">
                <div className="blog-board__hot-header">
                  <div>
                    <h3 className="blog-board__panel-title">
                      <PulseIcon size={16} />
                      热门话题
                    </h3>
                    <p>本周讨论热度</p>
                  </div>
                  <Label size="small" variant="accent">
                    本周
                  </Label>
                </div>

                <div className="blog-board__hot-meter" aria-hidden="true">
                  {hotMeterHeights.map((heat, index) => (
                    <span
                      key={`${heat}-${index}`}
                      style={{ '--topic-heat': `${heat}%` }}
                    />
                  ))}
                </div>

                <div className="blog-board__topic-list">
                  <ActionList selectionVariant="single" showDividers={false}>
                    {hotTopics.map((topic, index) => {
                      const isActiveTopic = spotlightTopicId === topic.id;

                      return (
                        <ActionList.Item
                          key={topic.id}
                          className={`blog-board__topic-row${
                            isActiveTopic ? ' is-active' : ''
                          }`}
                          selected={isActiveTopic}
                          onSelect={() => handleTopicSelect(topic)}
                        >
                          <ActionList.LeadingVisual>
                            <span className="blog-board__topic-rank">
                              {index + 1}
                            </span>
                          </ActionList.LeadingVisual>

                          <div className="blog-board__topic-copy">
                            <div className="blog-board__topic-title-row">
                              <strong>{topic.title}</strong>
                              {isActiveTopic && (
                                <StateLabel size="small" status="open">
                                  讨论中
                                </StateLabel>
                              )}
                            </div>
                            <span>{topic.description}</span>
                            <div className="blog-board__topic-labels">
                              <Label size="small" variant="secondary">
                                {topic.category}
                              </Label>
                              <Label size="small" variant="secondary">
                                {topic.query}
                              </Label>
                            </div>
                          </div>

                          <ActionList.TrailingVisual>
                            <CounterLabel className="blog-board__topic-value">
                              <CommentDiscussionIcon size={12} />
                              {topic.value}
                            </CounterLabel>
                          </ActionList.TrailingVisual>

                          <ActionList.TrailingAction
                            aria-label={`联动到${topic.title}`}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleTopicSelect(topic);
                            }}
                          >
                            <ChevronRightIcon size={14} />
                          </ActionList.TrailingAction>
                        </ActionList.Item>
                      );
                    })}
                  </ActionList>
                </div>

                <button
                  type="button"
                  className="blog-board__topic-cta"
                  disabled={hotTopics.length === 0}
                  onClick={() => hotTopics[0] && handleTopicSelect(hotTopics[0])}
                >
                  查看全部话题
                  <ChevronRightIcon size={14} />
                </button>
              </section>

            </aside>
          </div>
        </section>
      </BaseStyles>
    </ThemeProvider>
  );
}

