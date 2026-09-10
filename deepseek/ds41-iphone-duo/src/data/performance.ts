import { ASSETS } from './assets';

/** 「实力全屏全开」章节。 */
export const PERFORMANCE_INTRO = {
  eyebrow: '性能与续航',
  headline: '实力全屏全开',
  body:
    'A20 Pro 芯片采用 2 纳米制程，配备双 16 核神经网络引擎，专为 AI 精心构建，专攻高难重任。' +
    '散热管理系统也更进一步，配备 VC 均热板，让 iPhone Duo 展现 Pro 级的超凡表现，' +
    '无论高强度工作还是高段位游戏，统统得心应手。',
  media: ASSETS.performance.chipHero,
  mediaAlt: 'A20 Pro 芯片结构示意。',
} as const;

/** 与 A19 Pro 的对比数字（章节顶部）。 */
export const PERFORMANCE_BASE_STATS = [
  { caption: '最高', value: '提速 20%', label: '6 核中央处理器', note: '与 A19 Pro 芯片相比' },
  { caption: '最高', value: '提升 50%', label: '内存带宽', note: '与 A19 Pro 芯片相比' },
] as const;

/** 电池小节。 */
export const PERFORMANCE_BATTERY = {
  title: '成双组队飙高能',
  body:
    'iPhone 双电池系统迎来首秀，而 eSIM 设计还省出更多内部空间，得以容纳更大的电池。' +
    'A20 Pro 芯片采用 2 纳米制程，配合 C2 调制解调器，使能效突飞猛进。' +
    'iPhone Duo 只要充满一次电，就能陪你畅用一整天，刷网页或打游戏都尽兴。' +
    '使用有线快充，约 20 分钟就能充到最多 50% 电量。',
  stats: [
    { caption: '最长达', value: '31 小时', label: '使用内屏的视频播放时间' },
    { caption: '最长达', value: '44 小时', label: '使用外屏的视频播放时间' },
  ],
  icon: ASSETS.performance.iconBattery,
} as const;

/** 机型比较选择器。数据逐条核对自参考页面，未自行推算。 */
export interface PerfStat {
  caption: string;
  value: string;
  label: string;
}

export interface PerfModel {
  id: string;
  name: string;
  stats: PerfStat[];
}

const s = (caption: string, value: string, label: string): PerfStat => ({ caption, value, label });

export const PERFORMANCE_MODELS: PerfModel[] = [
  {
    id: 'section-1',
    name: 'iPhone 13',
    stats: [
      s('最高', '提速 80%', '6 核中央处理器'),
      s('最高', '提速至 3.4 倍', '7 核图形处理器'),
      s('最高', '提速至 4.5 倍', '神经网络引擎'),
      s('最长续航', '增加 25 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-2',
    name: 'iPhone 13 Pro',
    stats: [
      s('最高', '提速 80%', '6 核中央处理器'),
      s('最高', '提速至 3 倍', '7 核图形处理器'),
      s('最高', '提速至 4.5 倍', '神经网络引擎'),
      s('最长续航', '增加 22 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-3',
    name: 'iPhone 13 Pro Max',
    stats: [
      s('最高', '提速 80%', '6 核中央处理器'),
      s('最高', '提速至 3 倍', '7 核图形处理器'),
      s('最高', '提速至 4.5 倍', '神经网络引擎'),
      s('最长续航', '增加 16 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-4',
    name: 'iPhone 14',
    stats: [
      s('最高', '提速 80%', '6 核中央处理器'),
      s('最高', '提速至 3 倍', '7 核图形处理器'),
      s('最高', '提速至 4.5 倍', '神经网络引擎'),
      s('最长续航', '增加 24 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-5',
    name: 'iPhone 14 Pro',
    stats: [
      s('最高', '提速 60%', '6 核中央处理器'),
      s('最高', '提速至 2.8 倍', '7 核图形处理器'),
      s('最高', '提速至 4.5 倍', '神经网络引擎'),
      s('最长续航', '增加 21 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-6',
    name: 'iPhone 14 Pro Max',
    stats: [
      s('最高', '提速 60%', '6 核中央处理器'),
      s('最高', '提速至 2.8 倍', '7 核图形处理器'),
      s('最高', '提速至 4.5 倍', '神经网络引擎'),
      s('最长续航', '增加 15 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-7',
    name: 'iPhone 15',
    stats: [
      s('最高', '提速 60%', '6 核中央处理器'),
      s('最高', '提速至 2.8 倍', '7 核图形处理器'),
      s('最高', '提速至 4.5 倍', '神经网络引擎'),
      s('最长续航', '增加 24 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-8',
    name: 'iPhone 15 Pro',
    stats: [
      s('最高', '提速 50%', '6 核中央处理器'),
      s('最高', '提速至 2.1 倍', '7 核图形处理器'),
      s('最高', '提速至 2 倍', '神经网络引擎'),
      s('最长续航', '增加 21 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-9',
    name: 'iPhone 15 Pro Max',
    stats: [
      s('最高', '提速 50%', '6 核中央处理器'),
      s('最高', '提速至 2.1 倍', '7 核图形处理器'),
      s('最高', '提速至 2 倍', '神经网络引擎'),
      s('最长续航', '增加 15 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-10',
    name: 'iPhone 16',
    stats: [
      s('最高', '提速 30%', '6 核中央处理器'),
      s('最高', '提速至 2 倍', '7 核图形处理器'),
      s('最高', '提速至 2 倍', '神经网络引擎'),
      s('最长续航', '增加 22 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-11',
    name: 'iPhone 16 Pro',
    stats: [
      s('最高', '提速 30%', '6 核中央处理器'),
      s('最高', '提速 80%', '7 核图形处理器'),
      s('最高', '提速至 2 倍', '神经网络引擎'),
      s('最长续航', '增加 17 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-12',
    name: 'iPhone 16 Pro Max',
    stats: [
      s('最高', '提速 30%', '6 核中央处理器'),
      s('最高', '提速 80%', '7 核图形处理器'),
      s('最高', '提速至 2 倍', '神经网络引擎'),
      s('最长续航', '增加 11 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-13',
    name: 'iPhone 17',
    stats: [
      s('最高', '提速 20%', '6 核中央处理器'),
      s('最高', '提速 60%', '7 核图形处理器'),
      s('最高', '提速至 2 倍', '神经网络引擎'),
      s('最长续航', '增加 14 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-14',
    name: 'iPhone 17 Pro',
    stats: [
      s('最高', '提速 20%', '6 核中央处理器'),
      s('最高', '提速 40%', '7 核图形处理器'),
      s('最高', '提速至 2 倍', '神经网络引擎'),
      s('最长续航', '增加 13 小时', '使用外屏的视频播放时间'),
    ],
  },
  {
    id: 'section-15',
    name: 'iPhone 17 Pro Max',
    stats: [
      s('最高', '提速 20%', '6 核中央处理器'),
      s('最高', '提速 40%', '7 核图形处理器'),
      s('最高', '提速至 2 倍', '神经网络引擎'),
      s('最长续航', '增加 7 小时', '使用外屏的视频播放时间'),
    ],
  },
];

/** 原站默认选中 iPhone 15 Pro。 */
export const PERFORMANCE_DEFAULT_MODEL = 'section-8';
