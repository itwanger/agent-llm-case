import { ASSETS } from './assets';

/** 「可折叠设计」章节：两种配色。 */
export interface DesignColor {
  id: string;
  name: string;
  /** 色板圆点的近似色（用于色板填充，不是对图片做滤镜） */
  swatch: string;
  image: string;
  /** 手机版裁切 */
  imageSmall: string;
  alt: string;
}

export const DESIGN_COLORS: DesignColor[] = [
  {
    id: 'night-sky',
    name: '夜空色',
    swatch: '#4a4a4f',
    image: ASSETS.design.designNightSky,
    imageSmall: ASSETS.design.designNightSkySm,
    alt: '夜空色 iPhone Duo 展开立起，展示内屏与外屏。',
  },
  {
    id: 'star-white',
    name: '星光白色',
    swatch: '#e6e2dc',
    image: ASSETS.design.designStarWhite,
    imageSmall: ASSETS.design.designStarWhiteSm,
    alt: '星光白色 iPhone Duo 展开立起，展示内屏与外屏。',
  },
];

export const DESIGN_COPY = {
  eyebrow: '可折叠设计',
  headline: ['新面孔加入 iPhone，', '全场折服。'],
  body:
    'iPhone Duo 来了，首款可折叠 iPhone 全新揭幕。上手一展开，就是迄今最薄 iPhone，历来最大 iPhone 显示屏直入眼帘，' +
    '比 iPhone 18 Pro Max 足足大了 50%；另一面的外屏，显示面积高达 iPhone 18 Pro 的 90% 以上。' +
    'iOS 也全面重塑，联手带来各种新摆法、新角度，灵动体验花样百出。一切精彩，都纳入坚固精巧的机身中，轻松装进你口袋。' +
    '这个 iPhone，不同于任何 iPhone。',
} as const;
