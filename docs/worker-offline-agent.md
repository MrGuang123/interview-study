# 浏览器 Worker、离线体验与 AI Agent 扩展

> 状态：五个应用已安装并通过脚手架级检查；尚未接入真实模型、浏览器后台或离线同步。本文延续 product-blueprint.md 的数据归属和权限边界。
> 搭建顺序见 [bootstrap-guide.md](./bootstrap-guide.md)，多端与渐进启用的已确认约束见 [基础边界决策](./decisions/0001-foundation-boundaries.md)。

## 1. 四种执行单元的区别

| 单元 | 在哪里运行 | 本项目负责什么 | 生命周期与边界 |
| --- | --- | --- | --- |
| Dedicated Web Worker | 浏览器的独立执行线程 | 模拟计算、图布局、题包解析、差异比较 | 不直接操作 DOM；页面关闭后不能依赖它持续执行 |
| Service Worker | 浏览器管理的事件驱动执行环境 | 明确允许的网络请求、缓存、离线入口、更新与可选同步 | 非常驻；浏览器可终止；需安全上下文，开发 localhost 通常可用 |
| 后端 BullMQ Worker | 自己部署的服务进程 | 报告、导出、提醒、AI 长任务执行 | 受队列、幂等、进程部署和资源预算管理 |
| AI Agent | 后端受控运行时与模型调用循环 | 依据目标选择工具，读取上下文，形成建议或待确认操作 | 不是线程或后台保证；需要明确工具、状态、停止条件和权限 |

Workbox 是 Google / Chrome 团队提供的 Service Worker 库与构建工具集合，不是第五种 Worker。AI Agent 不运行在 Service Worker 中，真实模型密钥也不交给浏览器。

## 2. Web Worker：实验室计算引擎

### 业务需求

- 架构节点较多时计算图布局，页面仍可拖动、输入和选取。
- 模拟请求、缓存、队列与 Worker 行为，按批次返回统计和回放事件。
- 解析用户选择的大题包、构建离线搜索索引、比较回答版本。

先把计算放入 Dedicated Worker，Three.js 渲染保留在主线程。OffscreenCanvas / 渲染 Worker 作为单独性能实验，实施前检查浏览器能力，不作为第一版前置条件。

### 协议与实现要点

输入：taskId、type、inputVersion、payload；输出：taskId、inputVersion、progress/result/error。取消有独立消息，长计算分块并检查取消；必要时 terminate 后重新创建，不能假设忙于同步计算的 Worker 会立即处理取消消息。

- 主线程丢弃旧版本结果，防止新图被旧布局覆盖。
- 大型 TypedArray 使用可转移 ArrayBuffer，理解转移后原缓冲区不可继续使用。
- React 组件创建/清理 Worker 时避免重复实例；导航离开、终止、失败与重新启动有明确定义。
- Worker 消息做运行时校验，不传递 DOM、函数或 Three.js 实例。
- 模拟引擎使用确定性种子，同一输入可重放；模型数值与实际服务器指标分别标记。
- 不假定多线程一定更快；测量消息复制、启动开销和任务粒度。

### 验收

同一机器、同一输入比较主线程版本和 Worker 版本：记录长任务、输入响应、计算耗时与内存。计算中改参数、取消或离开页面，结果不串版本、没有残留 Worker，也不会悄悄继续消耗资源。

## 3. Service Worker / Workbox：离线练习

### 用户流程

在线选择题包 → 显示下载内容和版本 → 存入本地 → 断网打开专用离线练习界面 → 作答并保存 → 联网后重新确认身份 → 同步 → 显示成功或冲突。

界面提供下载管理、空间占用、删除本地副本、导出草稿与待同步中心。安装 PWA 提供独立入口；PWA 不等同于完整原生应用，也不保证首次访问就可离线。

这里的 Workbox / IndexedDB 是 Web/H5 适配，不是全部客户端共同的运行时。App、小程序和桌面端共享服务端同步契约，按选定框架实现存储、网络和凭据适配；第一阶段不提前生成这些客户端。

### 离线范围与协同编辑是两个维度

