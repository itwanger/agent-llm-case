<div align="center">

# agent-llm-case

**大模型与 AI Agent 实战测试案例集**

同一道题，不同模型与 Agent，看看谁能把想法做成可运行的作品。

[![MIT License](https://img.shields.io/github/license/itwanger/agent-llm-case)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/itwanger/agent-llm-case?style=flat)](https://github.com/itwanger/agent-llm-case/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/itwanger/agent-llm-case)](https://github.com/itwanger/agent-llm-case/issues)

[浏览案例](#已有案例) · [测试提示词](llm_benchmark_prompts.md) · [快速开始](#快速开始) · [贡献案例](CONTRIBUTING.md) · [交流讨论](https://github.com/itwanger/agent-llm-case/discussions)

</div>

## 这是什么

这是一个由[沉默王二](https://github.com/itwanger)维护的大模型与 AI Agent 测试案例集。每个案例尽量保留原始提示词、生成代码、运行方式、修复过程和验证记录，方便你亲自运行、比较效果，也方便复盘模型与 Agent 的表现。

目前以动画、交互网页和小游戏为主：鹈鹕骑自行车、彩色流体、锦鲤池、暴力摩托、涂鸦 FPS、小二玩具房等。后续计划收录工具调用、代码修复和多步骤任务。

**你可以在这里：**

- 找一道有意思的题，交给自己正在用的模型或 Agent。
- 下载已有代码，实际体验画面、交互和完成度。
- 对照同一道题的不同实现，记录首次生成、追加修复和人工修改的差异。
- 提交自己的案例，包括成功结果、失败样例和未解决的问题。

*A collection of hands-on LLM and AI agent test cases, with prompts, runnable code, and evaluation notes.*

## 案例预览

以下为仓库已有实现的截图，点击可查看对应代码与运行说明。

| 日式锦鲤池 | 彩色流体 |
| --- | --- |
| [![锦鲤池实测截图](deepseek/ds41-koi-pond/shots/01-initial.png)](deepseek/ds41-koi-pond/README.md) | [![彩色流体实测截图](deepseek/ds41-fluid/shots/hero.png)](deepseek/ds41-fluid/README.md) |
| 观察鱼体运动、水面表现和投食互动 | 观察连续流动、混色和实时响应 |

| Apple iPhone Duo 产品页复刻 · 桌面 | Apple iPhone Duo 产品页复刻 · 手机 |
| --- | --- |
| [![iPhone Duo 桌面首屏](deepseek/ds41-iphone-duo/shots/01-hero-desktop.png)](deepseek/ds41-iphone-duo/README.md) | [![iPhone Duo 手机首屏](deepseek/ds41-iphone-duo/shots/09-hero-mobile.png)](deepseek/ds41-iphone-duo/README.md) |
| 真实产品素材、首屏构图、整页 17 章与核心交互（配色切换 / 折叠滑块 / 轮播 / FAQ / 弹层） | 手机端重新组织布局而非等比缩小，机型比较并排两列且不横向溢出 |

> 更多截图（含与参考页面的同位置对照）见 [案例 README](deepseek/ds41-iphone-duo/README.md#效果)；
> 提示词有[完整版](prompts/iphone-duo.md)与[精简版](prompts/iphone-duo-short.md)两版。

## 按分类浏览

| 分类 | 当前内容 | 入口 |
| --- | --- | --- |
| DeepSeek | 7 个 `ds41-*` 案例 | [查看案例](deepseek/README.md) |
| ChatGPT | 分类已建立，案例待添加 | [查看分类](chatgpt/README.md) |
| GLM | 分类已建立，案例待添加 | [查看分类](glm/README.md) |
| 待分类 | 历史作品，模型或 Agent 来源未确认 | [查看案例](unclassified/README.md) |

根目录按模型系列或产品分类。具体模型 ID、版本和使用的 Agent 分别记录在案例中；例如，通过 Agent 调用 DeepSeek 的测试仍可放在 `deepseek/` 下。

```text
agent-llm-case/
├── deepseek/                 # DeepSeek 案例
├── chatgpt/                  # ChatGPT 相关案例
├── glm/                      # GLM 案例
├── unclassified/             # 来源待确认的历史案例
├── templates/                # 案例记录模板
├── llm_benchmark_prompts.md   # 12 道趣味编程测试题
├── archive/                  # 历史提示词备份
├── CONTRIBUTING.md           # 贡献指南
└── LICENSE
```

## 已有案例

| 案例 | 目录或入口 | 主要观察点 |
| --- | --- | --- |
| iPhone Duo 产品页复刻 | [ds41-iphone-duo](deepseek/ds41-iphone-duo/README.md) | 真实素材本地化、首屏构图、整页 17 章节、配色 / 姿态 / 滑块 / 轮播 / FAQ / 弹层交互 |
| 草稿纸涂鸦 FPS | [ds41-doodle-fps](deepseek/ds41-doodle-fps/README.md) | 画风一致性、射击反馈、敌人行为 |
| 暴力摩托 | [ds41-road-rash](deepseek/ds41-road-rash/README.md) · [RoadRash](unclassified/RoadRash/README.md) | 驾驶、格斗、碰撞、完整比赛 |
| 日式锦鲤池 | [ds41-koi-pond](deepseek/ds41-koi-pond/README.md) | 水面、鱼体运动、投食互动 |
| 彩色流体 | [ds41-fluid](deepseek/ds41-fluid/README.md) | 流体表现、交互响应、稳定性 |
| 小二玩具房 | [ds41-xiaoer-playroom](deepseek/ds41-xiaoer-playroom/README.md) · [xiaoer-playroom](unclassified/xiaoer-playroom/README.md) | 角色、动作、自主行为 |
| 鹈鹕骑自行车 | [ds41-pelican](deepseek/ds41-pelican/README.md) | 肢体结构、动作协调 |
| 鹈鹕 SVG 迭代 | [初版](unclassified/pelican-bicycle/pelican-bicycle.svg) · [v2](unclassified/pelican-bicycle/pelican-bicycle-v2.svg) · [v3](unclassified/pelican-bicycle/pelican-bicycle-v3.svg) | 静态绘制与版本差异 |
| 千里江山 | [qianli-jiangshan.html](unclassified/qianli-jiangshan.html) | 网页视觉呈现 |
| 字垂华光 · 中国器物数字展 | [hanzi-curtain-museum](unclassified/hanzi-curtain-museum/README.md) | 汉字交互与展览体验 |

目录名称沿用测试时的命名。具体模型版本、Agent 配置和运行轮次，应以对应测试记录为准；未记录的信息保留为“待补充”。

## 快速开始

### 体验已有案例

克隆仓库后，进入你感兴趣的案例目录。各案例独立运行，根目录没有统一的安装或启动命令。

以 DeepSeek 的暴力摩托案例为例，准备好 Git、Node.js 22.12+ 和 npm，然后执行：

```bash
git clone https://github.com/itwanger/agent-llm-case.git
cd agent-llm-case/deepseek/ds41-road-rash
npm ci
npm run dev
```

打开终端显示的地址；该案例默认使用 `http://127.0.0.1:5183/`。操作按键见[案例说明](deepseek/ds41-road-rash/README.md)。

其他案例的环境要求、安装和运行命令以各自 README 为准。单文件 HTML 与 SVG 案例可在浏览器中打开；使用 ES Modules 的案例需要通过本地 HTTP 服务访问。

### 用自己的模型再跑一次

1. 从[测试提示词](llm_benchmark_prompts.md)中选择一道题。
2. 新建会话和输出目录，将提示词里的目标目录替换成你的案例路径。
3. 保存首次生成结果，再记录追加提示、修复轮次与人工修改。
4. 实际运行并检查交互，用[案例记录模板](templates/case-readme.md)整理结果。

现有提示词含 `deepseek/ds41-*` 输出路径。重复测试时务必使用新目录，避免覆盖已有实现或让 Agent 读取上一次的成品。

## 如何理解测试结果

模型、Agent、提示词、工具权限和运行环境都会影响结果。比较时尽量保持条件一致，并注明差异。

| 需要区分的内容 | 记录方式 |
| --- | --- |
| 模型与 Agent | 分别填写模型 ID 和 Agent 名称、版本、配置 |
| 首次结果与修复结果 | 保留首次表现，注明追加提示次数及人工修改 |
| 构建与体验 | 分别记录构建、交互、视觉检查的结果 |
| 已验证与未验证 | 只填写实际执行的检查，缺失信息写“未记录”或“未测试” |
| 耗时与费用 | 有原始记录时填写，不估填缺失数据 |

现有案例 README 中的验证记录属于各自测试时的记录，不代表整个集合经过统一复测。单次案例不能代表模型或 Agent 的整体能力；本仓库目前不提供统一评分或排名。

## 一起补充案例

欢迎提交新模型、新 Agent、同题不同实现、复现记录和失败案例。

- **提交代码或文档**：阅读[贡献指南](CONTRIBUTING.md)，按[模板](templates/case-readme.md)整理后发起 PR。
- **报告问题或提议案例**：前往 [Issues](https://github.com/itwanger/agent-llm-case/issues/new/choose)。
- **交流选题与测试心得**：前往 [Discussions](https://github.com/itwanger/agent-llm-case/discussions)。

如果这个项目对你有帮助，欢迎 Star，也欢迎把自己的测试结果带回来。

## 许可证

本项目源码采用 [MIT License](LICENSE)。第三方依赖遵循各自的许可证。
