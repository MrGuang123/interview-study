# Nginx：统一入口

状态：未创建代理配置、证书或域名部署。

负责 HTTP 路由、后期 TLS、请求限制，以及 Socket.IO Upgrade、流式响应缓冲和超时配置。实际路径和端口随应用接口确定后集中记录；优先为 Web 使用同源 API 入口，并正确处理服务端请求身份。

不在代理层放业务规则，不把网关鉴权当作业务服务对象权限校验的替代。独立 Nest API gateway/BFF 尚未定案，不能因为有此目录就额外创建全局总控服务。

接入时验证真实登录/Cookie、HTTP 错误、AI 流逐步到达、Socket 重连和请求大小限制。多副本 Socket.IO 保留 polling 时验证会话亲和；只用 WebSocket 时记录取舍。
