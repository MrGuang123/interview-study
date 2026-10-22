# 运行配置

状态：当前只有目录职责，尚无 Docker Compose、Nginx 或观测服务配置，也没有容器运行结果。

| 目录 | 职责 |
| --- | --- |
| [compose](compose/README.md) | 本地依赖与后期服务编排 |
| [nginx](nginx/README.md) | 入口代理、TLS、实时与流式转发 |
| [observability](observability/README.md) | 日志、指标、追踪和错误关联 |

应用自己的 Dockerfile 在对应应用有可验证构建后创建。此目录管理组合运行，不存放业务代码、真实密钥、数据库数据文件或备份。只启动当前阶段需要的依赖，不为完整目录一次性引入全部运行组件。
