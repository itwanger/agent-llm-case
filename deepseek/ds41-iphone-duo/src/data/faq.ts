/**
 * 常见问题。
 *
 * 问题与答案全部取自参考页面 FAQ 折叠面板的 DOM 文本，
 * 仅规整了原站为排版插入的中文间空格，未增删内容。
 */

export interface FaqItem {
  id: string;
  question: string;
  answer: string[];
}

export const FAQ_INTRO = '有问，就有答。';

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    question: "iPhone Duo 与 iPhone 18 Pro、iPhone 18 Pro Max 有何不同？",
    answer: ["iPhone Duo 与 iPhone 18 Pro、iPhone 18 Pro Max 都是 Apple 旗舰智能手机，搭载同款 A20 Pro 芯片。 iPhone Duo 是首款可折叠 iPhone，一展开便是迄今最大 iPhone 显示屏，比 iPhone 18 Pro Max 足足大了 50%。它联手全面重塑的 iOS 带来各种新摆法、新角度，让你可以将 app 并排摆、联排看，放开双手畅聊 FaceTime 通话，观看角度也灵活可调。这样一来，多任务处理更轻松，手机上的娱乐体验也更沉浸。"],
  },
  {
    id: 'faq-2',
    question: "iPhone Duo 与 iPhone 18 Pro、iPhone 18 Pro Max 在摄像头方面有何不同？",
    answer: ["iPhone Duo 配备 4800 万像素融合式双摄系统，其中包含 4800 万像素融合式超广角和 4800 万像素融合式主摄，以及 1200 万像素 Center Stage 前置摄像头，还拥有一个支持 1080p 视频的屏下 FaceTime 摄像头。iPhone Duo 是唯一一款具有独特、特定相机功能的 iPhone，包括智能拍摄功能，可自动拍照，无需手动掌镜；Duo 双屏预览功能，可在外屏上实时预览拍摄画面；以及“看看镜头”功能，通过外屏上的趣味动画吸引孩子看镜头。 iPhone 18 Pro 和 iPhone 18 Pro Max 则拥有实力满级的 Pro 级拍摄系统。配备全新 4800 万像素融合式主摄，首次为 iPhone 带来可变光圈，拍低光照片和视频更亮眼，景深效果更惊艳。此外， iPhone 18 Pro 和 iPhone 18 Pro Max 还拥有 4800 万像素融合式超广角摄像头和 4800 万像素融合式长焦摄像头，支持最高 8 倍光学品质变焦。"],
  },
  {
    id: 'faq-3',
    question: "iPhone Duo 具备多大的光学变焦能力？",
    answer: ["iPhone Duo 拥有 4800 万像素融合式双摄系统，最高支持 2 倍光学品质变焦。你可以在拍摄时选择 0.5 倍、1 倍和 2 倍变焦。得益于高分辨率传感器，变焦放大时画面细节依然清晰锐利，还有宽大的取景屏幕，助你拍出精彩大片。"],
  },
  {
    id: 'faq-4',
    question: "我可以在哪里购买 iPhone Duo？",
    answer: ["iPhone Duo 于 2026 年 10 月 23 日发售，可于 apple.com.cn 以及指定运营商和合作伙伴商户进行购买。你也可前往任意一家 Apple Store 零售店选购。如需预约 Specialist 专家的店内或在线协助选购服务，请访问 apple.com.cn/shop/browse/overlay/iphone/ specialist 。你还可通过 Apple Trade In 换购计划，用符合条件的设备换购新 iPhone Duo，享受折抵优惠。须遵守条款。合作伙伴的实际供应情况可能有所不同。"],
  },
  {
    id: 'faq-5',
    question: "iPhone Duo 与其他可折叠手机有何不同？",
    answer: ["iPhone Duo 以可折叠设计带来备受喜爱的 iPhone 体验，联手全面重塑的 iOS 27 实现各种新摆法、新角度。从多任务处理、享受内容到投入喜爱的 app 和游戏，为你解锁种种全新可能。它设计考究，用料精良，再结合突破性的软硬件技术，共同成就了 Apple 独有的精彩体验。"],
  },
  {
    id: 'faq-6',
    question: "从其他智能手机换成 iPhone Duo 方便吗？",
    answer: ["如果你决定换成 iPhone Duo，通过“转移到 iOS”这款 app，简单几步就能将照片、联系人、信息和日历从其他智能手机安全地转移过来。前往 apple.com.cn/iphone/switch 看看换过来有多轻松，并进一步了解 Apple 生态系统，包括 iMessage 信息、FaceTime 通话和 iCloud。"],
  },
  {
    id: 'faq-7',
    question: "iPhone Duo 是翻盖手机还是可折叠手机？",
    answer: ["iPhone Duo 是一款可折叠 iPhone。配备 7.6 英寸内屏 3 ，观影追剧超沉浸，还能将 app 并排铺开，多任务处理更轻松。闭合状态下，5.4 英寸外屏大小适宜，让 iPhone Duo 放进口袋刚刚好，单手操作也便捷。对喜欢翻盖手机的用户来说，同样是理想选择。画面显示比例内外屏保持一致，这样无论是展开还是闭合，精彩内容都能满满当当尽数呈现在屏幕上。"],
  },
  {
    id: 'faq-8',
    question: "iPhone Duo 是一款耐用的可折叠手机吗？",
    answer: ["是的，iPhone Duo 坚固耐用。它的边框和铰链护壳均采用 5 级钛金属打造；铰链结构经过精心设计，开合阻力顺滑均衡，长久可靠耐用；抗水防尘性能达到 IP68 级别 2 ；机身正面和背面均配备超瓷晶面板，内屏还覆有抗刮划涂层。"],
  },
  {
    id: 'faq-9',
    question: "iPhone Duo 的显示屏品质如何？",
    answer: ["iPhone Duo 拥有卓越的超视网膜 XDR 内屏，采用特制的纳米纹理工艺，可减少眩光和反光，带来出色的观看体验。还有广视角 OLED，从不同角度看都呈现出色的视觉效果。内屏和外屏均具有最高可达 3000 尼特的峰值亮度，ProMotion 自适应刷新率最高达 120Hz。如此丝滑连贯的观感，让你尽情享受娱乐内容，即使在耀眼阳光下也没问题。"],
  },
  {
    id: 'faq-10',
    question: "iPhone Duo 的内屏在弯折处是否会有折痕？",
    answer: ["iPhone Duo 的内屏非常平整光滑，并采用特制的纳米纹理工艺，可减少眩光和反光，带来连贯流畅的观看体验。光学透明粘胶可让显示屏各层在屏幕折叠时顺畅地相对滑动，从而尽可能将应力和折痕减到最轻。"],
  },
  {
    id: 'faq-11',
    question: "iPhone Duo 有哪些存储容量可选？",
    answer: ["iPhone Duo 提供 256GB、512GB、1TB 和 2TB 四种存储容量，你可以根据自己的需求选择合适的容量。"],
  },
  {
    id: 'faq-12',
    question: "iPhone Duo 支持 MagSafe 和无线充电吗？",
    answer: ["当然。iPhone Duo 支持 MagSafe 无线充电，并且有线充电速度非常快 5 ，约 20 分钟最多可充至 50% 电量。前往 apple.com.cn/shop/iphone/accessories 可选购充电配件。"],
  },
  {
    id: 'faq-13',
    question: "iPhone Duo 的电池续航如何？",
    answer: ["iPhone Duo 的电池续航满足全天使用 1 。这是首次在 iPhone 上采用双电池架构，它可智能地为系统供电。此外，eSIM 设计能省出更多内部空间 4 ，得以容纳更大的电池。使用内屏时的视频播放时间最长可达 31 小时 6 ，还支持快速有线充电，约 20 分钟最多可充至 50% 电量 5 。"],
  },
  {
    id: 'faq-14',
    question: "iPhone Duo 能否使用实体 SIM 卡，还是仅支持 eSIM？",
    answer: ["iPhone Duo 在全球范围内仅支持使用 eSIM。借助 eSIM 4 ，你可以快速激活运营商网络服务。支持同时激活两个 eSIM 并轻松切换。"],
  },
  {
    id: 'faq-15',
    question: "iPhone Duo 支持 Apple Pencil 或触控笔吗？",
    answer: ["是的。iPhone Duo 可搭配 Apple Pencil (USB-C) 使用。此功能将于今年稍晚推出。"],
  },
  {
    id: 'faq-16',
    question: "iPhone Duo 配备触控 ID 还是面容 ID？",
    answer: ["iPhone Duo 采用整合于侧边按钮中的触控 ID。这样无论 iPhone Duo 是闭合还是展开，你都能用这种简单、安全、一致的方式进行安全验证。"],
  },
];
