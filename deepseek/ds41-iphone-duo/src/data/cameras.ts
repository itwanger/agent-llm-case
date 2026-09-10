import { ASSETS } from './assets';

/** 「先进的拍摄系统」章节。 */
export const CAMERAS_INTRO = {
  eyebrow: '先进的拍摄系统',
  headline: ['这一波新拍法，', '举双手比心。'],
  body:
    'iPhone Duo 带来一系列妙趣新功能，为这个备受喜爱的拍摄系统叠加更多亮点。' +
    '有了“Duo 双屏预览”和“看看镜头”功能，大朋友小朋友都能美美出片；' +
    '借助“Duo FaceTime 双屏通话”，周围一圈人都能加进来一起聊；' +
    '利用“智能拍摄”，不再需要谁来掌镜，大家开心齐入镜。' +
    '当然，拍摄惊艳的 4800 万像素照片和 4K 120 fps 视频，也是拿手好戏。',
  leftImage: ASSETS.camera.heroLeft,
  leftImageSmall: ASSETS.camera.heroLeftSm,
  leftAlt:
    '星光白色 iPhone Duo 呈微微展开状态，外屏展示相机 app，以及 Center Stage 前置摄像头，内屏展示照片 app 图库。',
  rightImage: ASSETS.camera.heroRight,
  rightImageSmall: ASSETS.camera.heroRightSm,
  rightAlt:
    '星光白色 iPhone Duo 呈微微展开状态，背面外观，展示机身左上角 4800 万像素融合式后置双摄系统的两个镜头、麦克风和闪光灯。',
} as const;

/** 四组相机硬件参数。 */
export interface CameraStat {
  value: string | null;
  unit: string | null;
  label: string;
}

export const CAMERA_STATS: CameraStat[] = [
  { value: '4800 万', unit: '像素', label: '融合式超广角摄像头' },
  { value: '4800 万', unit: '像素', label: '融合式主摄' },
  { value: '1200 万', unit: '像素', label: 'Center Stage 前置摄像头' },
  { value: null, unit: null, label: '屏下 FaceTime 摄像头' },
];

/** 功能切换（原站为胶囊 tab + 淡入淡出画廊）。 */
export interface CameraFeature {
  id: string;
  tab: string;
  title: string;
  body: string;
  image: string;
  alt: string;
}

export const CAMERA_FEATURES: CameraFeature[] = [
  {
    id: 'smart-take',
    tab: '智能拍摄',
    title: '智能拍摄。',
    body: '当 iPhone Duo 检测到全员都已准备好，就会自动拍下照片。从从容容入镜，不必再和倒计时赛跑。',
    image: ASSETS.camera.smartTake,
    alt: 'iPhone Duo 立起放置，使用智能拍摄功能自动合影。',
  },
  {
    id: 'duo-preview',
    tab: 'Duo 双屏预览',
    title: 'Duo 双屏预览。',
    body: '镜头里的主角能在外屏上实时看到画面预览，找到自己满意的姿势和构图。',
    image: ASSETS.camera.duoPreview,
    alt: '被摄者通过 iPhone Duo 外屏实时看到取景画面。',
  },
  {
    id: 'kid-cue',
    tab: '看看镜头',
    title: '看看镜头。',
    body: '拍照时很难抓住小朋友的目光？这个好办。外屏上可播放生动有趣的动画，自然地吸引他们看向镜头。',
    image: ASSETS.camera.kidCue,
    alt: 'iPhone Duo 外屏播放趣味动画，吸引小朋友看向镜头。',
  },
  {
    id: 'duo-facetime',
    tab: 'Duo FaceTime 双屏通话',
    title: 'Duo FaceTime 双屏通话。',
    body: '借助外屏，面前的好友也能露露脸，加入大家一起聊。不用再挤在同一边，也不用手机来回递。',
    image: ASSETS.camera.duoFacetime,
    alt: '一群人围绕 iPhone Duo，通过双屏进行 FaceTime 通话。',
  },
];

/** 「一设好，一连串惊艳」——九宫格功能画廊。 */
export interface CameraGalleryItem {
  id: string;
  title: string;
  body: string;
  image: string;
  alt: string;
}

export const CAMERA_GALLERY: CameraGalleryItem[] = [
  {
    id: 'photographic-styles',
    title: '摄影风格 3。',
    body: '除了色调和颜色，现在你还能自定画面的质感和颗粒感，柔化皮肤细节或营造艺术感十足的胶片风格，同时真实展现原片风貌。',
    image: ASSETS.camera.photographicStyles,
    alt: '使用不同摄影风格的同一张人像照片对比。',
  },
  {
    id: 'photonic',
    title: '高画质表现。',
    body: '融合式主摄在整个成像过程中，全程以 4800 万像素进行处理，确保照片有出色的分辨率和丰富的细节。',
    image: ASSETS.camera.photonic,
    alt: '4800 万像素照片的细节放大示意。',
  },
  {
    id: 'low-light',
    title: '低光视频。',
    body: '使用默认的 1080p 设置，低光条件下也能拍出亮眼视频。',
    image: ASSETS.camera.lowLight,
    alt: '夜间街景的低光视频画面。',
  },
  {
    id: 'cinematic',
    title: '电影效果模式。',
    body: '添加景深效果，让画面主角清晰锐利，同时为前后景创造充满美感的虚化效果。甚至在视频拍完后，也能添加和调整特效。',
    image: ASSETS.camera.cinematic,
    alt: '电影效果模式下的人物特写，背景虚化。',
  },
  {
    id: 'timelapse',
    title: '4K 延时摄影。',
    body: '支持 4K 分辨率杜比视界 HDR 拍摄，画面细节更丰富。',
    image: ASSETS.camera.timelapse,
    alt: '4K 延时摄影拍摄的城市天空画面。',
  },
  {
    id: 'smart-focus',
    title: '智能追踪对焦。',
    body: '设备端智能技术能帮助锁定拍摄主体，当其在画面中移动时始终保持清晰对焦，即使出画后再入画也没问题。',
    image: ASSETS.camera.smartFocus,
    alt: '运动中的人物始终处于清晰对焦状态。',
  },
  {
    id: 'zoom',
    title: '2 倍光学品质变焦。',
    body: '延伸取景构图范围，细节依然清晰生动。',
    image: ASSETS.camera.zoom,
    alt: '2 倍光学品质变焦下的取景画面。',
  },
  {
    id: 'center-stage',
    title: '人物居中。',
    body: '自拍构图更灵活，不用转动 iPhone，就能从纵向转为横向，还会自动扩大视野，让更多人入镜。',
    image: ASSETS.camera.centerStage,
    alt: '使用人物居中功能的自拍画面。',
  },
  {
    id: 'customizable',
    title: '自定义控制项。',
    body: '白平衡、对焦等手动控制选项，都能快速取用。',
    image: ASSETS.camera.customizable,
    alt: '相机 app 中可自定义的控制项界面。',
  },
];
