import { ASSETS } from './assets';

/** 「全系全配」共有功能。 */
export const SHARED_INTRO = {
  eyebrow: '全系全配',
  headline: ['全套必备功能', 'iPhone 全备齐'],
  body:
    '全新 iPhone 系列机型满载创新功能，帮你轻松搞定日常大小事。高速无线局域网、蓝牙 6、5G 功能和 eSIM，' +
    '给你又快又安全的连接体验。还有多项少儿安全功能，让家长倍感安心。',
  media: ASSETS.shared.siriAi,
  mediaAlt: 'iPhone Duo 上的 Apple 智能界面。',
} as const;

/** 「为 Apple 智能预备好」小节。 */
export const APPLE_INTELLIGENCE = {
  eyebrow: '为 Apple 智能预备好',
  body:
    'Apple 智能是深植于 iPhone 中的个人化智能系统，能根据你的个人情境为你在写作、表达自我、处理各种事务上提供协助，' +
    '让一切更简单轻松。',
  note: 'Apple 智能推出时间依监管部门审批情况而定。',
  image: ASSETS.shared.siriAiGeo,
  alt: 'Apple 智能在 iPhone 上的界面示意。',
} as const;

/** 连接功能三张卡片。 */
export interface ConnectivityCard {
  id: string;
  title: string;
  body: string;
  link?: { label: string; href: string };
  image: string;
  alt: string;
}

export const CONNECTIVITY_CARDS: ConnectivityCard[] = [
  {
    id: 'esim',
    title: 'eSIM。',
    body:
      '有了内置 eSIM，连网丝滑顺畅，用起来灵活便利，安全性也更高，不再需要实体 SIM 卡，非常适合旅行使用。' +
      'iPhone Duo 仅可通过 eSIM 激活运营商网络，并需前往运营商线下营业厅进行必要的身份证件核验来激活 eSIM。',
    link: { label: '进一步了解 eSIM', href: 'https://www.apple.com.cn/esim/' },
    image: ASSETS.shared.esim,
    alt: 'eSIM 激活流程示意。',
  },
  {
    id: 'crash-detection',
    title: '车祸检测。',
    body: '硬件传感器结合先进的运动算法，可检测到严重车祸，并主动为你拨打求救电话。',
    image: ASSETS.shared.crashDetection,
    alt: '车祸检测功能示意。',
  },
  {
    id: 'find-my',
    title: '查找 App。',
    body:
      '看看挂着 AirTag 的东西在哪里；以安全可靠的方式与亲友共享你的位置；还能帮你找设备，即使设备离线也没问题。',
    image: ASSETS.shared.findMy,
    alt: '查找 App 界面示意。',
  },
];

export const CONNECTIVITY_HEADLINE = ['各种连接功能，', '贴身的安​​心感。'] as const;
