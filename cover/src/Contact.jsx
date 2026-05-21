import teamLogo from './assets/blog-cover.jpg';
import './StaticInfoPage.css';

const PHONE = '18763696185';
const EMAIL = 'a222_0702@outlook.com';

export default function Contact() {
  return (
    <article className="static-info-page">
      <header className="static-info-page__hero">
        <img src={teamLogo} alt="Lensera 团队标识" className="static-info-page__logo" />
        <div>
          <p className="static-info-page__eyebrow">Contact</p>
          <h1>联系我们</h1>
          <p className="static-info-page__lead">
            如有合作、反馈、版权相关事宜，欢迎通过以下方式与 Lensera 团队取得联系。
          </p>
        </div>
      </header>

      <section>
        <h2>联系方式</h2>
        <dl className="static-info-contact-card">
          <div className="static-info-contact-row">
            <dt>手机</dt>
            <dd>
              <a href={`tel:${PHONE}`}>{PHONE}</a>
            </dd>
          </div>
          <div className="static-info-contact-row">
            <dt>邮箱</dt>
            <dd>
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </dd>
          </div>
        </dl>
        <p className="static-info-page__note">
          工作日优先处理邮件；涉及侵权投诉的材料请尽量完整，以便我们尽快核实。
        </p>
      </section>

      <section>
        <h2>版权与侵权保护声明</h2>
        <div className="static-info-legal">
          <p>
            Lensera 尊重并保护知识产权。用户在平台上传、发布的摄影作品、文章及相关素材，其著作权归上传者或合法权利人所有。未经权利人书面许可，任何第三方不得擅自复制、修改、传播、公开展示或用于商业用途。
          </p>
          <p>
            对于 Lensera 官方页面、标识、产品设计及平台聚合呈现方式，未经 Lensera 团队授权，不得用于可能造成混淆或贬损的来源引用与商业宣传。
          </p>
          <p>
            若您认为平台上的内容侵犯了您的合法权益，请通过上方邮箱联系我们，并提供：权利人身份证明、权属证明、侵权内容链接或截图、联系方式及诉求说明。我们将在合理期限内核查，对确认侵权的内容采取删除、屏蔽或限制访问等措施，并视情况对重复侵权账号进行处理。
          </p>
        </div>
      </section>

      <section>
        <h2>侵权内容与下架说明</h2>
        <div className="static-info-legal">
          <p>
            Lensera 反对一切侵犯他人著作权、肖像权、商标权及其他合法权益的行为。平台用户在上传作品或发布博客时，应确保拥有相应权利或已取得合法授权，不得上传盗用、搬运未授权素材，不得发布误导性署名内容。
          </p>
          <p>
            我们亦可能收到针对平台内容的下架通知。收到有效、完整的投诉后，我们将本着「先核实、后处理」的原则：初步判断成立后，将对涉嫌侵权内容先行下架或限制展示；必要时联系上传者说明情况。若上传者能提供反通知及合法授权证明，我们将在复核后决定是否恢复展示。
          </p>
          <p>
            <strong>投诉邮件建议包含：</strong>
          </p>
          <ul>
            <li>投诉人姓名 / 单位及有效联系方式；</li>
            <li>被侵权作品或权利说明、权属证明材料；</li>
            <li>本平台涉嫌侵权内容的链接、作品 ID 或清晰截图；</li>
            <li>诉求（删除、署名更正等）及真实性声明。</li>
          </ul>
          <p>
            恶意投诉、虚假陈述将可能影响投诉人后续申诉处理。Lensera 保留根据社区规范对违规账号警告、限权或封禁的权利。
          </p>
        </div>
        <p className="static-info-page__note">
          发送侵权相关邮件至 <a href={`mailto:${EMAIL}`}>{EMAIL}</a>，主题注明「侵权投诉」或「下架申请」以便优先分拣。
        </p>
      </section>
    </article>
  );
}
