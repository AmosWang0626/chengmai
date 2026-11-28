# backend · 后端

Javalin 7（内嵌 Jetty 12）+ SQLite + JWT 的轻量 REST 服务，单 jar 交付，无 Spring、无外部数据库。

## 构建与运行

在仓库根目录执行：

```bash
mvn -f backend/pom.xml package    # 测试并构建
mvn -f backend/pom.xml test       # 仅测试
java --enable-native-access=ALL-UNNAMED -jar backend/target/chengmai-backend.jar
```

推荐使用根目录 `../start.sh` 统一构建、启动和管理进程。首次启动自动建表、补齐字段并初始化账号。

## 配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8080` | HTTP 端口 |
| `DATA_DIR` | `data` | 数据目录，相对进程工作目录 |
| `STATIC_DIR` | `frontend/dist` | 前端静态目录；不存在时仅提供 API |
| `CORS_ORIGINS` | 本地开发前端地址 | 跨域来源，多个用逗号分隔 |

## 结构

- `config / db / model`：配置、数据库与数据模型。
- `repository / service`：持久化与业务逻辑。
- `web`：路由、鉴权、CORS、日志、审计与异常处理。
- `src/main/resources/schema.sql`：建表与初始账号。
- `src/test`：基于内存 SQLite 的单元测试。

所有业务接口位于 `/api`，除登录与预检请求外均需 JWT。具体路由与权限见 `web/ApiRouter.java` 和 `web/AuthInterceptor.java`。

安全与部署提醒见根目录 [README.md](../README.md) 和 [SECURITY.md](../SECURITY.md)。
