# backend · 后端项目

Javalin 7（内嵌 Jetty 12）+ SQLite + JWT 的轻量 REST 服务，单 jar 交付，无 Spring、无外部数据库。

```bash
mvn package        # 构建 + 37 项 JUnit（内存 SQLite）
mvn test           # 仅测试
# 运行（在仓库根目录执行，或显式指定 DATA_DIR / STATIC_DIR）
java --enable-native-access=ALL-UNNAMED -jar target/chengmai-backend.jar
```

环境变量：`PORT`（默认 8080）、`DATA_DIR`（默认 `data`）、`STATIC_DIR`（默认 `frontend/dist`，目录存在则同进程托管前端）。

分层：`config / db / model / repository / service / web(controller) / util`，装配在 `Main.java`；
横切：`CorsHandler`（跨域）、`AuthInterceptor`（JWT + 权限矩阵）、`ErrorMapper`（统一 `{error}`）。

安全：DAO 列白名单、bcrypt 密码、HS256 JWT（7 天）、密钥文件 0600、上传扩展名白名单 + 20MB/45MB 限制。

**重建 jar 后必须重启进程**（运行中 JVM 持有被覆盖 jar 会导致懒加载类 ClassNotFoundException）。

完整架构与 API 契约见仓库根 [README.md](../README.md)。