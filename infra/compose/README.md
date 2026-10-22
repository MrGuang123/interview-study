# Compose：依赖与应用编排

状态（2026-10-22）：用户已手写开发配置，PostgreSQL 容器已启动且健康；真实 SQL 连接、写入和容器重建后的数据保留尚未验证。

当前按 [PostgreSQL 手写学习第一课](../../docs/lesson-01-postgresql.md) 由用户逐文件编写与运行。现有配置为 [compose.dev.yaml](compose.dev.yaml)，环境示例为 [.env.example](.env.example)；真实本地 `.env` 不提交或打印。

第一步只启用 PostgreSQL 与命名卷、健康检查、开发凭据示例及明确的主机端口。只读检查确认 Docker context 为 `desktop-linux`，项目为 `interview-forge-dev`，服务 `postgres` 使用 `postgres:18.6-alpine`，状态为 running/healthy，端口为 `127.0.0.1:5432 → 5432/tcp`，挂载一个命名卷。该记录来自当前电脑，换电脑需重新验证。

下一小步是手写 SQL 探针，验证连接、写入与容器重建后数据保留。尚未接入 Prisma，未验证备份恢复或应用业务。随后按阶段加入 Redis、MongoDB 和已能独立构建的应用；观测组件按需求启用。

后续配置应说明环境变量、启动命令、就绪判定、网络、卷、服务账号和关闭行为。数据库共用实例时仍分配独立数据库/schema 与角色。浏览器地址、容器内部地址和 Next 服务端地址不能混用。

验收按应用就绪和真实连接结果执行，不只检查容器状态。删除卷、重建数据库、初始化数据必须有明确说明；卷不等于备份，数据恢复走独立脚本与运行手册。
