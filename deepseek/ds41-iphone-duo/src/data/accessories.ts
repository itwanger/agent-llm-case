import { ASSETS } from './assets';

/** 「配件」章节。 */
export const ACCESSORIES_INTRO = {
  eyebrow: '配件',
  headline: ['一贴即合，', '还能妥妥立起。'],
  body:
    'iPhone Duo 保护壳设计轻巧，保护到位，配色时尚好吸睛。' +
    '带支架的 iPhone Duo 双面夹自带可开合的支架，轻松调节各种观看角度，方便又实用。',
  cta: '选购各款 iPhone 配件',
  href: 'https://www.apple.com.cn/cn/shop/goto/iphone/accessories',
} as const;

export interface AccessoryCard {
  id: string;
  image: string;
  alt: string;
  /** 无障碍描述（图片本身是产品组合照） */
  caption: string;
}

export const ACCESSORY_CARDS: AccessoryCard[] = [
  {
    id: 'bumper',
    image: ASSETS.accessories.bumper,
    alt: '多款颜色的 iPhone Duo 保护壳与双面夹配件组合。',
    caption: 'iPhone Duo 保护壳与双面夹',
  },
  {
    id: 'case',
    image: ASSETS.accessories.case,
    alt: 'iPhone Duo 装有多款颜色的保护壳。',
    caption: 'iPhone Duo 保护壳',
  },
];
