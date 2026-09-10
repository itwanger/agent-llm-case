# DeepSeek 测试案例

当前收录 `ds41-*` 系列案例。[本轮提示词](../llm_benchmark_prompts.md)标注的目标模型为 `deepseek-v4.1-flash-expires-on-0910`，使用工具为 DeepSeek Harness；各次运行的具体配置仍需在对应案例中记录。

- [ds41-bicycle-riding-pelican](ds41-bicycle-riding-pelican/README.md)
- [ds41-doodle-fps](ds41-doodle-fps/README.md)
- [ds41-fluid](ds41-fluid/README.md)
- [ds41-iphone-duo](ds41-iphone-duo/README.md)
- [ds41-koi-pond](ds41-koi-pond/README.md)
- [ds41-pelican](ds41-pelican/README.md)
- [ds41-road-rash](ds41-road-rash/README.md)
- [ds41-xiaoer-playroom](ds41-xiaoer-playroom/README.md)

各案例 README 中的 `cd deepseek/...` 命令从仓库根目录执行。

## 一个端口跑全部案例

不想逐个开 dev server，可以用聚合服务：一个端口 + 路径前缀访问所有 case。

```bash
cd deepseek
npm run hub            # 前台运行        → http://127.0.0.1:5180/
npm run hub:bg         # 后台常驻（写 .hub.log / .hub.pid）
npm run hub:status     # 看各 case 状态
npm run hub:stop       # 停掉后台服务
```

打开 <http://127.0.0.1:5180/> 是带截图的案例总览，每个 case 走 `http://127.0.0.1:5180/<目录名>/`，例如：

- <http://127.0.0.1:5180/ds41-doodle-fps/>
- <http://127.0.0.1:5180/ds41-koi-pond/>
- <http://127.0.0.1:5180/ds41-road-rash/>

列表不需要维护：`serve-cases.mjs` 启动时自动扫描本目录下的 `ds41-*`，**新增案例只要建目录、重启服务即可出现在总览页**。

按类型自动分流（零依赖，Node ≥ 18）：

- **vite**（有 `vite.config.*`）：拉起各自 `vite dev --base=/<slug>/`，反向代理转发（含 WebSocket upgrade），**改代码热更新照常生效**；
- **node**（有 `server.mjs`）：拉起各自的 `server.mjs`；
- **static**（只有 `index.html`）：由聚合服务直接托管。

常用参数：

```bash
PORT=6000 node serve-cases.mjs              # 换入口端口
CASE_ROOT=../glm node serve-cases.mjs       # 换目录跑（同样规则，可看其他模型）
NO_SPAWN=1 node serve-cases.mjs             # 只做代理，自己另外开 case 服务
```

健康检查：<http://127.0.0.1:5180/healthz> 返回各 case 的类型/状态/内部端口；某个 case 起不来时，总览页对应卡片会直接显示失败原因。

总览页的缩略图存在 `.previews/<slug>.png`，更新（先启动聚合服务）：

```bash
npm run previews
```
