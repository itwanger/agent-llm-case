import { ASSETS } from './assets';

/** 「灵活多用」章节顶部。 */
export const VERSATILITY_INTRO = {
  eyebrow: '灵活多用',
  headline: ['iOS 重塑新体验', '摆出面面新可能'],
  body:
    '可灵活摆放的设计，配合重新构想的 iOS 27，iPhone 体验的全新维度就此展开。' +
    '无论是内外屏间切换，还是调转屏幕角度，处处丝滑流畅。一个外屏，再加宽大内屏，事事都能轻松搞定。' +
    '将 iPhone Duo 摆个好角度，大片好剧看个痛快。立着放，不用手拿照样拍视频打电话。随你转个方向翻个面，各种妙用全解锁。',
  media: ASSETS.versatility.heroStand,
  mediaAlt: 'iPhone Duo 折起站立在桌面上，外屏显示内容。',
} as const;

/** 「擅长拗造型」横向画廊里的三张卡片。 */
export interface VersatilityCard {
  id: string;
  title: string;
  body: string;
  note?: string;
  image: string;
  imageSmall: string;
  alt: string;
}

export const VERSATILITY_CARDS: VersatilityCard[] = [
  {
    id: 'standby',
    title: '待机显示。',
    body:
      '随时随地进入待机显示，即使不在充电也没问题。iPhone Duo 可以秒变床头钟或相框，' +
      '也可以轻松显示天气、日历或各种你喜欢的小组件。',
    image: ASSETS.versatility.apps,
    imageSmall: ASSETS.versatility.appsSm,
    alt: 'iPhone Duo 以倒 V 形立在床头柜上，外屏显示待机显示界面。',
  },
  {
    id: 'flexible-viewing',
    title: '观点灵活看法多。',
    body: '有了双屏系统，多种玩法随你定。比如调个好角度，在外屏上尽情看片追剧。',
    note: '《生命树》可通过 App Store 中的爱奇艺 app 观看，相关内容可能需要订阅或单独付费。',
    image: ASSETS.versatility.flexibleViewing,
    imageSmall: ASSETS.versatility.flexibleViewingSm,
    alt: 'iPhone Duo 折起平放，外屏播放影片。',
  },
  {
    id: 'facetime',
    title: 'FaceTime 通话，放开双手轻松聊。',
    body: 'iPhone Duo 能折起来立住，让你不用手拿，畅聊 FaceTime 通话。',
    image: ASSETS.versatility.facetime,
    imageSmall: ASSETS.versatility.facetimeSm,
    alt: 'iPhone Duo 折起站立，正在 FaceTime 通话。',
  },
];

export const VERSATILITY_HEADLINE = ['擅长拗造型，', '想怎么用都行。'] as const;
