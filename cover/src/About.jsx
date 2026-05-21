import teamLogo from './assets/blog-cover.jpg';
import './StaticInfoPage.css';

export default function About() {
  return (
    <article className="static-info-page">
      <header className="static-info-page__hero">
        <img src={teamLogo} alt="Lensera 团队标识" className="static-info-page__logo" />
        <div>
          <p className="static-info-page__eyebrow">About</p>
          <h1>关于我们</h1>
          <p className="static-info-page__lead">
            Lensera 是一个面向摄影爱好者的影像社区，希望用更纯粹的方式连接创作、分享与讨论。
          </p>
        </div>
      </header>

      <section>
        <h2>我们是谁</h2>
        <p>
          Lensera 由热爱摄影与视觉表达的同学团队发起并持续运营。我们相信好的作品值得被看见，也相信真诚的交流能让技巧与审美共同成长。
        </p>
        <p>
          在这里，你可以上传并浏览摄影作品、阅读与撰写摄影相关博客、关注感兴趣的作者，在尊重版权的前提下探索光影的多种可能。
        </p>
      </section>

      <section>
        <h2>我们在做什么</h2>
        <ul>
          <li>为创作者提供作品展示与互动空间（点赞、评论等）；</li>
          <li>为写作者提供博客发布与阅读体验；</li>
          <li>通过推荐与分类，帮助用户发现优质内容与活跃作者；</li>
          <li>持续优化产品体验，让社区保持简洁、好用、可信赖。</li>
        </ul>
      </section>

      <section>
        <h2>我们的态度</h2>
        <p>
          我们鼓励原创与署名，反对抄袭、盗图与未经授权的转载商用。平台展示的内容，其著作权归上传者或合法权利人所有；Lensera
          在平台运营范围内享有展示、推广所必需的使用权。
        </p>
        <p className="static-info-page__note">
          关于版权保护、侵权投诉与下架流程，请参见「联系我们」页面的说明。
        </p>
      </section>
    </article>
  );
}