- 第一版是个人内容的多端同步、本地草稿恢复和版本冲突提示；同一个人在两台设备上编辑，也可能产生冲突。
- 更完整的离线能力指扩大可离线完成的业务，例如创建笔记、分类和删除；不代表云端 AI 或正式提交无需服务器确认，也不天然包含自动合并。
- 多人实时编辑指几个人共同修改同一份回答、笔记或场景；实时聊天和在线状态本身不要求 CRDT。
- 可先做在线协同，也可先扩大单人离线范围，不要求按固定线性顺序实施。多人离线后自动合并是两种能力的组合。
- 后续采用 CRDT 时，主要局部改造编辑器绑定、存储和同步模块；账号、权限及正式提交仍保留。结构化 JSON 便于迁移，但不等于已经实现协同。
- 内容类型有稳定资源/节点 ID、format/schema 版本，编辑器与持久模型分开；不提前制造通用协同引擎。确定采用协同的内容可先做小型原型验证。

### 缓存与存储职责

| 数据 | 位置与策略 |
| --- | --- |
| 有内容哈希的静态资源 | Workbox 精确 precache / CacheFirst，控制版本、数量和容量 |
| 离线入口及必要资源 | 预缓存明确的离线壳，受控匹配导航，不把全部 Next 页面当离线壳 |
| 可公开且允许过期的目录元数据 | 按端点选择 StaleWhileRevalidate，设置 TTL 与上限 |
| 主动下载的题包 | IndexedDB，保存题目版本、账号/工作空间归属、下载时间和内容 schemaVersion |
| 本地回答草稿与待同步操作 | IndexedDB，按账号隔离、记录版本、顺序与幂等键 |
| 登录、私人 API、GraphQL、RSC、AI 流、房间通信 | 默认绕过 SW 缓存，另通过显式业务数据实现离线能力 |

Cache Storage 是 HTTP 响应缓存，IndexedDB 是结构化业务数据存储。Cache API 不会自动遵守所有 HTTP 缓存头，必须写明确路由，不能只依赖服务端的 private/no-store。

Next HTML 与 RSC 响应存在变体；不要用宽泛的 CacheFirst 拦截 App Router 请求。先采用受控离线页面与显式题包，测试嵌套路由、刷新、登录态和构建更新。

Workbox 采用自定义 Service Worker 配合 InjectManifest 的路线。先核对 Next 构建方式与输出路径，再用独立构建步骤生成清单，避免假设某个 webpack 插件适用于所有构建配置。

### 同步协议

每项操作至少有 operationId、accountId、workspaceId、resourceId、baseVersion、kind、payload、createdAt。客户端状态为 pending/syncing/synced/conflict/failed。

operationId 用于重试去重，baseVersion 用于检测并发修改，内容 format/schemaVersion 用于格式演进；它们不互相替代。客户端声明的 accountId 只用于本地隔离，服务端 actor 始终来自可信会话。每设备独立 DeviceSession，使定向退出和多端连续使用可验证。

1. 前台联网检查并验证当前身份，旧账号操作不能在新账号会话下自动重放。
2. 请求带幂等键和 baseVersion；服务端重新校验用户、权限、题目版本和业务状态。
3. 响应丢失后可安全重试；幂等键绑定用户和请求摘要。
4. 同一资源操作按顺序处理；删除、完成、编辑冲突有明确规则。
5. 版本冲突展示差异，供用户保留、合并或另存；不能一律用客户端时间戳覆盖服务端。
6. 401 先暂停并重新登录，403 停止并展示权限变化，409 进入冲突处理；5xx 按策略退避，不能无限重试。

答案“本地已保存”“已同步草稿”“已正式提交”“报告完成”分别显示，不把排队当作已经完成业务提交。

第一阶段可用变更通知加重新拉取恢复在线状态；P 阶段按数据量和离线范围增加增量游标、删除标记与游标失效后的完整恢复。不使用设备时间戳作为全局顺序，也不假设多个数据库共享统一事务游标。

内容模型升级时定义旧草稿导入、另存或比较流程。启用协同状态后，禁止旧客户端用整份旧内容直接覆盖；按协议版本限制写入、引导更新并保留待恢复草稿。迁移和旧客户端兼容是实际成本，不能承诺无破坏升级。

### Background Sync 的边界

可靠基线是用户回到页面、网络恢复并通过身份检查后由前台恢复同步。Workbox Background Sync 仅用于适合安全重放的请求，并作为能力检测后的增强。

- 原生 Background Sync 的浏览器支持和触发时机有限，不能承诺关页后或某个固定时间一定执行。
- 无原生支持时，Workbox 会在 Service Worker 启动时尝试重放；这不等于常驻后台。
- Workbox 默认在网络失败时入队；收到 4xx/5xx HTTP 响应不自动都算网络异常，需明确策略。
- 对带用户权限与冲突处理的写操作，优先使用本项目可检查的 IndexedDB 业务队列，不无差别重放全部 POST。

