# web：Web 与 H5 客户端

> 当前状态：已安装依赖，lint、路由类型生成、TypeScript 检查与生产构建通过。下列业务目录是后续实现位置；业务功能与浏览器交互尚未验证。

## 当前脚手架与命令

包名为 `@interview-forge/web`。先在仓库根执行统一安装，再从根使用已有脚本：

```sh
pnpm --filter @interview-forge/web run dev
pnpm --filter @interview-forge/web run build
pnpm --filter @interview-forge/web run lint
pnpm --filter @interview-forge/web exec next typegen
pnpm --filter @interview-forge/web exec tsc --noEmit --incremental false
```

开发端口默认 3000。当前还没有 Web 测试脚本。编辑入口为 `src/app/page.tsx`，保留已生成的 Next/Tailwind 配置；涉及当前版本 API 时优先查看已安装 Next 包内的 `dist/docs/` 对应文档，再核对官方资料，不照旧教程覆盖配置。

TypeScript 约束已更新为 `^5.9.3`，实际安装 5.9.3；首次检查类型前先 `next typegen`。`next.config.ts` 使用 `agentRules: false` 保留仓库唯一的根 AGENTS.md。详细结果见 [首次检查](../../docs/runbooks/initial-verification.md)。

## 职责

- 使用 Next.js、React、TypeScript、Tailwind CSS 与 shadcn/ui 实现桌面浏览器和移动网页，处理响应式、键盘操作和加载／空数据／错误状态。
- 提供公开题库、登录后工作台、答题与复习、面试房间、架构实验室、离线中心和 AI 教练入口。
- 通过 TanStack Query 管理远程结果，通过局部 React 状态或 Zustand 管理界面和编辑状态；不重复维护同一份远程数据真相。
- 展示本地已保存、云端已同步、正式提交与报告完成等不同状态。

## 边界

- 核心权限、事务、计时和正式提交由后端决定，不以客户端校验代替。
- 不直接访问数据库、队列或模型供应商，不向客户端发布模型密钥。
- Next.js 的服务端渲染用于 Web 表现；核心业务不得只能通过 Server Actions 调用，后续 App、小程序和桌面端需复用后端接口。
- H5 是同一个 Web 应用的响应式体验。原生 App、小程序和桌面壳尚未选型，不承诺直接复用全部 DOM 组件、Workbox 或浏览器存储。

## 候选目录

| 路径 | 内容 |
| --- | --- |
| `src/app/` | App Router 路由、布局、页面组装及加载／错误入口 |
| `src/features/auth/`、`questions/`、`practice/` | 登录、题库、答题、自评和复习 |
| `src/features/rooms/`、`lab/` | 房间、消息、场景编辑与 Three.js 适配 |
| `src/features/offline/`、`coach/` | 本地草稿、同步与冲突界面、AI 运行展示 |
| `src/components/ui/`、`layout/` | shadcn 基础组件及应用布局 |
| `src/lib/http/`、`query/` | 浏览器 Axios、服务端 fetch、QueryClient 与 hydration |
| `src/workers/` | Web Worker 消息入口；计算实现调用纯 TS 模拟引擎 |
| `src/service-worker/` | Workbox 源码；`public/sw.js` 是后续构建产物 |

## 数据、协议与依赖

- 服务端权威内容分别归 core、studio、reports 和 AI 服务所有。Query 缓存和 IndexedDB 草稿都是客户端副本。
- 请求身份、草稿、缓存与待同步操作按账号／工作空间隔离；退出和切换账号要处理未同步内容，不能在新账号下重放旧操作。
- 普通交互使用 Axios，组合查询使用 GraphQL；房间使用 Socket.IO；AI 流式结果使用 fetch 流读取。不同通道不重复实现相同业务。
- 离线写入携带稳定操作 ID 和基础版本，冲突交给用户比较、合并或另存，不按设备时间静默覆盖。
- 可依赖 `packages/contracts`、`design-tokens`、`simulation-core` 和确有复用需求的客户端包；不导入其他应用的 `src`、ORM 模型或后端 Service。设计令牌统一视觉语言，不承诺所有端共用 CSS 实现。
- Service Worker 默认不缓存私人 API、RSC、登录响应和 AI 流；离线能力通过受控入口与明确下载的业务数据实现。

## 启用顺序与最小验收

1. 与 core-api 一起优先启用：登录 → 选题 → 回答 → 提交 → 查看记录／复习。
2. 先在两个浏览器会话验证同一账号读写、独立设备退出、版本冲突和无权限拒绝。
3. 再加入本地草稿、离线恢复、房间、实验室和 AI；未实现页面不展示虚构运行结果。
4. 第一条业务闭环要覆盖主要加载／失败状态和键盘操作；正式支持离线前，验证账号切换、重试与冲突恢复。

完整范围见 [产品蓝图](../../docs/product-blueprint.md)、[目录指南](../../docs/project-structure.md) 与 [Worker／离线／Agent 设计](../../docs/worker-offline-agent.md)。
