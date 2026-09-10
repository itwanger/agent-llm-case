import './footer.css';

/** 页脚目录（与参考页面 index 区块的分栏一致）。 */
const DIRECTORY = [
  {
    title: '探索 iPhone',
    links: ['探索全部 iPhone 机型', 'iPhone Duo', 'iPhone 18 Pro', 'iPhone Air', 'iPhone 17'],
  },
  {
    title: '选购 iPhone',
    links: ['选购 iPhone', 'iPhone 配件', 'Apple Trade In 换购计划', '分期付款', '个人设置辅导'],
  },
  {
    title: 'iPhone 相关',
    links: ['iPhone 支持', 'AppleCare', 'OS 27', 'Apple 打造的 App', 'iPhone 隐私保护'],
  },
  {
    title: '配合 Mac 更好用',
    links: ['iCloud+', 'Apple Pay', 'Siri', 'Apple at Work'],
  },
];

/** 脚注。文字取自参考页面 sosumi 区块，未增删内容。 */
const FOOTNOTES = [
  '* 上述所示分期付款金额仅为使用特定期数免息分期付款估算得出的示例（仅显示整数数额，未显示小数点以后的金额），实际支付金额以银行、花呗或微信分付账单为准。最高可享 24 期免息分期，到 Apple Store 零售店和在线商店购买时可享受的免息分期期数和最低限额可能有所不同。所有购物分期均需相应的信用卡发卡机构、花呗或微信分付批准。',
  '** 欲参与该计划的顾客需符合相应的资格条件。最高可享 24 期免息分期，实际可享受的期数与最低限额可能有所不同。依据国家补贴活动规则及购买须知参与国补的 Apple Store 零售店订单不支持分期付款。',
  '§ 三小时为根据过往物流数据推算的预估时间，特殊情况下可能会延迟。该服务由第三方合作伙伴提供，可能需额外支付运费，且仅适用于部分商品和寄送地址，具体以结账页面为准。',
  '1. 所有电池性能信息取决于网络配置和许多其他因素，实际结果可能有所不同。电池充电周期次数有限，最终可能需要更换。',
  '2. iPhone Duo 可防溅、抗水、防尘，在受控实验室条件下经测试，其效果在 IEC 60529 标准下达到 IP68 级别（在最深 6 米的水下停留时间最长可达 30 分钟）。防护性能可能会因日常磨损而下降。',
  '3. 显示屏采用曲线优美的圆角设计，四个圆角位于一个标准矩形内。按照标准矩形测量时，屏幕的对角线长度是 5.36 英寸（iPhone Duo 外屏）、6.27 英寸（iPhone 18 Pro）、6.86 英寸（iPhone 18 Pro Max）或 7.58 英寸（iPhone Duo 可折叠内屏）。实际可视区域较小。',
  '4. iPhone Duo 通过 eSIM 激活运营商网络，不支持实体 SIM 卡。在中国大陆仅支持激活型号 A3518、A3635、A3715、A3718 和 A3721，请前往运营商线下营业厅核验身份证件并进行激活。',
  '5. 快速充电测试采用放电完全的 iPhone Duo 机型。充电时间依电源适配器、设置、使用情况和环境因素可能有所差异。',
  '6. 视频播放测试使用试生产的 iPhone Duo 机型与软件。实际结果可能有所不同。',
  '7. 需要使用数据计划。5G 功能适用于特定国家或地区的特定运营商。',
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="viewport-content">
        <section className="footer__directory" aria-label="页脚目录">
          {DIRECTORY.map((column) => (
            <details className="footer__column" key={column.title} open>
              <summary className="footer__column-title">{column.title}</summary>
              <ul className="footer__links">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="https://www.apple.com.cn/iphone/" target="_blank" rel="noreferrer noopener">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>

        <p className="footer__more">
          更多选购方式：查找你附近的 Apple Store 零售店及更多门店，或者致电 400-666-8800。
        </p>

        <section className="footer__sosumi" aria-label="脚注">
          <ol className="footer__footnotes">
            {FOOTNOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ol>
        </section>

        <div className="footer__legal">
          <p className="footer__copyright">
            Copyright © 2026 Apple Inc. 保留所有权利。
          </p>
          <ul className="footer__legal-links">
            <li>
              <a href="https://www.apple.com.cn/legal/privacy/" target="_blank" rel="noreferrer noopener">
                隐私政策
              </a>
            </li>
            <li>
              <a href="https://www.apple.com.cn/legal/website-terms/" target="_blank" rel="noreferrer noopener">
                使用条款
              </a>
            </li>
            <li>
              <a href="https://www.apple.com.cn/legal/sales-support/" target="_blank" rel="noreferrer noopener">
                销售政策
              </a>
            </li>
            <li>
              <a href="https://www.apple.com.cn/legal/" target="_blank" rel="noreferrer noopener">
                法律信息
              </a>
            </li>
            <li>
              <a href="https://www.apple.com.cn/sitemap/" target="_blank" rel="noreferrer noopener">
                网站地图
              </a>
            </li>
          </ul>
          <p className="footer__locale">中国大陆</p>
        </div>

        <p className="footer__demo">
          本站是对 apple.com.cn/iphone-duo 产品页的前端复刻演示，用于学习与评测，
          与 Apple 无关联，也未获得 Apple 的授权或认可。页面文案、产品图片与视频均来自该产品页的公开资源，
          版权归 Apple 所有。页面不提供真实的账户、支付或订单功能。
        </p>
      </div>
    </footer>
  );
}