### 多账号、更新与存储

- 按账号隔离题包和草稿。退出时清理对应缓存、队列和可见状态，明确提示尚未同步内容并提供导出。
- 本地隔离不等于加密保险箱；避免缓存不必要的私人聊天、密钥或完整 AI 上下文。
- 浏览器存储可能被驱逐或手工清除；处理 QuotaExceededError，显示同步状态，不保证永久保存。
- Service Worker 更新提示用户先保存再更新，维护旧清单与数据库升级兼容；不无条件 skipWaiting 强制打断答题。
- 离线时无法验证服务器最新的权限撤销；只开放用户主动下载的受限内容，恢复联网后重新校验。需要即时撤销的敏感内容不提供离线副本。

### 验收

预下载后断网刷新可练习；首次访问未下载时有明确提示；A 账号退出再进 B 账号不能见到 A 的数据；多标签页重复同步不重复提交；会话过期、冲突、存储不足、缓存清理、构建更新均有可解释行为。

补充双设备验收：两会话基于同一版本编辑不会静默覆盖；退出其中一台不影响其他会话；旧客户端携旧离线草稿返回时可恢复但不能覆盖新模型。框架、内容格式或协议升级后重复验证。

## 4. AI：学习教练与工具 Agent

### 产品功能

| 场景 | 交互 | 可学习能力 |
| --- | --- | --- |
| 回答复盘 | 按评价维度指出缺漏，引用学习材料与回答片段 | 模型调用、结构化输出、流式状态与错误处理 |
| 模拟面试 | 根据当前回答动态追问，逐步检查边界条件 | 会话、多轮上下文、阶段状态与上下文压缩 |
| 知识检索 | 优先检索用户有权限的题库与笔记，返回可打开的来源版本 | RAG、分块、元数据过滤、检索评测与引用 |
| 计划教练 | 读取进度 → 找薄弱项 → 生成计划草案 → 预览确认 → 写入 | Agent 循环、工具调用、权限、确认与恢复 |
| 架构评审 | 读取场景 JSON，按已知规则检查，再提出取舍与实验 | 确定性检查与模型建议的分工、工具结果和证据 |

从一个 Agent、多个工具与少量明确状态开始。不同练习角色先作为指令与流程模式；真正存在并行任务、独立上下文和效果证据时，再实验多 Agent。

### Agent 工具

| 工具 | 行为与权限 |
| --- | --- |
| search_materials | 只检索当前身份允许的题目、资料与笔记，返回来源 ID 和版本 |
| get_my_progress | 读取当前用户的统计，身份来自服务端上下文，不接受模型自选其他 userId |
| read_attempt | 通过 core-api 检查对象权限后读取指定回答与版本 |
| read_scene | 通过 studio-service 校验权限，读取场景领域 JSON，不传 Three.js 对象 |
| simulate_design | 运行受限参数的确定性教学模型，记录模型版本；不执行任意系统命令 |
| propose_study_plan | 生成结构化草案，包含变更原因、差异与 expectedVersion |
| apply_study_plan | 用户在产品确认具体草案后执行；校验确认范围、过期时间、权限、版本与幂等 |

Prompt 负责行为指导，服务端代码执行权限和业务约束。工具参数、输出均校验；文档中的指令按资料处理，不能改变系统权限或诱导额外工具授权。

### 已确定的架构与技术路径

- 起步为独立边界的 Nest AI 模块，成熟后拆成 ai-service；客户端不直连模型供应商，不保存真实供应商密钥。
- 学习阶段先用 NestJS + 模型 SDK 手写一个小型 Agent 循环；正式功能采用 NestJS + Mastra。模型供应商和具体模型尚未锁定，OpenAI Agents SDK 不作为当前项目的编排选型。
- 正式集成通过 Nest 自定义 Provider 创建 Mastra，注入业务客户端、配置、存储和观测依赖；由 Nest Controller / Service 调用。默认同一进程、同一 Docker 镜像，无需另外启动 Mastra HTTP 服务或增加第五个微服务。
- 检索先复用 core-api 的全文搜索；语义召回有具体价值后再实验 PostgreSQL pgvector，不先增设独立向量数据库。
- 如果采用向量索引，保留租户/权限元数据、内容版本与删除状态；检索、引用展示和工具读取均复核权限，缓存亦按身份隔离。
- 会话记录、显式用户偏好和知识索引分别管理；长期偏好可查看、编辑和删除，避免把全部聊天永久当记忆。
- ai-service 使用独立 PostgreSQL ai database/schema 保存会话、AgentRun、ToolExecution、PlanProposal 和用量；业务写入仍通过所属服务接口。
- 长任务放 AI 专用队列，不能依赖浏览器、SSE 连接或 Service Worker 持续存活。

