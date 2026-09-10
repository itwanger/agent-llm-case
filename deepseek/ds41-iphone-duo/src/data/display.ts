import { ASSETS } from './assets';

/** 「宽阔大屏」章节。 */
export const DISPLAY_COPY = {
  eyebrow: '宽阔大屏',
  headline: '眼界豁然开朗',
  body:
    'iPhone Duo 彻底刷新 iPhone 的观看体验，满屏沉浸一眼入迷。7.6 英寸超视网膜 XDR 显示屏，' +
    '画面显示比例内外屏保持一致。内屏由 10 个超薄层组成，还采用特制的纳米纹理表层，可减少眩光。' +
    '屏下 FaceTime 摄像头无痕隐身，需要时才会现身。方方面面的巧思，成就了一体平整的屏幕表面，' +
    '视觉体验连贯流畅。无论观影、追剧、玩游戏，这个 iPhone 都绝赞。',
  media: ASSETS.display.immersive,
  mediaAlt: 'iPhone Duo 展开状态下播放影片，展示 7.6 英寸内屏的沉浸观感。',
  caption: '影片《生命树》可通过 App Store 中的爱奇艺 app 观看，相关内容可能需要订阅或单独付费。',
} as const;

/** 左栏的两条技术说明。 */
export const DISPLAY_FEATURES = [
  { title: '纳米纹理表层', body: '让内屏减少眩光' },
  { title: '广视角 OLED 技术', body: '让各个角度观看都出色' },
] as const;

/** 右栏关键数字。 */
export const DISPLAY_STAT = {
  value: '3000 尼特',
  label: '峰值亮度',
} as const;

/** 底部浅灰圆角区块里的两组数字。 */
export const DISPLAY_FOOTNOTES = [
  {
    caption: '相比 iPhone 18 Pro Max',
    value: '屏幕增大 50%',
  },
  {
    caption: '超视网膜 XDR 显示屏',
    value: '7.6 英寸',
  },
] as const;
