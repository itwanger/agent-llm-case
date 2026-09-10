import { ASSETS } from './assets';

/**
 * 「先刷重点」横向画廊。
 *
 * 参考页面这里是逐张全宽卡片（1260×612，圆角 28px）的横向滚动画廊，
 * 卡片上方是 28px 的说明句，下方是产品画面。
 */
export interface HighlightCard {
  id: string;
  /** 截图上方的小标签，对应原站卡片导航 */
  label: string;
  /** 卡片顶部说明句（原站为两行） */
  caption: string[];
  image: string;
  alt: string;
}

export const HIGHLIGHTS: HighlightCard[] = [
  {
    id: 'display',
    label: '显示屏',
    caption: ['迄今最大 iPhone 显示屏，', '既有纤薄一面，又能折叠多变。'],
    image: ASSETS.highlights.display,
    alt: 'iPhone Duo 横向展开，内屏显示主屏幕。',
  },
  {
    id: 'ios',
    label: 'iOS',
    caption: ['iPhone 叠加更多妙用，', 'iOS 也重塑新体验。'],
    image: ASSETS.highlights.ios,
    alt: 'iPhone Duo 内外屏分别显示不同 app，展示 iOS 的多任务能力。',
  },
  {
    id: 'titanium',
    label: '钛金属边框',
    caption: ['边框和铰链护壳均由钛金属打造，', '高颜值与坚固度缺一不可。'],
    image: ASSETS.highlights.titanium,
    alt: 'iPhone Duo 侧面特写，展示钛金属边框与铰链结构。',
  },
  {
    id: 'camera',
    label: '4800 万像素融合式双摄系统',
    caption: ['4800 万像素融合式双摄系统就位，', '拍摄新招上手，前后都上镜。'],
    image: ASSETS.highlights.camera,
    alt: 'iPhone Duo 背面特写，展示双摄系统。',
  },
  {
    id: 'chip',
    label: 'A20 Pro 芯片',
    caption: ['A20 Pro 采用 2 纳米制程，', '配合蒸发冷却技术，释放 Pro 级性能表现。'],
    image: ASSETS.highlights.chip,
    alt: 'A20 Pro 芯片与机身内部结构示意。',
  },
  {
    id: 'battery',
    label: '电池',
    caption: ['双电池系统，', '源源电力全天挺你。'],
    image: ASSETS.highlights.battery,
    alt: 'iPhone Duo 双电池系统示意。',
  },
];

/** 「观看影片」弹层里的产品影片（原站公开 mp4）。 */
export const HIGHLIGHTS_FILM = {
  src: 'https://www.apple.com.cn/105/media/cn/iphone-duo/2026/9305e4b9-72d9-4c05-9381-b572adadd5e5/films/product/iphone-duo-product-tpl-cn-2026_960x540.mp4',
  poster: ASSETS.hero.heroEnd,
  title: 'iPhone Duo 影片',
} as const;