### 两步学习路线

**G0 原理验证：** 用 Nest Service 调模型 SDK，提供少量只读工具，实现“模型请求工具 → 校验执行 → 回传结果 → 继续或结束”。设置最大步骤、超时和用量限制，模拟工具失败，画出一次执行记录。这个练习保持最小范围，不扩展成长期维护的第二套正式运行时。

**G1—G3 正式功能：** 使用 Mastra 接管 Agent 编排，在相同的业务工具契约上实现生成与流式、授权 RAG、Memory、Workflow、确认后继续和评测。将 G0 的正常、失败与越权样例迁入正式回归集，说明框架承担了哪些工作、应用仍负责哪些约束。

### NestJS 与 Mastra 的职责

| 部分 | 本项目的职责 |
| --- | --- |
| Nest Controller / Guard / Pipe | 对外请求、可信身份、输入验证、接口权限、限流与流式响应适配 |
| Nest AI Service | 预算、运行状态、取消、确认记录、业务客户端和队列接入 |
| Mastra Agent / Tools | Agent 指令、模型与工具循环、结构化输出、上下文和工具执行摘要 |
| Mastra Memory / Workflow | 经授权的会话存储、明确步骤、等待确认和恢复流程；配置与持久化另行验证 |
| core-api / studio-service | 权威业务规则、对象权限、版本检查、事务与业务幂等 |
| BullMQ 与 AI 后台执行进程 | 排队、并发、调度与交付重试，执行同一业务运行 |

以上是本项目选择的分工，不是框架功能限制。Mastra 是 ai-service 内部的运行库；多个 Agent、Workflow 或后台进程不自动意味着多个业务微服务。

建议内部边界如下（目录为规划，尚未创建实现）：

```text
ai-service（第四个业务微服务）
├─ api / guards                 Nest 接口与认证
├─ application                  运行、预算、取消与确认
├─ mastra.provider              创建并注入 Mastra
├─ agents / tools / workflows   学习教练、面试与架构评审
├─ clients                      core-api / studio-service 授权客户端
├─ persistence                  AI 自有数据与运行时存储适配
└─ jobs                         BullMQ 调度与后台执行入口
```

### 请求隔离与工具授权

- Mastra 实例可通过 Nest Provider 复用，用户身份、工作空间、threadId、runId 和预算按请求/运行传入；不要修改共享 Agent 的可变状态来切换用户。
- Memory 的会话和资源标识由服务端绑定账号与工作空间，不能相信浏览器或模型任意传入的 threadId/resourceId；恢复运行也重新校验当前权限。
- 工具使用服务端可信上下文与受限业务客户端；core-api / studio-service 继续校验对象归属。工具包装为框架 API 后，业务授权不可省略。
- 正式接口由 Nest 管理。开发期 Studio 限于受控环境；若以后启用 Mastra 自带 HTTP 路由，单独配置鉴权，不假设它自动经过 Nest Controller 的 Guard。
- 依赖注入工厂、模块格式、Node 版本、构建和关闭清理需要集成验证；不直接将独立 Mastra 项目的配置覆盖到整个 Nest 仓库。

### BullMQ 与 Workflow 的执行边界

AgentRun 是业务运行的统一标识，保存 queueJobId、workflowRunId、会话、幂等键、预算和当前状态。Mastra 运行时存储由 ai-service 管理；避免应用与框架分别写两份互不协调的会话真相。

