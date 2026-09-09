# agent-llm-case

收集不同大模型与 AI Agent 的实战测试案例，保留提示词、生成代码、运行方式和测试记录，让每一次测试都能查看、运行和复盘。

案例从动画、交互网页和小游戏开始，逐步扩展到工具调用、代码修复与多步骤任务。

## 从这里开始

- [测试提示词](llm_benchmark_prompts.md)：当前整理的 12 道趣味编程题。
- 下方案例索引：查看已有实现，按照各自 README 启动。
- 同一道题可以有多个模型、多个 Agent 和多次运行的版本，分别保留结果。

## 分类目录

按模型系列或产品分类，同一分类下收录不同版本、Agent 和运行轮次的案例。具体模型 ID 和 Agent 名称分别记录在案例 README 中。

```text
agent-llm-case/
├── deepseek/       # DeepSeek 案例，当前包含 6 个 ds41 测试
├── chatgpt/        # ChatGPT 相关案例，待添加
├── glm/            # GLM 案例，待添加
├── unclassified/   # 归属待确认的已有案例
├── llm_benchmark_prompts.md
└── archive/        # 历史提示词
```

分类入口：[DeepSeek](deepseek/README.md) · [ChatGPT](chatgpt/README.md) · [GLM](glm/README.md) · [待分类](unclassified/README.md)。后续可按需添加其他模型或 Agent 分类。

## 已有案例

| 案例 | 目录或入口 | 主要观察点 |
| --- | --- | --- |
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

## 运行方式

各案例独立运行。进入案例目录后，按照它的 README 安装依赖、启动和操作。

例如，从仓库根目录启动 DeepSeek 的赛车案例：

```bash
cd deepseek/ds41-road-rash
npm install
npm run dev
```

[字垂华光](unclassified/hanzi-curtain-museum/README.md)已收进独立子目录。根目录仅用于导航，没有统一的安装或启动命令。

单文件 HTML 与 SVG 案例可先在浏览器中打开；使用 ES Modules 的案例需通过本地 HTTP 服务访问。

## 如何记录一次测试

建议每次测试至少记录以下信息，便于以后对照：

| 字段 | 内容 |
| --- | --- |
| 任务 | 案例名称、原始提示词、预期行为 |
| 模型 | 完整模型 ID、可确认的版本和参数 |
| Agent | 工具名称、版本、可用工具与关键配置；直接调用模型时注明 |
| 环境 | 日期、操作系统、运行时与浏览器版本 |
| 过程 | 首次生成结果、追加提示、修复轮次、人工修改 |
| 结果 | 代码、运行命令、截图或视频、已知问题 |
| 验证 | 实际执行的检查及结果；未测试项明确标注 |
| 成本 | 可获取的耗时、Token 用量和费用；缺失时不估填 |

新增案例先归入对应分类，再使用 `<版本或Agent简称>-<任务名>-<轮次>` 命名子目录，在目录内保留 `README.md`、`PROMPT.md` 和实现代码。相同任务的不同实现通过本页索引关联。

## 如何理解测试结果

模型、Agent、提示词和运行环境都会影响结果。对比时尽量保持任务要求、工具权限和测试条件一致，并记录差异。

“首次生成即可运行”“经过多轮修复后可运行”和“经过人工修改后可运行”应分别记录。构建成功、交互测试通过与视觉效果符合预期，也应分别说明。

现有案例 README 中的验证记录属于各自测试时的记录，不代表整个集合经过统一复测。单个案例的表现不足以推导模型或 Agent 的总体排名。

## 许可证

本项目源码采用 [MIT License](LICENSE)。第三方依赖遵循各自的许可证。
