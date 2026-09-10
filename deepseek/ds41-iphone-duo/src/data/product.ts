/**
 * 产品与购买相关的配置。
 *
 * 价格、预购与发售时间均取自参考页面首屏与购买模块，未做推算。
 */

export const PRODUCT = {
  /** 首屏 h1 眉题 */
  eyebrow: 'iPhone Duo',
  /** 首屏主标题（原站在「hello」后另起一个居中句号） */
  headline: 'Hello，hello',
  /** 主标题尾部句号，单独一行居中 */
  headlinePeriod: '。',
  /** 预购 / 发售信息（无障碍读屏用完整句子） */
  availabilityFull: '10 月 16 日晚 8 点接受预购。10 月 23 日发售。',
  /** 视觉上的两行排布 */
  availabilityLines: ['10 月 16 日晚 8 点接受预购', '10 月 23 日发售'],
  /** 价格胶囊文案 */
  priceFrom: 'RMB 15,999 起或',
  priceMonthly: 'RMB 667/月 (24 期) 起',
  priceNote: '*',
  /** 首屏主按钮 */
  priceCta: '查看价格',
  /** 参考页面购买入口；本地演示打开说明弹层 */
  buyPath: 'https://www.apple.com.cn/cn/shop/goto/buy_iphone/iphone_duo',
  /** 首屏主视觉的无障碍描述 */
  heroAlt: '一只手握着展开状态的 iPhone Duo，内屏显示主屏幕。',
} as const;

/** 顶部全局导航的栏目（与参考页面一致的顺序）。 */
export const GLOBAL_NAV_ITEMS = [
  '商店',
  'Mac',
  'iPad',
  'iPhone',
  'Watch',
  'Vision',
  'AirPods',
  'TV 和家庭',
  '娱乐',
  '配件',
  '支持',
] as const;

/** 滚动后出现的悬浮产品导航；探索弹层里的章节入口。 */
export const EXPLORE_SECTIONS = [
  { id: 'highlights', label: '重点功能' },
  { id: 'design', label: '设计' },
  { id: 'product-viewer', label: '定睛细看' },
  { id: 'display', label: '显示屏' },
  { id: 'versatility', label: '灵活多用' },
  { id: 'cameras', label: '摄像头' },
  { id: 'performance', label: '性能' },
  { id: 'shared-features', label: '共有功能' },
  { id: 'accessories', label: '配件' },
  { id: 'incentive', label: '购买理由' },
  { id: 'compare', label: '机型比较' },
  { id: 'faq', label: '常见问题' },
] as const;

/** 探索弹层右侧的机型列表。 */
export const LOCAL_NAV_FAMILY = [
  { name: 'iPhone Duo', current: true, imageKey: 'iphoneDuo' },
  { name: 'iPhone 18 Pro', current: false, imageKey: 'iphone18Pro' },
  { name: 'iPhone 17', current: false, imageKey: 'iphone17' },
  { name: 'iPhone 17e', current: false, imageKey: 'iphone17e' },
  { name: 'iPhone 16', current: false, imageKey: 'iphone16' },
] as const;