1. BullMQ 负责交付与 Worker 调度；确定的阶段、确认等待和继续执行由 Workflow 表达。简单交互不强制套 Workflow。
2. 同一 AgentRun 不同时由多个消费者推进，用唯一约束及必要的执行租约防止并发；进程退出后租约可恢复。
3. 进程失败后的重投先读取已保存状态，继续同一 workflowRunId，不默认从头创建新流程。持久化配置与恢复方法按锁定的 Mastra 版本实现并演练。
4. 模型/网络暂时失败可在步骤内做有限重试；进程交付失败由队列重试；权限、参数、用户拒绝等业务失败不自动重试。设置统一总预算，避免多层重试相乘。
5. 写工具使用稳定的业务幂等键和请求摘要，独立于队列 attempt 编号；等待用户确认时释放 Worker，并在确认后投递恢复任务，而非占住一个进程等待。
6. Workflow 保存了步骤状态，并不自动保证外部副作用只发生一次；用“写入成功但进程在保存步骤结果前退出”的故障验证工具幂等与对账。

### 流式、可靠性和用量

交互输出可用 POST + fetch 流读取，消费 SSE 等事件协议。普通请求继续 Axios + Query；协作继续 Socket.IO，各通道用途明确。

AgentRun：queued/running/waiting_confirmation/completed/failed/cancelled。事件包含 runId、seq、type；按需要保存可恢复的结果与状态，断线后查询，不把“连接关闭”当作模型执行已停止。

- 支持用户取消、超时、最大步骤、最大工具调用、输出长度与用量预算；取消后对实际执行和计费结果按供应商能力核实。
- 对模型限流和暂时失败采用有上限的退避；具有副作用的工具必须幂等，恢复运行不能重复改计划。
- 记录 promptVersion、model、检索来源版本、工具摘要、耗时、用量和 traceId；面向用户展示执行摘要，不索取或存储隐藏思维链。
- 私人回答只发送必要片段；模型请求、追踪导出、会话保存有明确数据范围与保留策略。
- 结构符合 JSON schema 不代表事实正确。评价采用 rubric、证据与来源，保留人工纠正，无法找到资料时明确说明。
- 没有模型或预算耗尽时，普通答题、自评、复习和面试房仍可用。

### Agent 评测

建立小型固定数据集，包含：正常复盘、资料不足、越权读取、资料内恶意指令、工具超时、用户拒绝草案、重复执行、会话恢复和预算耗尽。

评测检索相关性、引用正确性、工具选择、参数正确性、权限拒绝、计划变更准确性、任务完成率、延迟和用量。对关键权限与副作用用确定性断言，内容质量采用 rubric 和人工抽查，不只问模型“自己答得好不好”。

更改 prompt、模型、工具或索引策略后重跑；失败样例进入回归集。SDK trace 帮助定位行为，但不代替测试。

## 5. 新页面与阶段

- 工作台新增 AI 教练入口；答题页提供“提示”“追问”“复盘”，尽量先让用户独立作答。
- 离线中心展示下载包与同步状态；第一版离线范围仅含个人已下载内容和草稿，不承诺离线协同。AI 当前只设计在线模型 Agent。
- 实验室新增计算进度、取消与 Worker 失败重启。
- 运行中心新增离线同步失败、缓存版本、AgentRun、用量、模型与 prompt 版本、工具失败和评测记录。

实施顺序：A 加入本地草稿；C 实现计算 Web Worker；个人闭环与同步接口稳定后开展 P 离线阶段；AI 先做 G0 Nest + 模型 SDK 小型循环，再做 G1 Nest + Mastra 基础与流式、G2 授权 RAG、G3 Agent / Workflow、可靠性与评测。P 与 G 相互独立，不以其他所有功能做完为前提。

AI 阶段额外验收：两个用户并发运行不串上下文；工具访问经业务服务拒绝越权；已确认的计划在队列重投或 Workflow 恢复后不重复写入；等待确认后进程重启仍能按权限恢复；不因引入 Mastra 增加额外公开入口或业务微服务。

## 6. 官方参考

- [MDN：Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [MDN：Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Workbox](https://developer.chrome.com/docs/workbox/)、[策略](https://developer.chrome.com/docs/workbox/modules/workbox-strategies)、[Background Sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync)
- [MDN：Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)、[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Next.js：生产与自托管](https://nextjs.org/docs/app/guides/self-hosting)
- [Nest：自定义 Provider](https://docs.nestjs.com/fundamentals/custom-providers)
- [Mastra：Agents](https://mastra.ai/docs/agents/overview)、[Workflows](https://mastra.ai/docs/workflows/overview)、[Server](https://mastra.ai/docs/server/overview)

这些文档支持能力与限制的判断；具体产品范围、服务分工与验收标准是本项目的设计选择。实施时锁定依赖和浏览器目标，复核兼容性。
