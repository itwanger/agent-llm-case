export type Artifact = {
  id: string;
  name: string;
  era: string;
  image: string;
  alt: string;
  shortDescription: string;
  culturalNote: string;
  textPool: string;
  palette: readonly [string, string, string, string];
  curtainWidth: number;
  imageScale: number;
};

export const artifacts: Artifact[] = [
  {
    id: "yunlei-zun",
    name: "云雷尊",
    era: "青铜意象 · 数字复原",
    image: "/artifacts/yunlei-zun.png",
    alt: "带双耳和云雷纹饰的青铜尊示意图",
    shortDescription: "以沉静铜绿承接礼制的回声，器腹纹样在幽暗中若隐若现。",
    culturalNote: "器以藏礼，字以记忆。拨开垂落的文字，让被时间收拢的声响重新流动。",
    textPool: "礼器云雷山川日月金石钟鼎华夏九州风雅玄鸟岁时祭祀文明绵延生生不息",
    palette: ["#9cc7b1", "#72a892", "#b9d5c2", "#557f73"],
    curtainWidth: 0.76,
    imageScale: 1,
  },
  {
    id: "tianqing-ping",
    name: "天青瓶",
    era: "瓷器意象 · 数字复原",
    image: "/artifacts/tianqing-ping.png",
    alt: "天青釉色长颈瓷瓶示意图",
    shortDescription: "雨过天青，釉色把一瞬天光封存在温润器表之上。",
    culturalNote: "一抹青色并非静止的颜色，而是火、土与人的耐心共同留下的时间。",
    textPool: "雨过天青云破处清风入怀如玉温润窑火泥土匠心流光素影春水无声",
    palette: ["#a9d1d2", "#79b3ba", "#c9e2dc", "#668f9b"],
    curtainWidth: 0.68,
    imageScale: 0.94,
  },
  {
    id: "guyu-feihuang",
    name: "谷玉飞璜",
    era: "玉器意象 · 数字复原",
    image: "/artifacts/guyu-feihuang.png",
    alt: "带谷纹和双首造型的玉璜示意图",
    shortDescription: "半环如虹，谷纹密布；玉石的光泽在克制中显露生机。",
    culturalNote: "古人以玉比德，也以玉连接天地。弧线之间，留下秩序与想象的尺度。",
    textPool: "君子比德于玉仁义智勇洁天地四方谷纹生长温良坚韧含章可贞长乐未央",
    palette: ["#c5c69a", "#9fa87a", "#d8d3ac", "#7f8b68"],
    curtainWidth: 0.84,
    imageScale: 1.05,
  },
];
