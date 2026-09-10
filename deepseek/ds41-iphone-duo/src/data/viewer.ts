import { ASSETS } from './assets';

/**
 * 「定睛细看」产品查看器。
 *
 * 参考页面是一个带 7 个控制项的画廊：第 1 项是开合滑块，
 * 其余 6 项是固定姿态。原站用 3D 序列驱动，这里用同一组真实产品图
 * 做分段切换 + 滑块进度驱动，避免把静态图横向拉伸冒充动画。
 */
export interface ViewerState {
  id: string;
  /** 控制项标题 */
  label: string;
  /** 展开后的说明段落标题 */
  bodyTitle: string;
  body: string;
  image: string;
  /** 手机版裁切 */
  imageSmall: string;
  alt: string;
  /** 滑块 0→1 时，本姿态对应的图片在序列中的位置 */
  order: number;
}

export const VIEWER_INTRO = '定睛细看';

export const VIEWER_STATES: ViewerState[] = [
  {
    id: 'foldable',
    label: '可折叠设计',
    bodyTitle: '可折叠设计。',
    body: '美妙的观看体验，精妙的创新设计，放进口袋刚刚好。',
    image: ASSETS.viewer.foldable,
    imageSmall: ASSETS.viewer.foldableSm,
    alt: '动画演示 iPhone Duo 从闭合到展开状态，内屏和外屏的主屏幕画面上显示时间，背景为沙漠景观。',
    order: 0,
  },
  {
    id: 'landscape',
    label: '横屏',
    bodyTitle: '横屏。',
    body:
      '大屏大视野，娱乐体验超沉浸。还能利用“分屏浏览”进行多任务处理，并排打开同一个 app 的两个视图，' +
      '比如一边查看整月行程，一边对照当天安排。',
    image: ASSETS.viewer.landscape,
    imageSmall: ASSETS.viewer.landscapeSm,
    alt: 'iPhone Duo 呈横向展开状态，屏幕左侧显示日历月视图，右侧为当日日程安排。',
    order: 1,
  },
  {
    id: 'portrait',
    label: '竖屏',
    bodyTitle: '竖屏。',
    body: '键盘更宽，打起字来更自如。空间也更大，浏览内容、滚动操作更轻松。视频也可以固定在屏幕上方，方便你一边观看一边使用其他 app。',
    image: ASSETS.viewer.portrait,
    imageSmall: ASSETS.viewer.portraitSm,
    alt: 'iPhone Duo 呈纵向展开状态，内屏显示视频播放画面和信息 app。',
    order: 2,
  },
  {
    id: 'closed',
    label: '闭合',
    bodyTitle: '闭合。',
    body: '身形精巧，握感超好。主要控制项移到侧边，用起来很顺手，还能为你留出更多纵向空间来使用 app。',
    image: ASSETS.viewer.closed,
    imageSmall: ASSETS.viewer.closedSm,
    alt: 'iPhone Duo 呈闭合状态，正面外观，外屏显示 Apple Music 界面。',
    order: 3,
  },
  {
    id: 'laptop',
    label: '坐立',
    bodyTitle: '坐立。',
    body: '将 iPhone Duo 折起平放，无论看片刷剧还是健身跟练，都能轻松调到合适的角度。控制项就在底面屏幕上，操作起来也很方便。',
    image: ASSETS.viewer.laptop,
    imageSmall: ASSETS.viewer.laptopSm,
    alt: 'iPhone Duo 呈半开状态，底部面板平放在表面上，上下两部分屏幕均显示 Safari 浏览器 app。',
    order: 4,
  },
  {
    id: 'tent',
    label: '站立',
    bodyTitle: '站立。',
    body: '进入待机显示模式，可显示床头钟、照片、小组件等。也能随心调个好角度，在外屏上尽情看片追剧。',
    image: ASSETS.viewer.tent,
    imageSmall: ASSETS.viewer.tentSm,
    alt: 'iPhone Duo 以机身边缘为支撑，呈倒 V 形放置，屏幕朝外，呈待机显示模式，展示日历。',
    order: 5,
  },
  {
    id: 'durability',
    label: '耐用性',
    bodyTitle: '耐用性。',
    body:
      '边框和铰链护壳均采用 5 级钛金属打造，内屏具有抗刮划涂层，机身前后由超瓷晶面板守护，还拥有 IP68 级抗水防尘性能。',
    image: ASSETS.viewer.durability,
    imageSmall: ASSETS.viewer.durabilitySm,
    alt: 'iPhone Duo 呈直立状微微打开，形如书本；左侧机身背面展示 Apple 标志和双摄系统，右侧外屏显示人物照片。',
    order: 6,
  },
];

/** 滑块文案与无障碍标签。 */
export const VIEWER_SLIDER = {
  caption: '拖动下方滑块来打开或折起',
  minLabel: 'iPhone Duo，闭合',
  maxLabel: 'iPhone Duo，展开',
  midLabel: 'iPhone Duo，部分折起',
} as const;
