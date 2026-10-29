# 0002：core-api 使用无扩展名导入与 CommonJS 输出

初版日期：2026-10-25。更新：2026-10-28。状态：CommonJS 输出与无扩展名相对导入已接受；具体配置按用户完成并提交的 03A 同步，不将历史 NodeNext 方案误当成当前文件。

## 当前决定与实际配置

- 仅调整 `apps/core-api`，保留独立 Nest CLI standard-mode 项目和现有依赖版本。
- 源码继续使用 TypeScript `import` / `export`，相对导入省略扩展名，例如 `./app.service`。
- 用户在 03A 中改为 TypeScript 显式 `module: commonjs`，应用 package.json 不声明 type，tsconfig 不声明 moduleResolution 或 resolvePackageJsonExports；当前产物仍为 CommonJS。
- 实际安装 TypeScript 6.0.3 的有效默认解析为 Bundler；这描述编译器的解析策略，没有增加打包器。03B 沿用此现状，不顺带改回 NodeNext，也不将此配置自动复制到其他应用。
- Prisma 使用 `prisma-client`、`moduleFormat: cjs`、`generatedFileExtension: ts`、`importFileExtension: ""`，由 Nest 构建到 `dist/`。
- 入口使用 `void bootstrap()`；Prisma CLI 配置通过 `__dirname` 定位迁移环境文件。
- Vitest 的配置文件使用 `.mts` 保持 ESM 工具配置；应用运行产物仍是 CommonJS。

## 原因与取舍

用户习惯省略导入扩展名。CommonJS 输出可以沿用现有 Nest 编译与运行链路，不需要额外打包器或运行时模块解析补丁。

原生 ESM 运行方式要求明确的相对路径扩展名；先前的 `.ts` 导入加自动改写方案仍需在源码写扩展名，不满足本次要求。ESM 配合打包器也能实现无扩展名源码导入，但当前阶段没有其他打包需求，因此不额外引入。

初版使用 `type: commonjs` 加 `module/moduleResolution: nodenext`，目的是按现代 Node 规则检查依赖与输出。2026-10-27 用户希望保留熟悉的 CommonJS 配置，随后将显式 `module: commonjs` 与无 package type 的形式提交到 03A；2026-10-28 按实际代码和完成反馈更新本记录。NodeNext 仍是可选的 Node 模块检查路线，但不是使用 import/export 或无扩展名相对导入的唯一条件。

TypeScript 大版本会改变默认解析规则，不能仅凭配置外观推断与旧项目完全相同。当前 TS 6 的 CommonJS/Bundler 组合已通过教程临时副本检查；Node 直接运行产物时，对新依赖的 exports 条件和加载方式仍按实际链路验证，不将类型检查通过等同于所有包的运行兼容。

## 边界与验证

- 其他三个 Nest 应用保持 ESM；Web 和 AI/Mastra 的模块选型不随本次变更。
- 新增依赖时仍须核对它的模块导出和运行时兼容性；含顶层 await 的 ESM 依赖不能直接通过同步 require 加载。
- 按实际变化运行 Prisma 校验/生成、lint、类型检查、单测、HTTP E2E、构建与需要的运行检查。03B 临时副本已通过 lint、类型、构建、1 个单测和 12 个 HTTP E2E，Node 可直接 require 编译后的 AppModule 和请求上下文模块；数据库采用替身，未重跑真实启动和停库恢复。
- 上述脚手架验证不等于数据库连接、权限、业务模型或生产部署验收。实际结果记录在 [状态表](../status.md)，教学步骤见 [02B](../lesson-02b-prisma-connection.md)。

参考：[TypeScript Node 模块模式](https://www.typescriptlang.org/docs/handbook/modules/reference.html#node16-node18-node20-nodenext)、[TypeScript 6 的 CommonJS/Bundler 支持](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html#combining---moduleresolution-bundler-with---module-commonjs)、[Prisma 生成器](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators)。
