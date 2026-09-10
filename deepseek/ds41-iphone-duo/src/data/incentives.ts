import { ASSETS } from './assets';

/** 「在 Apple 购买 iPhone 好处多多」横向卡片。 */
export interface IncentiveCard {
  id: string;
  /** 小标签 */
  eyebrow: string;
  /** 标题（原站为多行） */
  headline: string[];
  body: string;
  image: string;
  alt: string;
  /** 有详情按钮的卡片打开弹层 */
  details?: { title: string; paragraphs: string[] };
  /** 有明确跳转的卡片直接给链接 */
  href?: string;
  cta?: string;
}

export const INCENTIVE_INTRO = {
  eyebrow: '在 Apple 购买 iPhone',
  headline: ['好处多多'],
  cta: '选购 iPhone',
  /** 参考页面的「选购 iPhone」指向 /cn/shop/goto/buy_iphone */
  href: 'https://www.apple.com.cn/cn/shop/goto/buy_iphone',
} as const;

export const INCENTIVE_CARDS: IncentiveCard[] = [
  {
    id: 'iphone-upgrade',
    eyebrow: 'iPhone 年年焕新计划',
    headline: ['新机年年换，', '超值更随心。'],
    body:
      '从 Apple 入手指定新款 iPhone 时加购 AppleCare+ 服务计划，且符合相应条件，购机后 3 至 15 个月内即可升级下一部 iPhone，' +
      '还可享原设备购买价格至少 50% 的折抵优惠。',
    image: ASSETS.incentive.carrier,
    alt: 'iPhone 年年焕新计划示意。',
    href: 'https://www.apple.com.cn/cn/shop/goto/iphone/iphone_upgrade_program',
    cta: '了解 iPhone 年年焕新计划',
    details: {
      title: 'iPhone 年年焕新计划',
      paragraphs: [
        '从 Apple 入手指定新款 iPhone 时加购 AppleCare+ 服务计划，且符合相应条件，购机后 3 至 15 个月内即可升级下一部 iPhone，还可享原设备购买价格至少 50% 的折抵优惠。',
        '本计划的加入及之后的升级换购不能与其他优惠（包括但不限于商务客户优惠及企业员工客户优惠等）同时享受。详情请参阅 iPhone 年年焕新计划的完整条款和条件。',
      ],
    },
  },
  {
    id: 'trade-in',
    eyebrow: 'Apple Trade In 换购计划',
    headline: ['换购新 iPhone，', '还能省一笔。'],
    body: '用 iPhone 13 或后续机型来换购 iPhone Duo，可享预计为 RMB 900 至 RMB 8300 的折抵优惠。',
    image: ASSETS.incentive.tradeIn,
    alt: 'Apple Trade In 换购计划示意。',
    href: 'https://www.apple.com.cn/cn/shop/trade-in',
    cta: '获取折抵估价',
  },
  {
    id: 'financing',
    eyebrow: '灵活的付款方案',
    headline: ['多种免息分期可选。'],
    body: '购买 Apple 产品最长可享 24 个月免息分期。支付宝、微信支付及多家合作银行任你选择。',
    image: ASSETS.incentive.buy,
    alt: '分期付款方案示意。',
    details: {
      title: '灵活的付款方案',
      paragraphs: [
        '上述所示分期付款金额仅为使用特定期数免息分期付款估算得出的示例（仅显示整数数额，未显示小数点以后的金额），实际支付金额以银行、花呗或微信分付账单为准。',
        '最高可享 24 期免息分期，到 Apple Store 零售店和在线商店购买时可享受的免息分期期数和最低限额可能有所不同。所有购物分期均需相应的信用卡发卡机构、花呗或微信分付批准。',
      ],
    },
  },
  {
    id: 'setup',
    eyebrow: '个人设置辅导',
    headline: ['个人设置辅导，', '帮你认识新 iPhone。'],
    body: '参加在线课程，让 Specialist 专家带你设置手里的 iPhone，探索各种新功能。',
    image: ASSETS.incentive.setup,
    alt: '个人设置辅导课程示意。',
    href: 'https://www.apple.com.cn/today/',
    cta: '预约在线课程',
  },
  {
    id: 'delivery',
    eyebrow: '送货和取货',
    headline: ['可免费送货，', '也可到店取货。'],
    body: '所有订单均可享免费送货。部分订单可选择免费的三小时快送，或亲自到店取货。',
    image: ASSETS.incentive.deliver,
    alt: '送货与到店取货示意。',
    details: {
      title: '送货和取货',
      paragraphs: [
        '所有订单均可享免费送货。部分订单可选择免费的三小时快送，或亲自到店取货。',
        '三小时为根据过往物流数据推算的预估时间，特殊情况下可能会延迟。该服务由第三方合作伙伴提供，可能需额外支付运费，且仅适用于部分商品和寄送地址，具体以结账页面为准。',
      ],
    },
  },
  {
    id: 'specialist',
    eyebrow: '导购',
    headline: ['Specialist 专家', '协助选购。'],
    body: '无论线上还是在 Apple Store 零售店，我们都能帮你找到心仪的产品，并解答你的各种疑问。',
    image: ASSETS.incentive.specialist,
    alt: 'Specialist 专家协助选购示意。',
    href: 'https://www.apple.com.cn/retail/',
    cta: '查找附近的零售店',
  },
  {
    id: 'store-app',
    eyebrow: 'Apple Store App',
    headline: ['专属于你的', '购物体验。'],
    body: '更个性化的购物方式，尽在 Apple Store app。',
    image: ASSETS.incentive.storeApp,
    alt: 'Apple Store app 界面示意。',
    details: {
      title: 'Apple Store App',
      paragraphs: [
        '更个性化的购物方式，尽在 Apple Store app。你可以在这里查看订单状态、预约到店服务，并获得基于你设备的推荐。',
        '本页为前端复刻演示，扫码与下载入口仅作视觉还原，不指向真实商店流程。',
      ],
    },
  },
];
