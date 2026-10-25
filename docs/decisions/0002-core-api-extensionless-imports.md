# 0002：core-api 使用无扩展名导入与 CommonJS 输出

日期：2026-10-25。状态：已接受；用户明确要求源码导入省略扩展名。

## 决定

- 仅调整 `apps/core-api`，保留独立 Nest CLI standard-mode 项目和现有依赖版本。
- 源码继续使用 TypeScript `import` / `export`，相对导入省略扩展名，例如 `./app.service`。
- 应用 `package.json` 声明 `type: commonjs`；TypeScript 保留 `module` / `moduleResolution: nodenext`，按包声明输出 CommonJS。
- Prisma 使用 `prisma-client`、`moduleFormat: cjs`、`generatedFileExtension: ts`、`importFileExtension: ""`，由 Nest 构建到 `dist/`。
- 入口使用 `void bootstrap()`；Prisma CLI 配置通过 `__dirname` 定位迁移环境文件。
- Vitest 的配置文件使用 `.mts` 保持 ESM 工具配置；应用运行产物仍是 CommonJS。

## 原因与取舍

用户习惯省略导入扩展名。CommonJS 输出可以沿用现有 Nest 编译与运行链路，不需要额外打包器或运行时模块解析补丁。

原生 ESM 运行方式要求明确的相对路径扩展名；先前的 `.ts` 导入加自动改写方案仍需在源码写扩展名，不满足本次要求。ESM 配合打包器也能实现无扩展名源码导入，但当前阶段没有其他打包需求，因此不额外引入。

NodeNext 同时支持 ESM 与 CommonJS，此处由应用的包声明确定输出格式；不使用旧的 `node10` 解析模式，也不将 `bundler` 解析配置单独用于未经打包的 Node 产物。

## 边界与验证

- 其他三个 Nest 应用保持 ESM；Web 和 AI/Mastra 的模块选型不随本次变更。
- 新增依赖时仍须核对它的模块导出和运行时兼容性；含顶层 await 的 ESM 依赖不能直接通过同步 require 加载。
- 运行实际 Prisma 校验/生成、lint、类型检查、默认单测、E2E、构建、开发启动与构建产物启动，并检查生成客户端能被 CommonJS 加载。
- 上述脚手架验证不等于数据库连接、权限、业务模型或生产部署验收。实际结果记录在 [状态表](../status.md)，教学步骤见 [02B](../lesson-02b-prisma-connection.md)。

参考：[TypeScript Node 模块模式](https://www.typescriptlang.org/docs/handbook/modules/reference.html#node16-node18-node20-nodenext)、[Prisma 生成器](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators)。
