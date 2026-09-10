import { ASSETS } from './assets';

/** 「看看哪款 iPhone 适合你」对比区。 */
export interface CompareTout {
  /** 图标（可空，第一栏用文字小标题代替） */
  icon?: string;
  subheading?: string;
  items: string[];
}

export interface CompareProduct {
  id: string;
  name: string;
  badge: string;
  colors: { name: string; swatch: string }[];
  moreColors?: number;
  positioning: string[];
  price: string[];
  image: string;
  alt: string;
  current?: boolean;
  ctas: { label: string; href?: string; current?: boolean }[];
  touts: CompareTout[];
}

export const COMPARE_INTRO = {
  headline: '看看哪款 iPhone 适合你',
  /** 参考页面右上角的「探索全部 iPhone 机型」指向 /iphone/ */
  cta: '探索全部 iPhone 机型',
  href: 'https://www.apple.com.cn/iphone/',
  /** 底部胶囊按钮指向机型比较页 */
  compareCta: '比较各款 iPhone 机型',
  compareHref: 'https://www.apple.com.cn/iphone/compare/',
} as const;

export const COMPARE_PRODUCTS: CompareProduct[] = [
  {
    id: 'iphone-duo',
    name: 'iPhone Duo',
    badge: '新款',
    colors: [
      { name: '星光白色', swatch: '#f7f6f5' },
      { name: '夜空色', swatch: '#394452' },
    ],
    moreColors: 0,
    positioning: ['显示屏尺寸最大的 iPhone，', '可折叠、灵活摆、超坚固。'],
    price: ['RMB 15,999 起或', 'RMB 667/月 (24 期) 起*'],
    image: ASSETS.compare.iphoneDuo,
    alt: 'iPhone Duo',
    current: true,
    ctas: [
      { label: '当前浏览', current: true },
      { label: '查看价格', href: 'https://www.apple.com.cn/cn/shop/goto/buy_iphone/iphone_duo' },
    ],
    touts: [
      {
        subheading: '7.6 英寸',
        items: ['7.6 英寸超视网膜 XDR 可折叠屏3 采用纳米纹理工艺', '5.4 英寸超视网膜 XDR 外屏3'],
      },
      {
        icon: ASSETS.compare.iconBattery,
        items: ['使用内屏的视频播放最长可达 31 小时6', '使用外屏的视频播放最长可达 44 小时6'],
      },
      {
        icon: ASSETS.compare.iconChip,
        items: ['A20 Pro 芯片 采用 2 纳米制程', '7 核图形处理器 配备神经网络加速器'],
      },
      {
        icon: ASSETS.compare.iconCameraDuo,
        items: [
          '4800 万像素融合式双摄系统',
          '4800 万像素融合式主摄',
          '4800 万像素融合式超广角',
          '— 融合式长焦不适用',
          '— 光圈选项不适用',
        ],
      },
      {
        icon: ASSETS.compare.iconCenterStage,
        items: [
          '1200 万像素 Center Stage 前置摄像头',
          '视频超稳防抖',
          '同步双拍',
          '拍照和视频通话人物居中',
          '屏下 FaceTime 摄像头',
        ],
      },
      {
        icon: ASSETS.compare.iconAppleIntelligence,
        items: ['为 Apple 智能预备好12'],
      },
    ],
  },
  {
    id: 'iphone-18-pro',
    name: 'iPhone 18 Pro',
    badge: '新款',
    colors: [
      { name: '勃艮第酒红色', swatch: '#4d1821' },
      { name: '冰川蓝色', swatch: '#e8f2ff' },
      { name: '银色', swatch: '#f7f7f7' },
      { name: '黑色', swatch: '#3c3c3c' },
    ],
    moreColors: 0,
    positioning: ['iPhone 实力巅峰，', '性能与摄像头表现满级，', '电池续航大进化。'],
    price: ['RMB 9999 起或', 'RMB 417/月 (24 期) 起*'],
    image: ASSETS.compare.iphone18Pro,
    alt: 'iPhone 18 Pro',
    ctas: [
      { label: '进一步了解', href: 'https://www.apple.com.cn/iphone-18-pro/' },
      { label: '查看价格', href: 'https://www.apple.com.cn/cn/shop/goto/buy_iphone/iphone_18_pro' },
    ],
    touts: [
      {
        subheading: '6.9 英寸或 6.3 英寸',
        items: ['超视网膜 XDR 显示屏3', '— 不适用'],
      },
      {
        icon: ASSETS.compare.iconBattery,
        items: ['视频播放最长可达 43 小时11', '— 不适用'],
      },
      {
        icon: ASSETS.compare.iconChip,
        items: ['A20 Pro 芯片 采用 2 纳米制程', '7 核图形处理器 配备神经网络加速器'],
      },
      {
        icon: ASSETS.compare.iconCameraPro,
        items: [
          '4800 万像素 Pro 级融合式摄像头系统',
          '4800 万像素融合式主摄 具备可变光圈',
          '4800 万像素融合式超广角',
          '4800 万像素融合式长焦',
          'ƒ/1.48、ƒ/1.8、ƒ/2.8、ƒ/4.0 可变光圈选项 (融合式主摄)',
        ],
      },
      {
        icon: ASSETS.compare.iconCenterStage,
        items: [
          '1800 万像素 Center Stage 前置摄像头',
          '视频超稳防抖',
          '同步双拍',
          '拍照和视频通话人物居中',
          '— 屏下 FaceTime 摄像头不适用',
        ],
      },
      {
        icon: ASSETS.compare.iconAppleIntelligence,
        items: ['为 Apple 智能预备好12'],
      },
    ],
  },
];

/** 「iPhone Duo 与环境」三个数字。 */
export const ENVIRONMENT = {
  headline: 'iPhone Duo 与环境',
  link: {
    label: '阅读我们的《产品环境报告》(PDF) 了解详情',
    href: 'https://www.apple.com/environment/pdf/products/iphone/iPhone_Duo_PER_Sept2026.pdf',
  },
  stats: [
    { caption: '制造采用的', label: '回收材料重量', value: '占比达 35%。', icon: ASSETS.env.iconRecycling },
    { caption: '生产制造', label: '', value: '采用 60% 可再生电力。', icon: ASSETS.env.iconElectricity },
    { caption: '出货产品包装', label: '', value: '采用 100% 纤维材料。', icon: ASSETS.env.iconPackage },
  ],
} as const;

/** 「我们的价值观」三张卡片。 */
export const VALUES = {
  headline: '我们的价值观，为我们导航。',
  cards: [
    {
      id: 'environment',
      eyebrow: '我们的计划，和我们的产品一样突破创新。',
      body: '我们致力于到 2030 年实现整体碳足迹净零排放的目标。',
      link: { label: '进一步了解环境责任', href: 'https://www.apple.com.cn/environment/' },
      icon: ASSETS.values.iconEnvironment,
    },
    {
      id: 'privacy',
      eyebrow: '力保个人信息安全，这很 Apple。',
      body: '隐私是一项基本人权。我们设计的每一款产品和服务都力求保护你的数据安全。',
      link: { label: '进一步了解隐私安全', href: 'https://www.apple.com.cn/privacy/' },
      icon: ASSETS.values.iconPrivacy,
    },
    {
      id: 'accessibility',
      eyebrow: '种种创新，为无障碍使用而设计。',
      body: '我们的产品和服务为每一个人而设计，众多内置功能可协助你以适合自己的方式，尽情投入喜欢的事。',
      link: { label: '进一步了解无障碍功能', href: 'https://www.apple.com.cn/accessibility/' },
      icon: ASSETS.values.iconAccessibility,
    },
  ],
} as const;
