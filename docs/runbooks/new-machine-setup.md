# 在另一台电脑继续开发

Git 同步源代码、协作约定和项目文档，不会把这次 Codex 聊天变成另一台电脑的会话。使用 [AGENTS.md](../../AGENTS.md)、[交接说明](../handoff.md) 和 [状态表](../status.md) 恢复项目上下文，无需复制全部聊天。

## 1. 在当前电脑保存并上传

先在仓库根执行：

```sh
git status --short
git diff
```

确认应用代码、根锁文件、配置及项目文档都已保存；逐项审查后，选择应纳入版本控制的文件提交，再推送到你自己的 GitHub 仓库。新建且尚未跟踪的文件也要检查内容，`git diff` 默认不会展示它们。本手册不代表已经执行提交或推送。

需要同步的内容包括根 `AGENTS.md`、`docs/`、各应用源码和配置、`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`。不复制 `node_modules/`、`.next/`、`dist/` 或 `.scaffold/`，也不要将聊天导出、凭据、真实环境变量、数据库转储加入仓库。

## 2. 获取同一份代码

另一台电脑需要 Git 和访问仓库的权限。首次获取时，将下面的 `YOUR_REPOSITORY_URL` 替换成你的仓库地址：

```sh
git clone YOUR_REPOSITORY_URL interview-study
cd interview-study
git status --short
git branch --show-current
```

确认位于你要继续开发的分支。已有本地仓库时先检查工作区；有未提交改动就先保存处理，随后切换到目标分支并执行：

```sh
git pull --ff-only
```

如果提示无法快进，先检查本地与远端提交差异，不要用强制覆盖或重置丢弃改动。

## 3. 安装相同工具与依赖

当前工具基线是 Node `24.19.0`、pnpm `11.22.0`，分别见根 `.node-version` 和 `package.json`；将来以仓库中的实际配置为准。通过你使用的 Node 安装器或版本管理器准备对应 Node，再准备对应 pnpm。若本机尚未安装 pnpm，可以在 Node 可用后执行：

```sh
npm install --global pnpm@11.22.0
node --version
pnpm --version
```

在仓库根安装：

```sh
pnpm install --frozen-lockfile
```

这里复用已提交的依赖清单和锁文件，不重新运行 `create-next-app@latest` 或 Nest 生成器。依赖安装失败时先查具体错误；不要通过删除锁文件或升级全部依赖来绕过。

Git 不会同步本机工具、账号授权、环境凭据或数据库数据，它们需要分别准备。当前项目仍是默认脚手架，尚未集成真实数据库或模型，不必先启动 Docker、创建数据库或申请模型密钥；普通本地检查也不要求先开通 Observe 云端监控。未来接入后，只按无敏感信息的环境示例配置，凭据通过独立的安全方式传递。

## 4. 在新电脑重新验证

按 [首次检查手册](initial-verification.md) 执行代码检查、类型检查、测试和构建。旧电脑的通过记录只能作为参考，不能直接代表新电脑验证通过。

手动启动 Web：

```sh
pnpm --filter @interview-forge/web run dev
```

另开终端启动 core-api。macOS/Linux：

```sh
PORT=3001 pnpm --filter @interview-forge/core-api run start:dev
```

Windows PowerShell：

```powershell
$env:PORT = '3001'
pnpm --filter @interview-forge/core-api run start:dev
```

访问 `http://localhost:3000` 查看 Next 默认页面，访问 `http://localhost:3001` 应得到 `Hello World!`。这只验证脚手架，不能据此认定登录、数据库或前后端业务已连通。

## 5. 给另一台电脑的 Codex 开场提示

在 Codex 中打开这个仓库，创建会话后可以发送：

```text
这是“面试工坊 / Interview Forge”，我从另一台电脑接着开发。
请先读取根 AGENTS.md、docs/handoff.md、docs/status.md，以及当前任务相关的架构决定和应用 README。
核对实际代码、当前 Git 分支、工作区改动与文档是否一致，简要复述已完成内容、尚未实现内容和下一步。
不要重新生成已有架构或覆盖脚手架，也不要把旧电脑的验证记录当成本机已通过。
后续按仓库约定继续；本次要做的任务是：【填写这次具体任务】。
```

文档能保存项目目标、已确认决定、当前状态和后续入口；临时讨论或新的要求仍需在新会话中说明。没有必要上传完整聊天来恢复开发。

## 6. 两台电脑轮换的最简流程

结束开发前：检查改动，更新确实变化的状态/交接信息，提交并推送。

换电脑开始前：检查本机工作区，拉取同一分支的最新提交；依赖清单或锁文件发生变化时，重新执行 `pnpm install --frozen-lockfile`，再运行本次改动需要的检查。

尽量避免两台电脑在尚未同步时同时修改同一分支。发生分歧时先比较并合并，不用强制推送覆盖另一台电脑的成果；日常轮换不强制增加 PR 或多分支流程。
