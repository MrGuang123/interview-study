# 安装后的首次检查

所有命令在仓库根执行。当前五个应用均已安装依赖，根 `pnpm-lock.yaml` 已生成；共享包仍只有职责文档。

## 1. 检查安装结果

```sh
pnpm -r list --depth 0
```

应列出五个 `@interview-forge/*` 应用的已安装依赖。安装完成不等于构建、类型和测试通过，继续执行下面的检查。

## 2. 代码、类型与测试

```sh
pnpm -r run lint
pnpm --filter @interview-forge/web exec next typegen
pnpm --filter @interview-forge/web exec tsc --noEmit --incremental false
pnpm --filter '@interview-forge/*' --filter '!@interview-forge/web' -r exec tsc --noEmit --incremental false
pnpm --filter '@interview-forge/*' --filter '!@interview-forge/web' -r run test
pnpm --filter '@interview-forge/*' --filter '!@interview-forge/web' -r run test:e2e
```

每条命令应成功退出。Web 要先 `next typegen` 再检查类型：`LayoutProps` 等路由类型由 Next 生成。测试命令明确选择四个 Nest 应用；Web 还没有测试脚本，不能将它记作测试已通过。

## 3. 生产构建

```sh
pnpm -r run build
```

应为五个应用完成构建；Next 生成 `.next/BUILD_ID`，Nest 生成各自的 `dist/main.js`。Next 默认字体的首次构建需要能访问字体服务；检查必须允许构建工具创建本机临时进程和端口。此前执行环境的权限限制经授权重跑后已通过，没有因此替换字体或编译器。

## 4. 手动访问

终端一启动 Web：

```sh
pnpm --filter @interview-forge/web run dev
```

终端二启动核心后端（macOS/Linux）：

```sh
PORT=3001 pnpm --filter @interview-forge/core-api run start:dev
```

浏览器访问 `http://localhost:3000`，应看到 Next 默认页；访问 `http://localhost:3001`，应得到 `Hello World!`。按 Ctrl+C 停止各终端中的服务。它们目前是两个默认应用，尚未实现前后端业务调用或数据库集成。

## 5. 本次实测结果

核对日期：2026-10-21。本次按应用分别运行检查；上面的聚合命令便于后续从根复核。

| 应用 | Lint | 类型检查 | 生产构建 | 单元测试 | E2E |
| --- | --- | --- | --- | --- | --- |
| web | 通过 | typegen 后通过 | 通过 | 尚无脚本 | 尚无脚本 |
| core-api | 通过 | 通过 | 通过 | 1/1 | 1/1 |
| studio-service | 通过 | 通过 | 通过 | 1/1 | 1/1 |
| report-worker | 通过 | 通过 | 通过 | 1/1 | 1/1 |
| ai-service | 通过 | 通过 | 通过 | 1/1 | 1/1 |

E2E 验证默认 `GET /` 返回 `200` 与 `Hello World!`，没有验证尚未实现的登录、同步等业务；浏览器交互仍待手动检查。

本次修正：Web TypeScript 从 5.0.2 升到 5.9.3，满足 Next 要求并更新根锁文件；`agentRules: false` 避免 Next 生成额外 AGENTS.md；四个后端在 `NODE_ENV=test` 时关闭 Observe，保持测试独立于托管监控。未关联云端账户或调用模型。

首次检查通过后 `.scaffold/` 不再有运行用途，可以清理；后续修改正式应用，不要用临时模板重新覆盖。
